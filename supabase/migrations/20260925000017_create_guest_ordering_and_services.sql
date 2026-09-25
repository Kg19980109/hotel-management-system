-- ============================================================
-- STAYHUB MIGRATION 17: QR FOOD ORDERING & GUEST SERVICES
-- Phase 15: QR Food Ordering & Guest Services Domain
-- ============================================================

-- 1. EXTEND RESTAURANT ORDERS WITH ROOM_ID
ALTER TABLE public.restaurant_orders
ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_restaurant_orders_room_id ON public.restaurant_orders(room_id);

-- 2. GUEST SERVICE REQUESTS TABLE
CREATE TABLE IF NOT EXISTS public.guest_service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (
        category IN (
            'HOUSEKEEPING',
            'FRONT_DESK',
            'CONCIERGE',
            'MAINTENANCE',
            'LAUNDRY',
            'SPA',
            'TRANSPORT',
            'ROOM_SERVICE',
            'OTHER'
        )
    ),
    request_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(30) NOT NULL DEFAULT 'MEDIUM' CHECK (
        priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')
    ),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (
        status IN (
            'SUBMITTED',
            'ACKNOWLEDGED',
            'ASSIGNED',
            'IN_PROGRESS',
            'COMPLETED',
            'CANCELLED',
            'REJECTED'
        )
    ),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    assigned_department VARCHAR(50) CHECK (
        assigned_department IS NULL OR assigned_department IN (
            'HOUSEKEEPING',
            'FRONT_DESK',
            'CONCIERGE',
            'MAINTENANCE',
            'LAUNDRY',
            'SPA',
            'TRANSPORT',
            'RESTAURANT',
            'MANAGEMENT',
            'OTHER'
        )
    ),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    guest_visible_notes TEXT,
    staff_notes TEXT,
    created_by_guest BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Guest Service Requests
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_property_id ON public.guest_service_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_stay_id ON public.guest_service_requests(stay_id);
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_guest_id ON public.guest_service_requests(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_room_id ON public.guest_service_requests(room_id);
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_status ON public.guest_service_requests(property_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_category ON public.guest_service_requests(property_id, category);
CREATE INDEX IF NOT EXISTS idx_guest_service_requests_assigned_to ON public.guest_service_requests(assigned_to);

-- 3. GUEST SERVICE REQUEST EVENTS (IMMUTABLE AUDIT LOG)
CREATE TABLE IF NOT EXISTS public.guest_service_request_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.guest_service_requests(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_type VARCHAR(30) NOT NULL CHECK (actor_type IN ('GUEST', 'STAFF', 'SYSTEM')),
    actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_name VARCHAR(100),
    event_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_guest_srv_req_events_request_id ON public.guest_service_request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_guest_srv_req_events_property_id ON public.guest_service_request_events(property_id);

-- 4. CROSS-TENANT INTEGRITY TRIGGERS

-- Trigger: Ensure Request Room, Guest, Stay, and Assigned Staff Belong to Same Property
CREATE OR REPLACE FUNCTION public.check_guest_service_request_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_room_prop UUID;
    v_guest_prop UUID;
    v_stay_prop UUID;
    v_staff_prop UUID;
BEGIN
    -- Verify Room
    SELECT property_id INTO v_room_prop FROM public.rooms WHERE id = NEW.room_id;
    IF v_room_prop IS NULL OR v_room_prop <> NEW.property_id THEN
        RAISE EXCEPTION 'Tenant Violation: room % does not belong to property %', NEW.room_id, NEW.property_id;
    END IF;

    -- Verify Guest
    SELECT property_id INTO v_guest_prop FROM public.guests WHERE id = NEW.guest_id;
    IF v_guest_prop IS NULL OR v_guest_prop <> NEW.property_id THEN
        RAISE EXCEPTION 'Tenant Violation: guest % does not belong to property %', NEW.guest_id, NEW.property_id;
    END IF;

    -- Verify Stay
    SELECT property_id INTO v_stay_prop FROM public.stays WHERE id = NEW.stay_id;
    IF v_stay_prop IS NULL OR v_stay_prop <> NEW.property_id THEN
        RAISE EXCEPTION 'Tenant Violation: stay % does not belong to property %', NEW.stay_id, NEW.property_id;
    END IF;

    -- Verify Assigned Staff (if assigned)
    IF NEW.assigned_to IS NOT NULL THEN
        SELECT property_id INTO v_staff_prop
        FROM public.property_memberships
        WHERE user_id = NEW.assigned_to
          AND property_id = NEW.property_id
          AND status = 'active';

        IF v_staff_prop IS NULL THEN
            RAISE EXCEPTION 'Tenant Violation: assigned staff % does not belong to property %', NEW.assigned_to, NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_guest_service_request_tenant ON public.guest_service_requests;
CREATE TRIGGER trg_check_guest_service_request_tenant
BEFORE INSERT OR UPDATE ON public.guest_service_requests
FOR EACH ROW
EXECUTE FUNCTION public.check_guest_service_request_tenant();

-- Trigger: Ensure Request Events Cannot Be Altered Manually
CREATE OR REPLACE FUNCTION public.prevent_guest_service_request_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        -- Strictly allow ONLY foreign key cascade SET NULL for actor_profile_id
        IF NEW.actor_profile_id IS NULL 
           AND OLD.event_type = NEW.event_type 
           AND OLD.from_status IS NOT DISTINCT FROM NEW.from_status 
           AND OLD.to_status = NEW.to_status 
           AND OLD.request_id = NEW.request_id 
           AND OLD.property_id = NEW.property_id 
           AND OLD.actor_type = NEW.actor_type
           AND OLD.actor_name IS NOT DISTINCT FROM NEW.actor_name
           AND OLD.event_note IS NOT DISTINCT FROM NEW.event_note
           AND OLD.created_at = NEW.created_at THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'guest_service_request_events table is immutable.';
    ELSIF TG_OP = 'DELETE' THEN
        -- Allow cascade deletion when parent request or property is deleted
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_guest_srv_req_events_mutation ON public.guest_service_request_events;
CREATE TRIGGER trg_prevent_guest_srv_req_events_mutation
BEFORE UPDATE ON public.guest_service_request_events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_guest_service_request_events_mutation();

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.guest_service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_service_request_events ENABLE ROW LEVEL SECURITY;

-- Staff policies for guest_service_requests
DROP POLICY IF EXISTS staff_select_guest_service_requests ON public.guest_service_requests;
CREATE POLICY staff_select_guest_service_requests ON public.guest_service_requests
    FOR SELECT
    TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS staff_insert_guest_service_requests ON public.guest_service_requests;
CREATE POLICY staff_insert_guest_service_requests ON public.guest_service_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS staff_update_guest_service_requests ON public.guest_service_requests;
CREATE POLICY staff_update_guest_service_requests ON public.guest_service_requests
    FOR UPDATE
    TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id))
    WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

-- Staff policies for guest_service_request_events
DROP POLICY IF EXISTS staff_select_guest_srv_req_events ON public.guest_service_request_events;
CREATE POLICY staff_select_guest_srv_req_events ON public.guest_service_request_events
    FOR SELECT
    TO authenticated
    USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS staff_insert_guest_srv_req_events ON public.guest_service_request_events;
CREATE POLICY staff_insert_guest_srv_req_events ON public.guest_service_request_events
    FOR INSERT
    TO authenticated
    WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

-- ============================================================
-- 6. RPCs FOR GUEST QR FOOD ORDERING
-- ============================================================

-- RPC: create_guest_food_order
-- Validates session, stay status, restaurant, menu item prices/availability,
-- and creates restaurant_order + items + KDS ticket atomically.
CREATE OR REPLACE FUNCTION public.create_guest_food_order(
    p_session_token_hash VARCHAR(64),
    p_restaurant_id UUID,
    p_items JSONB,
    p_notes TEXT DEFAULT NULL
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
BEGIN
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

    -- 4. Validate Items Array
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order cart is empty.');
    END IF;

    -- 5. Calculate Authoritative Prices and Validate Each Item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_item_id := (v_item->>'menu_item_id')::UUID;
        v_item_qty := COALESCE((v_item->>'quantity')::INT, 0);

        IF v_item_qty <= 0 THEN
            RETURN jsonb_build_object('success', false, 'error', 'Invalid item quantity specified.');
        END IF;

        -- Fetch authoritative menu item
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

    -- Apply standard 5% tax (or hotel dining tax calculation)
    v_tax_amount := round(v_subtotal * 0.05, 2);
    v_total_amount := v_subtotal + v_tax_amount;

    -- Generate Order Number
    v_order_number := 'RS-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));

    -- 6. Insert Restaurant Order
    INSERT INTO public.restaurant_orders (
        property_id,
        restaurant_id,
        room_id,
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
        currency
    )
    VALUES (
        v_session.property_id,
        p_restaurant_id,
        v_session.room_id,
        v_session.guest_id,
        v_session.stay_id,
        v_order_number,
        'ROOM_SERVICE',
        'CONFIRMED',
        p_notes,
        v_subtotal,
        v_tax_amount,
        0,
        0,
        v_total_amount,
        COALESCE(v_restaurant.currency, 'INR')
    )
    RETURNING * INTO v_order_record;

    v_order_id := v_order_record.id;

    -- 7. Insert Restaurant Order Items & Snapshots
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

    -- 8. Create Order Event
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
        'Guest placed room service food order via QR portal'
    );

    -- 9. Automatic KDS Integration: Fire kitchen ticket
    BEGIN
        v_kds_result := public.create_or_fire_kitchen_ticket(
            v_order_id,
            v_session.property_id,
            'NORMAL'
        );
    EXCEPTION WHEN OTHERS THEN
        -- If KDS routing has soft warning, log but do not fail order
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

-- RPC: get_guest_food_orders
-- Returns only the verified guest's own orders for their current stay.
CREATE OR REPLACE FUNCTION public.get_guest_food_orders(
    p_session_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_orders JSONB;
BEGIN
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session.');
    END IF;

    IF v_session.session_type <> 'VERIFIED_STAY' THEN
        RETURN jsonb_build_object('success', true, 'orders', '[]'::jsonb);
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', o.id,
            'order_number', o.order_number,
            'restaurant_id', o.restaurant_id,
            'restaurant_name', r.name,
            'order_type', o.order_type,
            'status', o.status,
            'total_amount', o.total_amount,
            'currency', o.currency,
            'item_count', (SELECT COUNT(*) FROM public.restaurant_order_items oi WHERE oi.order_id = o.id),
            'created_at', o.created_at
        ) ORDER BY o.created_at DESC
    ), '[]'::jsonb) INTO v_orders
    FROM public.restaurant_orders o
    JOIN public.restaurants r ON o.restaurant_id = r.id
    WHERE o.property_id = v_session.property_id
      AND o.stay_id = v_session.stay_id
      AND o.guest_id = v_session.guest_id;

    RETURN jsonb_build_object(
        'success', true,
        'orders', v_orders
    );
