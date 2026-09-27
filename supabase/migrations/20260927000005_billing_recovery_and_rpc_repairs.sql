-- Migration: 20260927000005_billing_recovery_and_rpc_repairs.sql
-- Description: Billing subsystem recovery, RPC parameter synchronization, and automated folio charge posting

-- 1. Drop ambiguous duplicate overload of record_folio_payment
DROP FUNCTION IF EXISTS public.record_folio_payment(uuid, uuid, numeric, character varying, text, character varying, uuid);

-- 2. Repaired post_restaurant_order_to_folio RPC (Fix column mismatch & differentiate room service vs restaurant charge types)
CREATE OR REPLACE FUNCTION public.post_restaurant_order_to_folio(
    p_order_id UUID,
    p_stay_id UUID,
    p_property_id UUID,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_folio_res JSONB;
    v_folio_id UUID;
    v_charge RECORD;
    v_profile_id UUID := NULL;
    v_charge_type VARCHAR(50);
    v_charge_desc TEXT;
BEGIN
    IF p_performed_by IS NOT NULL THEN
        SELECT id INTO v_profile_id FROM public.profiles WHERE id = p_performed_by OR auth_user_id = p_performed_by LIMIT 1;
    ELSIF auth.uid() IS NOT NULL THEN
        SELECT id INTO v_profile_id FROM public.profiles WHERE id = auth.uid() OR auth_user_id = auth.uid() LIMIT 1;
    END IF;

    -- 1. Fetch Order Details
    SELECT * INTO v_order
    FROM public.restaurant_orders
    WHERE id = p_order_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Restaurant order not found');
    END IF;

    -- 2. Prevent Double Posting / Idempotent Return
    SELECT * INTO v_charge
    FROM public.folio_charges
    WHERE property_id = p_property_id
      AND source_type = 'RESTAURANT_ORDER'
      AND source_id = p_order_id
      AND voided_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'charge', to_jsonb(v_charge),
            'already_posted', true
        );
    END IF;

    -- 3. Resolve Folio
    v_folio_res := public.get_or_create_stay_folio(p_stay_id, p_property_id, v_profile_id);
    IF NOT (v_folio_res->>'success')::BOOLEAN THEN
        RETURN v_folio_res;
    END IF;
    v_folio_id := (v_folio_res->'folio'->>'id')::UUID;

    -- Determine Charge Type
    IF v_order.order_type = 'ROOM_SERVICE' THEN
        v_charge_type := 'ROOM_SERVICE';
        v_charge_desc := 'In-Room Dining Order #' || v_order.order_number;
    ELSE
        v_charge_type := 'RESTAURANT';
        v_charge_desc := 'Restaurant Order #' || v_order.order_number;
    END IF;

    -- 4. Post Charge
    INSERT INTO public.folio_charges (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        charge_type,
        source_type,
        source_id,
        description,
        charge_date,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        currency,
        posted_at,
        created_by
    ) VALUES (
        p_property_id,
        v_folio_id,
        p_stay_id,
        COALESCE(v_order.guest_id, (SELECT guest_id FROM public.stays WHERE id = p_stay_id)),
        v_charge_type,
        'RESTAURANT_ORDER',
        p_order_id,
        v_charge_desc,
        CURRENT_DATE,
        1.00,
        v_order.subtotal,
        v_order.subtotal,
        COALESCE(v_order.discount_amount, 0.00),
        COALESCE(v_order.tax_amount, 0.00),
        v_order.total_amount,
        COALESCE(v_order.currency, 'INR'),
        now(),
        v_profile_id
    ) RETURNING * INTO v_charge;

    -- 5. Mark Order Settle Linkage
    UPDATE public.restaurant_orders
    SET stay_id = p_stay_id,
        guest_id = COALESCE(v_order.guest_id, (SELECT guest_id FROM public.stays WHERE id = p_stay_id)),
        updated_at = now()
    WHERE id = p_order_id;

    -- 6. Log Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        v_folio_id,
        'CHARGE_POSTED',
        CASE WHEN v_profile_id IS NOT NULL THEN 'STAFF' ELSE 'SYSTEM' END,
        v_profile_id,
        jsonb_build_object(
            'charge_id', v_charge.id,
            'charge_type', v_charge_type,
            'order_id', p_order_id,
            'order_number', v_order.order_number,
            'amount', v_order.total_amount
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'charge', to_jsonb(v_charge),
        'already_posted', false
    );
END;
$$;

