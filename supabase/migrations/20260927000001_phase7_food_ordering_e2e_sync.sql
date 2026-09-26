-- ============================================================
-- STAYHUB PHASE 7: FOOD ORDERING & KDS END-TO-END SYNCHRONIZATION
-- ============================================================

-- 1. Add Idempotency Key to restaurant_orders
ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS idx_restaurant_orders_idempotency
ON public.restaurant_orders(idempotency_key)
WHERE idempotency_key IS NOT NULL;

-- 2. Trigger Function: Sync Kitchen Ticket Status to Restaurant Order
CREATE OR REPLACE FUNCTION public.fn_sync_kitchen_ticket_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only synchronize if status actually changed
    IF NEW.status IS DISTINCT FROM OLD.status THEN
        IF NEW.status = 'IN_PROGRESS' THEN
            UPDATE public.restaurant_orders
            SET status = 'PREPARING',
                updated_at = now()
            WHERE id = NEW.restaurant_order_id
              AND status IN ('OPEN', 'CONFIRMED');

        ELSIF NEW.status = 'READY' THEN
            UPDATE public.restaurant_orders
            SET status = 'READY',
                updated_at = now()
            WHERE id = NEW.restaurant_order_id
              AND status IN ('CONFIRMED', 'PREPARING');

        ELSIF NEW.status = 'COMPLETED' THEN
            UPDATE public.restaurant_orders
            SET status = CASE WHEN order_type = 'DINE_IN' THEN 'SERVED' ELSE 'COMPLETED' END,
                completed_at = COALESCE(completed_at, now()),
                updated_at = now()
            WHERE id = NEW.restaurant_order_id
              AND status NOT IN ('COMPLETED', 'SERVED', 'CANCELLED');

        ELSIF NEW.status = 'CANCELLED' THEN
            UPDATE public.restaurant_orders
            SET status = 'CANCELLED',
                cancelled_at = COALESCE(cancelled_at, now()),
                updated_at = now()
            WHERE id = NEW.restaurant_order_id
              AND status != 'CANCELLED';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_kitchen_ticket_status ON public.kitchen_tickets;

CREATE TRIGGER trg_sync_kitchen_ticket_status
AFTER UPDATE OF status ON public.kitchen_tickets
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_kitchen_ticket_to_order();