END;
$$;

-- RPC: get_guest_food_order_detail
-- Returns details of an order if and only if it belongs to the session's stay and guest.
CREATE OR REPLACE FUNCTION public.get_guest_food_order_detail(
    p_session_token_hash VARCHAR(64),
    p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_order public.restaurant_orders;
    v_restaurant public.restaurants;
    v_items JSONB;
    v_kds_status VARCHAR(50);
BEGIN
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session.');
    END IF;

    SELECT * INTO v_order
    FROM public.restaurant_orders
    WHERE id = p_order_id
      AND property_id = v_session.property_id
      AND stay_id = v_session.stay_id
      AND guest_id = v_session.guest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Order not found or access denied.');
    END IF;

    SELECT * INTO v_restaurant FROM public.restaurants WHERE id = v_order.restaurant_id;

    -- Fetch KDS ticket status if available
    SELECT status INTO v_kds_status
    FROM public.kitchen_tickets
    WHERE restaurant_order_id = v_order.id
    LIMIT 1;

    -- Fetch items
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', oi.id,
            'menu_item_id', oi.menu_item_id,
            'item_name', oi.item_name,
            'unit_price', oi.unit_price,
            'quantity', oi.quantity,
            'subtotal_price', oi.line_total,
            'notes', oi.notes
        )
    ), '[]'::jsonb) INTO v_items
    FROM public.restaurant_order_items oi
    WHERE oi.order_id = v_order.id;

    RETURN jsonb_build_object(
        'success', true,
        'order', jsonb_build_object(
            'id', v_order.id,
            'order_number', v_order.order_number,
            'restaurant_id', v_order.restaurant_id,
            'restaurant_name', v_restaurant.name,
            'order_type', v_order.order_type,
            'status', v_order.status,
            'kds_status', v_kds_status,
            'subtotal', v_order.subtotal,
            'tax_amount', v_order.tax_amount,
            'total_amount', v_order.total_amount,
            'currency', v_order.currency,
            'notes', v_order.notes,
            'created_at', v_order.created_at,
            'completed_at', v_order.completed_at,
            'items', v_items
        )
    );
