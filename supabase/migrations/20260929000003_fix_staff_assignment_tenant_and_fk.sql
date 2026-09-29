-- ============================================================
-- STAYHUB MIGRATION: FIX STAFF ASSIGNMENT TENANT VALIDATION AND FK
-- Allows assigning any staff member present in the staff directory (staff_members)
-- as well as property memberships and profiles
-- ============================================================

-- 1. Drop the restrictive foreign key constraint if it exists
ALTER TABLE public.guest_service_requests
    DROP CONSTRAINT IF EXISTS guest_service_requests_assigned_to_fkey;

-- 2. Update tenant validation trigger on guest_service_requests
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
    -- Verify Property
    IF NEW.property_id IS NULL THEN
        RAISE EXCEPTION 'Tenant Violation: property_id is required';
    END IF;

    -- Verify Room
    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id INTO v_room_prop FROM public.rooms WHERE id = NEW.room_id;
        IF v_room_prop IS NULL OR v_room_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: room % does not belong to property %', NEW.room_id, NEW.property_id;
        END IF;
    END IF;

    -- Verify Guest
    IF NEW.guest_id IS NOT NULL THEN
        SELECT property_id INTO v_guest_prop FROM public.guests WHERE id = NEW.guest_id;
        IF v_guest_prop IS NULL OR v_guest_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: guest % does not belong to property %', NEW.guest_id, NEW.property_id;
        END IF;
    END IF;

    -- Verify Stay
    IF NEW.stay_id IS NOT NULL THEN
        SELECT property_id INTO v_stay_prop FROM public.stays WHERE id = NEW.stay_id;
        IF v_stay_prop IS NULL OR v_stay_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: stay % does not belong to property %', NEW.stay_id, NEW.property_id;
        END IF;
    END IF;

    -- Verify Assigned Staff (if assigned)
    IF NEW.assigned_to IS NOT NULL THEN
        -- Check A: staff_members directory entry for this property
        SELECT property_id INTO v_staff_prop
        FROM public.staff_members
        WHERE (id = NEW.assigned_to OR profile_id = NEW.assigned_to)
          AND property_id = NEW.property_id
          AND is_active = true
        LIMIT 1;

        -- Check B: direct property membership user_id
        IF v_staff_prop IS NULL THEN
            SELECT property_id INTO v_staff_prop
            FROM public.property_memberships
            WHERE user_id = NEW.assigned_to
              AND property_id = NEW.property_id
              AND status = 'active'
            LIMIT 1;
        END IF;

        -- Check C: property membership via profile auth_user_id
        IF v_staff_prop IS NULL THEN
            SELECT pm.property_id INTO v_staff_prop
            FROM public.property_memberships pm
            JOIN public.profiles p ON p.auth_user_id = pm.user_id
            WHERE p.id = NEW.assigned_to
              AND pm.property_id = NEW.property_id
              AND pm.status = 'active'
            LIMIT 1;
        END IF;

        -- Check D: any active staff member linked by email
        IF v_staff_prop IS NULL THEN
            SELECT sm.property_id INTO v_staff_prop
            FROM public.staff_members sm
            JOIN public.profiles p ON p.email = sm.email
            WHERE p.id = NEW.assigned_to
              AND sm.property_id = NEW.property_id
              AND sm.is_active = true
            LIMIT 1;
        END IF;

        IF v_staff_prop IS NULL THEN
            RAISE EXCEPTION 'Tenant Violation: assigned staff % does not belong to property %', NEW.assigned_to, NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Update staff_assign_guest_request RPC to support assigning any staff_member or profile
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
    v_actor_profile_id UUID;
    v_actor_name VARCHAR(100);
    v_old_status VARCHAR(30);
    v_staff_prop UUID;
    v_target_staff_name VARCHAR(150);
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
        -- Check staff_members directory
        SELECT property_id, COALESCE(display_name, TRIM(first_name || ' ' || COALESCE(last_name, '')))
        INTO v_staff_prop, v_target_staff_name
        FROM public.staff_members
        WHERE (id = p_assigned_to OR profile_id = p_assigned_to)
          AND property_id = p_property_id
          AND is_active = true
        LIMIT 1;

        -- Check property_memberships
        IF v_staff_prop IS NULL THEN
            SELECT pm.property_id, p.full_name
            INTO v_staff_prop, v_target_staff_name
            FROM public.property_memberships pm
            LEFT JOIN public.profiles p ON p.auth_user_id = pm.user_id OR p.id = pm.user_id
            WHERE (pm.user_id = p_assigned_to OR pm.user_id IN (SELECT auth_user_id FROM public.profiles WHERE id = p_assigned_to))
              AND pm.property_id = p_property_id
              AND pm.status = 'active'
            LIMIT 1;
        END IF;

        IF v_staff_prop IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'Assigned staff does not belong to this property.');
        END IF;
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
        COALESCE(p_notes, CASE WHEN v_target_staff_name IS NOT NULL THEN 'Assigned to ' || v_target_staff_name ELSE 'Request assigned to staff member' END)
    );

    RETURN jsonb_build_object('success', true, 'status', 'ASSIGNED', 'assigned_to', p_assigned_to, 'assigned_staff_name', v_target_staff_name);
END;
$$;