-- 3. Automatic Folio Initialization & Room Charges on Check-in
CREATE OR REPLACE FUNCTION public.check_in_reservation_room(
    p_reservation_room_id uuid,
    p_room_id uuid,
    p_property_id uuid,
    p_adults integer DEFAULT NULL::integer,
    p_children integer DEFAULT NULL::integer,
    p_notes text DEFAULT NULL::text,
    p_is_early boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_user_id UUID;
    v_has_role BOOLEAN;
    v_res_room RECORD;
    v_res RECORD;
    v_room RECORD;
    v_prop_today DATE;
    v_stay_id UUID;
    v_stay_record RECORD;
BEGIN
    -- 1. Authentication & Role Validation
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to perform check-in';
    END IF;

    v_has_role := public.user_has_property_role(
        v_user_id,
        p_property_id,
        ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
    );

    IF NOT v_has_role THEN
        RAISE EXCEPTION 'Unauthorized: front desk check-in permissions required';
    END IF;

    -- 2. Fetch & Validate Reservation Room Item
    SELECT * INTO v_res_room
    FROM public.reservation_rooms
    WHERE id = p_reservation_room_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Reservation room item not found for property %', p_property_id;
    END IF;

    -- 3. Fetch & Validate Parent Reservation
    SELECT * INTO v_res
    FROM public.reservations
    WHERE id = v_res_room.reservation_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Parent reservation not found';
    END IF;

    IF v_res.status <> 'CONFIRMED' THEN
        RAISE EXCEPTION 'Cannot check in reservation with status % (must be CONFIRMED)', v_res.status;
    END IF;

    -- 4. Check If Already Checked In
    IF EXISTS (
        SELECT 1 FROM public.stays
        WHERE reservation_room_id = p_reservation_room_id AND status = 'CHECKED_IN'
    ) THEN
        RAISE EXCEPTION 'Reservation room item is already checked in';
    END IF;

    -- 5. Fetch & Validate Physical Room
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Physical room % does not belong to property %', p_room_id, p_property_id;
    END IF;

    IF NOT v_room.is_active THEN
        RAISE EXCEPTION 'Room % is deactivated and cannot be occupied', v_room.room_number;
    END IF;

    IF v_room.status IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE') THEN
        RAISE EXCEPTION 'Room % is % and cannot be checked into', v_room.room_number, v_room.status;
    END IF;

    IF v_room.status = 'OCCUPIED' THEN
        RAISE EXCEPTION 'Room % is currently occupied by another guest', v_room.room_number;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.stays
        WHERE room_id = p_room_id AND status = 'CHECKED_IN'
    ) THEN
        RAISE EXCEPTION 'Room % has an existing active checked-in stay', v_room.room_number;
    END IF;

    -- 6. Date Eligibility & Early Check-In Validation
    v_prop_today := CURRENT_DATE;

    IF v_prop_today < v_res_room.check_in_date AND NOT p_is_early THEN
        RAISE EXCEPTION 'Check-in is scheduled for %. Early check-in requires explicit authorization',
            v_res_room.check_in_date;
    END IF;

    -- 7. Update reservation_rooms with final physical room assignment
    UPDATE public.reservation_rooms
    SET 
        room_id = p_room_id,
        updated_at = now()
    WHERE id = p_reservation_room_id;

    -- 8. Create Stay Record Atomically
    INSERT INTO public.stays (
        property_id,
        reservation_id,
        reservation_room_id,
        guest_id,
        room_id,
        status,
        actual_check_in_at,
        expected_check_out_date,
        adults,
        children,
        notes,
        check_in_by,
        created_by,
        updated_by
    ) VALUES (
        p_property_id,
        v_res.id,
        p_reservation_room_id,
        v_res.primary_guest_id,
        p_room_id,
        'CHECKED_IN',
        now(),
        v_res_room.check_out_date,
        COALESCE(p_adults, v_res_room.adults, 1),
        COALESCE(p_children, v_res_room.children, 0),
        p_notes,
        v_user_id,
        v_user_id,
        v_user_id
    )
    RETURNING * INTO v_stay_record;

    -- 9. Transition Room Status to OCCUPIED
    UPDATE public.rooms
    SET 
        status = 'OCCUPIED',
        updated_at = now(),
        updated_by = v_user_id
    WHERE id = p_room_id;

    -- 10. Automatically Initialize Guest Folio & Post Initial Room Charges
    BEGIN
        PERFORM public.get_or_create_stay_folio(v_stay_record.id, p_property_id, v_user_id);
        PERFORM public.post_room_charges_for_stay(v_stay_record.id, p_property_id, v_user_id);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Folio auto-initialization notice: %', SQLERRM;
    END;

    RETURN to_jsonb(v_stay_record);
END;
$$;

-- 4. Automatic Folio Posting on Room Service Food Orders
CREATE OR REPLACE FUNCTION public.create_guest_food_order(
    p_session_token_hash character varying,
    p_restaurant_id uuid,
    p_order_type character varying,
    p_items jsonb,
    p_notes text DEFAULT NULL::text,
    p_table_id uuid DEFAULT NULL::uuid,
    p_idempotency_key character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_session RECORD;
    v_stay RECORD;
    v_restaurant RECORD;
    v_table RECORD;
    v_order_id UUID;
    v_order_number VARCHAR(50);
    v_target_room_id UUID;
    v_target_table_id UUID;
    v_target_order_type VARCHAR(50);
    v_item JSONB;
    v_item_id UUID;
    v_item_qty INT;
    v_item_special_instructions TEXT;
    v_menu_item RECORD;
    v_subtotal NUMERIC(10,2) := 0;
    v_item_subtotal NUMERIC(10,2);
    v_tax_amount NUMERIC(10,2) := 0;
    v_total_amount NUMERIC(10,2) := 0;
    v_order_record RECORD;
    v_existing_order RECORD;
    v_kds_result JSONB;
BEGIN
    -- 0. Check Idempotency Key
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

    -- Standard 5% tax
    v_tax_amount := round(v_subtotal * 0.05, 2);
    v_total_amount := v_subtotal + v_tax_amount;

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

    -- 8. Insert Restaurant Order Items
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

    -- 10. Automatically post Room Service order to Guest Folio
    IF v_session.stay_id IS NOT NULL THEN
        BEGIN
            PERFORM public.post_restaurant_order_to_folio(
                v_order_id,
                v_session.stay_id,
                v_session.property_id,
                NULL
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Folio auto-posting notice: %', SQLERRM;
        END;
    END IF;

    -- 11. Fire Kitchen Ticket to KDS (Atomic & Idempotent)
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