END;
$$;

-- ============================================================
-- 7. RPCs FOR GUEST SERVICE REQUESTS
-- ============================================================

-- RPC: create_guest_service_request
-- Resolves stay, room, and guest server-side from session token hash.
CREATE OR REPLACE FUNCTION public.create_guest_service_request(
    p_session_token_hash VARCHAR(64),
    p_category VARCHAR(50),
    p_request_type VARCHAR(100),
    p_title VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_priority VARCHAR(30) DEFAULT 'MEDIUM'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_stay public.stays;
    v_new_req public.guest_service_requests;
    v_guest public.guests;
    v_clean_priority VARCHAR(30);
BEGIN
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
        RETURN jsonb_build_object('success', false, 'error', 'Guest service requests require a verified checked-in stay.');
    END IF;

    -- 2. Check Stay is Checked In
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = v_session.stay_id
      AND status = 'CHECKED_IN';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Your stay has concluded or is not currently active.');
    END IF;

    -- 3. Validate Category
    IF p_category NOT IN (
        'HOUSEKEEPING', 'FRONT_DESK', 'CONCIERGE', 'MAINTENANCE',
        'LAUNDRY', 'SPA', 'TRANSPORT', 'ROOM_SERVICE', 'OTHER'
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid service category specified.');
    END IF;

    -- 4. Sanitize Priority
    v_clean_priority := UPPER(COALESCE(p_priority, 'MEDIUM'));
    IF v_clean_priority NOT IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT') THEN
        v_clean_priority := 'MEDIUM';
    END IF;

    -- 5. Insert Service Request
    INSERT INTO public.guest_service_requests (
        property_id,
        guest_id,
        stay_id,
        room_id,
        category,
        request_type,
        title,
        description,
        priority,
        status,
        created_by_guest
    )
    VALUES (
        v_session.property_id,
        v_session.guest_id,
        v_session.stay_id,
        v_session.room_id,
        p_category,
        p_request_type,
        p_title,
        p_description,
        v_clean_priority,
        'SUBMITTED',
        true
    )
    RETURNING * INTO v_new_req;

    SELECT * INTO v_guest FROM public.guests WHERE id = v_session.guest_id;

    -- 6. Insert Request Event (Audit Log)
    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_name,
        event_note
    )
    VALUES (
        v_session.property_id,
        v_new_req.id,
        'SUBMITTED',
        NULL,
        'SUBMITTED',
        'GUEST',
        v_guest.first_name || ' ' || v_guest.last_name,
        'Request submitted from Guest Portal'
    );

    RETURN jsonb_build_object(
        'success', true,
        'request_id', v_new_req.id,
        'category', v_new_req.category,
        'request_type', v_new_req.request_type,
        'title', v_new_req.title,
        'priority', v_new_req.priority,
        'status', v_new_req.status,
        'requested_at', v_new_req.requested_at
    );
END;
$$;

-- RPC: get_guest_service_requests
-- Returns only requests for the verified session's stay and guest.
CREATE OR REPLACE FUNCTION public.get_guest_service_requests(
    p_session_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_requests JSONB;
BEGIN
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session.');
    END IF;

    IF v_session.session_type <> 'VERIFIED_STAY' THEN
        RETURN jsonb_build_object('success', true, 'requests', '[]'::jsonb);
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'category', r.category,
            'request_type', r.request_type,
            'title', r.title,
            'description', r.description,
            'priority', r.priority,
            'status', r.status,
            'guest_visible_notes', r.guest_visible_notes,
            'requested_at', r.requested_at,
            'started_at', r.started_at,
            'completed_at', r.completed_at,
            'cancelled_at', r.cancelled_at
        ) ORDER BY r.requested_at DESC
    ), '[]'::jsonb) INTO v_requests
    FROM public.guest_service_requests r
    WHERE r.property_id = v_session.property_id
      AND r.stay_id = v_session.stay_id
      AND r.guest_id = v_session.guest_id;

    RETURN jsonb_build_object(
        'success', true,
        'requests', v_requests
    );