-- 3. Enhance create_guest_food_order with Idempotency, Table Support & Precise Validation
DROP FUNCTION IF EXISTS public.create_guest_food_order(character varying, uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.create_guest_food_order(
    p_session_token_hash VARCHAR(64),
    p_restaurant_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL,
    p_order_type VARCHAR(30) DEFAULT 'ROOM_SERVICE',
    p_table_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_stay public.stays;
    v_restaurant public.restaurants;
    v_table public.restaurant_tables;
    v_item JSONB;
    v_menu_item public.menu_items;
    v_order_id UUID;
    v_order_number VARCHAR(50);
    v_subtotal NUMERIC(12,2) := 0;
    v_tax_amount NUMERIC(12,2) := 0;
    v_total_amount NUMERIC(12,2) := 0;
    v_item_qty INT;
    v_item_id UUID;
    v_item_special_instructions TEXT;
    v_item_subtotal NUMERIC(12,2);
    v_kds_result JSONB;
    v_order_record public.restaurant_orders;
    v_existing_order public.restaurant_orders;
    v_target_order_type VARCHAR(30);
    v_target_room_id UUID;
    v_target_table_id UUID;
BEGIN
    -- 0. Check Idempotency Key (Return existing order if already processed)
    IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
        SELECT * INTO v_existing_order
        FROM public.restaurant_orders
        WHERE idempotency_key = trim(p_idempotency_key);

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'order_id', v_existing_order.id,
                'order_number', v_existing_order.order_number,
                'status', v_existing_order.status,
                'subtotal', v_existing_order.subtotal,
                'tax_amount', v_existing_order.tax_amount,
                'total_amount', v_existing_order.total_amount,
                'currency', v_existing_order.currency,
                'is_duplicate', true,
                'created_at', v_existing_order.created_at
            );
        END IF;
    END IF;

    -- 1. Validate Guest Session
    IF p_session_token_hash IS NULL OR length(p_session_token_hash) < 32 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid session token.');
    END IF;

    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session is invalid, expired, or revoked.');
    END IF;

    IF v_session.session_type <> 'VERIFIED_STAY' THEN
        RETURN jsonb_build_object('success', false, 'error', 'In-room food ordering requires a verified in-house guest session.');
    END IF;

    -- 2. Verify Stay is Currently Checked In
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = v_session.stay_id
      AND status = 'CHECKED_IN';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Your stay has concluded or is not currently active.');
    END IF;

    -- 3. Verify Restaurant Belongs to Same Property and is Active
    SELECT * INTO v_restaurant
    FROM public.restaurants
    WHERE id = p_restaurant_id
      AND property_id = v_session.property_id
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Selected restaurant is invalid or unavailable at this property.');
    END IF;

    -- 4. Validate Table if Dine-In
    v_target_order_type := COALESCE(p_order_type, 'ROOM_SERVICE');
    IF v_target_order_type NOT IN ('ROOM_SERVICE', 'DINE_IN', 'TAKEAWAY', 'DELIVERY') THEN
        v_target_order_type := 'ROOM_SERVICE';
    END IF;

    IF v_target_order_type = 'DINE_IN' AND p_table_id IS NOT NULL THEN
        SELECT * INTO v_table
        FROM public.restaurant_tables
        WHERE id = p_table_id
          AND restaurant_id = p_restaurant_id
          AND is_active = true;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'Selected table is invalid or does not belong to this restaurant.');
        END IF;
        v_target_table_id := p_table_id;
        v_target_room_id := NULL;
    ELSE
        v_target_table_id := NULL;
        v_target_room_id := v_session.room_id;
        v_target_order_type := 'ROOM_SERVICE';
    END IF;

    -- 5. Validate Items Array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order cart is empty.');
    END IF;

    -- 6. Calculate Authoritative Prices and Validate Each Item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'menu_item_id')::UUID;
        v_item_qty := COALESCE((v_item->>'quantity')::INT, 0);

        IF v_item_qty <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid item quantity specified.');
        END IF;

        -- Fetch authoritative menu item from DB
        SELECT * INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item_id
          AND restaurant_id = p_restaurant_id
          AND is_active = true;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'One or more items do not belong to this restaurant.');
        END IF;

        IF NOT v_menu_item.is_available THEN
            RETURN jsonb_build_object('success', false, 'error', 'Item "' || v_menu_item.name || '" is currently out of stock.');
        END IF;

        v_item_subtotal := round(v_menu_item.price * v_item_qty, 2);
        v_subtotal := v_subtotal + v_item_subtotal;
    END LOOP;

    -- Apply standard 5% tax
    v_tax_amount := round(v_subtotal * 0.05, 2);
    v_total_amount := v_subtotal + v_tax_amount;

    -- Generate Unique Order Number
    v_order_number := CASE 
        WHEN v_target_order_type = 'DINE_IN' THEN 'TBL-' 
        ELSE 'RS-' 
    END || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

    -- 7. Insert Restaurant Order
    INSERT INTO public.restaurant_orders (
        property_id,
        restaurant_id,
        room_id,
        table_id,
        guest_id,
        stay_id,
        order_number,
        order_type,
        status,
        notes,
        subtotal,
        tax_amount,
        service_charge_amount,
        discount_amount,
        total_amount,
        currency,
        idempotency_key
    )
    VALUES (
        v_session.property_id,
        p_restaurant_id,
        v_target_room_id,
        v_target_table_id,
        v_session.guest_id,
        v_session.stay_id,
        v_order_number,
        v_target_order_type,
        'CONFIRMED',
        p_notes,
        v_subtotal,
        v_tax_amount,
        0,
        0,
        v_total_amount,
        COALESCE(v_restaurant.currency, 'INR'),
        p_idempotency_key
    )
    RETURNING * INTO v_order_record;

    v_order_id := v_order_record.id;

    -- 8. Insert Restaurant Order Items (Authoritative DB price snapshot)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'menu_item_id')::UUID;
        v_item_qty := (v_item->>'quantity')::INT;
        v_item_special_instructions := v_item->>'special_instructions';

        SELECT * INTO v_menu_item
        FROM public.menu_items
        WHERE id = v_item_id;

        INSERT INTO public.restaurant_order_items (
            order_id,
            menu_item_id,
            item_name,
            unit_price,
            quantity,
            line_total,
            notes
        )
        VALUES (
            v_order_id,
            v_menu_item.id,
            v_menu_item.name,
            v_menu_item.price,
            v_item_qty,
            round(v_menu_item.price * v_item_qty, 2),
            v_item_special_instructions
        );
    END LOOP;

    -- 9. Create Order Audit Event
    INSERT INTO public.restaurant_order_events (
        property_id,
        order_id,
        event_type,
        to_status,
        notes
    )
    VALUES (
        v_session.property_id,
        v_order_id,
        'CREATED',
        'CONFIRMED',
        'Guest placed ' || v_target_order_type || ' food order via QR portal'
    );

    -- 10. Fire Kitchen Ticket to KDS (Atomic & Idempotent)
    BEGIN
        v_kds_result := public.create_or_fire_kitchen_ticket(
            v_order_id,
            v_session.property_id,
            'NORMAL'
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'KDS firing notice: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', v_order_id,
        'order_number', v_order_number,
        'status', 'CONFIRMED',
        'subtotal', v_subtotal,
        'tax_amount', v_tax_amount,
        'total_amount', v_total_amount,
        'currency', COALESCE(v_restaurant.currency, 'INR'),
        'restaurant_name', v_restaurant.name,
        'created_at', v_order_record.created_at
    );
END;
$$;
