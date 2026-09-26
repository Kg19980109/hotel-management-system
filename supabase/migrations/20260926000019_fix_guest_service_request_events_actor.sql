-- ============================================================
-- STAYHUB MIGRATION 19: FIX GUEST SERVICE REQUEST EVENTS ACTOR PROFILE FK
-- Fixes foreign key violation when auth_user_id != profiles.id
-- ============================================================

-- 1. FIX staff_acknowledge_guest_request
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
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
        acknowledged_at = now(),
        acknowledged_by = v_caller_id,
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    v_actor_profile_id := NULL;
    v_actor_name := 'Hotel Staff';

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE auth_user_id = v_caller_id OR id = v_caller_id 
        LIMIT 1;

        IF FOUND THEN
            v_actor_profile_id := v_profile.id;
            v_actor_name := COALESCE(v_profile.full_name, 'Hotel Staff');
        END IF;
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
        v_actor_profile_id,
        v_actor_name,
        p_notes
    );

    RETURN jsonb_build_object('success', true, 'status', 'ACKNOWLEDGED', 'acknowledged_at', now());
END;
$$;

-- 2. FIX staff_assign_guest_request
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
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
        WHERE (user_id = p_assigned_to OR user_id IN (SELECT auth_user_id FROM public.profiles WHERE id = p_assigned_to))
          AND property_id = p_property_id
          AND status = 'active'
        LIMIT 1;

        IF v_staff_prop IS NULL THEN
            -- Check if assigned directly to staff_members
            SELECT property_id INTO v_staff_prop
            FROM public.staff_members
            WHERE id = p_assigned_to AND property_id = p_property_id AND is_active = true
            LIMIT 1;
        END IF;

        IF v_staff_prop IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Assigned staff does not belong to this property.');
        END IF;

        SELECT * INTO v_assigned_profile 
        FROM public.profiles 
        WHERE id = p_assigned_to OR auth_user_id = p_assigned_to
        LIMIT 1;
    END IF;

    v_old_status := v_req.status;

    UPDATE public.guest_service_requests
    SET assigned_to = p_assigned_to,
        assigned_department = COALESCE(p_assigned_department, assigned_department),
        status = 'ASSIGNED',
        updated_by = v_caller_id,
        updated_at = now()
    WHERE id = v_req.id;

    v_actor_profile_id := NULL;
    v_actor_name := 'Hotel Staff';

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE auth_user_id = v_caller_id OR id = v_caller_id 
        LIMIT 1;

        IF FOUND THEN
            v_actor_profile_id := v_profile.id;
            v_actor_name := COALESCE(v_profile.full_name, 'Hotel Staff');
        END IF;
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
        v_actor_profile_id,
        v_actor_name,
        'Assigned to ' || COALESCE(v_assigned_profile.full_name, p_assigned_department, 'staff') || COALESCE('. ' || p_notes, '')
    );

    RETURN jsonb_build_object('success', true, 'status', 'ASSIGNED');
END;
$$;

-- 3. FIX staff_start_guest_request
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
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

    v_actor_profile_id := NULL;
    v_actor_name := 'Hotel Staff';

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE auth_user_id = v_caller_id OR id = v_caller_id 
        LIMIT 1;

        IF FOUND THEN
            v_actor_profile_id := v_profile.id;
            v_actor_name := COALESCE(v_profile.full_name, 'Hotel Staff');
        END IF;
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
        v_actor_profile_id,
        v_actor_name,
        COALESCE(p_notes, 'Work started on request')
    );

    RETURN jsonb_build_object('success', true, 'status', 'IN_PROGRESS');
END;
$$;

-- 4. FIX staff_complete_guest_request
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
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

    v_actor_profile_id := NULL;
    v_actor_name := 'Hotel Staff';

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE auth_user_id = v_caller_id OR id = v_caller_id 
        LIMIT 1;

        IF FOUND THEN
            v_actor_profile_id := v_profile.id;
            v_actor_name := COALESCE(v_profile.full_name, 'Hotel Staff');
        END IF;
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
        v_actor_profile_id,
        v_actor_name,
        COALESCE(p_staff_notes, p_guest_notes, 'Request marked as completed')
    );

    RETURN jsonb_build_object('success', true, 'status', 'COMPLETED');
END;
$$;

-- 5. FIX staff_cancel_guest_request
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
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

    v_actor_profile_id := NULL;
    v_actor_name := 'Hotel Staff';

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE auth_user_id = v_caller_id OR id = v_caller_id 
        LIMIT 1;

        IF FOUND THEN
            v_actor_profile_id := v_profile.id;
            v_actor_name := COALESCE(v_profile.full_name, 'Hotel Staff');
        END IF;
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
        v_actor_profile_id,
        v_actor_name,
        COALESCE(p_reason, 'Cancelled by staff')
    );

    RETURN jsonb_build_object('success', true, 'status', 'CANCELLED');
END;
$$;

-- 6. FIX staff_reject_guest_request
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
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

    v_actor_profile_id := NULL;
    v_actor_name := 'Hotel Staff';

    IF v_caller_id IS NOT NULL THEN
        SELECT * INTO v_profile 
        FROM public.profiles 
        WHERE auth_user_id = v_caller_id OR id = v_caller_id 
        LIMIT 1;

        IF FOUND THEN
            v_actor_profile_id := v_profile.id;
            v_actor_name := COALESCE(v_profile.full_name, 'Hotel Staff');
        END IF;
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
        v_actor_profile_id,
        v_actor_name,
        COALESCE(p_reason, 'Rejected by staff')
    );

    RETURN jsonb_build_object('success', true, 'status', 'REJECTED');
END;
$$;