END;
$$;

-- RPC: get_guest_service_request_detail
-- Returns request detail with guest-safe fields (internal staff notes and profile IDs omitted).
CREATE OR REPLACE FUNCTION public.get_guest_service_request_detail(
    p_session_token_hash VARCHAR(64),
    p_request_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_req public.guest_service_requests;
    v_room public.rooms;
    v_events JSONB;
BEGIN
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id
      AND property_id = v_session.property_id
      AND stay_id = v_session.stay_id
      AND guest_id = v_session.guest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or access denied.');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = v_req.room_id;

    -- Fetch guest-safe timeline events
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'event_type', e.event_type,
            'from_status', e.from_status,
            'to_status', e.to_status,
            'actor_type', e.actor_type,
            'created_at', e.created_at
        ) ORDER BY e.created_at ASC
    ), '[]'::jsonb) INTO v_events
    FROM public.guest_service_request_events e
    WHERE e.request_id = v_req.id;

    RETURN jsonb_build_object(
        'success', true,
        'request', jsonb_build_object(
            'id', v_req.id,
            'room_number', v_room.room_number,
            'category', v_req.category,
            'request_type', v_req.request_type,
            'title', v_req.title,
            'description', v_req.description,
            'priority', v_req.priority,
            'status', v_req.status,
            'guest_visible_notes', v_req.guest_visible_notes,
            'requested_at', v_req.requested_at,
            'started_at', v_req.started_at,
            'completed_at', v_req.completed_at,
            'cancelled_at', v_req.cancelled_at,
            'events', v_events
        )
    );
END;
$$;

-- RPC: cancel_guest_service_request (Guest Action)
CREATE OR REPLACE FUNCTION public.cancel_guest_service_request(
    p_session_token_hash VARCHAR(64),
    p_request_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session public.guest_sessions;
    v_req public.guest_service_requests;
    v_guest public.guests;
    v_old_status VARCHAR(30);
BEGIN
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id
      AND property_id = v_session.property_id
      AND stay_id = v_session.stay_id
      AND guest_id = v_session.guest_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request not found or access denied.');
    END IF;

    IF v_req.status IN ('COMPLETED', 'CANCELLED', 'REJECTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel a request that is already ' || v_req.status || '.');
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'CANCELLED',
        cancelled_at = now(),
        updated_at = now()
    WHERE id = v_req.id;

    SELECT * INTO v_guest FROM public.guests WHERE id = v_session.guest_id;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_name,
        event_note
    )
    VALUES (
        v_session.property_id,
        v_req.id,
        'CANCELLED',
        v_old_status,
        'CANCELLED',
        'GUEST',
        v_guest.first_name || ' ' || v_guest.last_name,
        COALESCE(p_reason, 'Cancelled by guest')
    );

    RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$;

-- ============================================================
-- 8. RPCs FOR STAFF GUEST REQUEST MANAGEMENT
-- ============================================================

-- RPC: staff_acknowledge_guest_request
CREATE OR REPLACE FUNCTION public.staff_acknowledge_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_old_status VARCHAR(30);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status NOT IN ('SUBMITTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Request cannot be acknowledged from status ' || v_req.status);
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'ACKNOWLEDGED',
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'ACKNOWLEDGED',
        v_old_status,
        'ACKNOWLEDGED',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        p_notes
    );

    RETURN jsonb_build_object('success', true, 'status', 'ACKNOWLEDGED');
END;
$$;

-- RPC: staff_assign_guest_request
CREATE OR REPLACE FUNCTION public.staff_assign_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_assigned_to UUID DEFAULT NULL,
    p_assigned_department VARCHAR(50) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_assigned_profile public.profiles;
    v_old_status VARCHAR(30);
    v_staff_prop UUID;
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status IN ('COMPLETED', 'CANCELLED', 'REJECTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot assign a closed request.');
    END IF;

    -- Validate staff membership
    IF p_assigned_to IS NOT NULL THEN
        SELECT property_id INTO v_staff_prop
        FROM public.property_memberships
        WHERE user_id = p_assigned_to
          AND property_id = p_property_id
          AND status = 'active';

        IF v_staff_prop IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Assigned staff does not belong to this property.');
        END IF;

        SELECT * INTO v_assigned_profile FROM public.profiles WHERE id = p_assigned_to;
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET assigned_to = p_assigned_to,
        assigned_department = COALESCE(p_assigned_department, assigned_department),
        status = 'ASSIGNED',
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'ASSIGNED',
        v_old_status,
        'ASSIGNED',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        'Assigned to ' || COALESCE(v_assigned_profile.full_name, p_assigned_department, 'staff') || COALESCE('. ' || p_notes, '')
    );

    RETURN jsonb_build_object('success', true, 'status', 'ASSIGNED');
END;
$$;

-- RPC: staff_start_guest_request
CREATE OR REPLACE FUNCTION public.staff_start_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_old_status VARCHAR(30);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status NOT IN ('SUBMITTED', 'ACKNOWLEDGED', 'ASSIGNED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot start request from status ' || v_req.status);
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'IN_PROGRESS',
        started_at = COALESCE(started_at, now()),
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'IN_PROGRESS',
        v_old_status,
        'IN_PROGRESS',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        COALESCE(p_notes, 'Work started on request')
    );

    RETURN jsonb_build_object('success', true, 'status', 'IN_PROGRESS');
END;
$$;

-- RPC: staff_complete_guest_request
CREATE OR REPLACE FUNCTION public.staff_complete_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_guest_notes TEXT DEFAULT NULL,
    p_staff_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_old_status VARCHAR(30);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status IN ('COMPLETED', 'CANCELLED', 'REJECTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot complete a request that is already ' || v_req.status);
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'COMPLETED',
        completed_at = now(),
        guest_visible_notes = COALESCE(p_guest_notes, guest_visible_notes),
        staff_notes = COALESCE(p_staff_notes, staff_notes),
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'COMPLETED',
        v_old_status,
        'COMPLETED',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        COALESCE(p_staff_notes, p_guest_notes, 'Request marked as completed')
    );

    RETURN jsonb_build_object('success', true, 'status', 'COMPLETED');
END;
$$;

-- RPC: staff_cancel_guest_request
CREATE OR REPLACE FUNCTION public.staff_cancel_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_old_status VARCHAR(30);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status IN ('COMPLETED', 'CANCELLED', 'REJECTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot cancel a request that is already ' || v_req.status);
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'CANCELLED',
        cancelled_at = now(),
        staff_notes = COALESCE(p_reason, staff_notes),
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'CANCELLED',
        v_old_status,
        'CANCELLED',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        COALESCE(p_reason, 'Cancelled by staff')
    );

    RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$;

-- RPC: staff_reject_guest_request
CREATE OR REPLACE FUNCTION public.staff_reject_guest_request(
    p_property_id UUID,
    p_request_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_req public.guest_service_requests;
    v_profile public.profiles;
    v_old_status VARCHAR(30);
BEGIN
    v_caller_id := auth.uid();
    IF v_caller_id IS NOT NULL AND NOT public.user_belongs_to_property(v_caller_id, p_property_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Access denied to this property.');
    END IF;

    SELECT * INTO v_req
    FROM public.guest_service_requests
    WHERE id = p_request_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Guest request not found.');
    END IF;

    IF v_req.status IN ('COMPLETED', 'CANCELLED', 'REJECTED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot reject a request that is already ' || v_req.status);
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET status = 'REJECTED',
        staff_notes = COALESCE(p_reason, staff_notes),
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v_caller_id;
    END IF;

    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note
    )
    VALUES (
        p_property_id,
        v_req.id,
        'REJECTED',
        v_old_status,
        'REJECTED',
        'STAFF',
        v_caller_id,
        COALESCE(v_profile.full_name, 'Hotel Staff'),
        COALESCE(p_reason, 'Rejected by staff')
    );

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
END;
$$;
