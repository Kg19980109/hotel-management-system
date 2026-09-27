-- Migration: Fix Front Desk check_out_stay foreign key resolution
-- Resolves profile ID vs auth_user_id mapping for guest_folios, folio_events, stays, and rooms

CREATE OR REPLACE FUNCTION public.check_out_stay(
    p_stay_id UUID,
    p_property_id UUID,
    p_allow_unpaid_override BOOLEAN DEFAULT false,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_auth_user_id UUID;
    v_profile_id UUID := NULL;
    v_has_role BOOLEAN;
    v_stay RECORD;
    v_folio RECORD;
    v_balance_info JSONB;
    v_balance_due NUMERIC(12,2) := 0.00;
    v_uncompleted_rooms_count INTEGER;
    v_active_task_exists BOOLEAN;
BEGIN
    -- 1. Resolve auth_user_id and profile_id robustly
    v_auth_user_id := auth.uid();

    IF p_performed_by IS NOT NULL THEN
        -- Check if p_performed_by is a profile id
        SELECT id, auth_user_id INTO v_profile_id, v_auth_user_id
        FROM public.profiles
        WHERE id = p_performed_by
        LIMIT 1;

        -- If not found as profile id, check if it is an auth_user_id
        IF v_profile_id IS NULL THEN
            SELECT id, auth_user_id INTO v_profile_id, v_auth_user_id
            FROM public.profiles
            WHERE auth_user_id = p_performed_by
            LIMIT 1;
            
            IF v_auth_user_id IS NULL THEN
                v_auth_user_id := p_performed_by;
            END IF;
        END IF;
    END IF;

    IF v_profile_id IS NULL THEN
        IF v_auth_user_id IS NOT NULL THEN
            SELECT id INTO v_profile_id
            FROM public.profiles
            WHERE auth_user_id = v_auth_user_id
            LIMIT 1;
        ELSIF auth.uid() IS NOT NULL THEN
            v_auth_user_id := auth.uid();
            SELECT id INTO v_profile_id
            FROM public.profiles
            WHERE auth_user_id = v_auth_user_id
            LIMIT 1;
        END IF;
    END IF;

    -- Role Validation
    IF v_auth_user_id IS NOT NULL THEN
        v_has_role := public.user_has_property_role(
            v_auth_user_id,
            p_property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
        );

        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Unauthorized: front desk check-out permissions required';
        END IF;
    END IF;

    -- 2. Fetch & Validate Stay
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = p_stay_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stay record % not found for property %', p_stay_id, p_property_id;
    END IF;

    IF v_stay.status <> 'CHECKED_IN' THEN
        RAISE EXCEPTION 'Cannot check out stay with status % (must be CHECKED_IN)', v_stay.status;
    END IF;

    -- 3. Check Financial Settlement on Active Folio
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE stay_id = p_stay_id AND property_id = p_property_id AND status IN ('OPEN', 'SETTLED')
    LIMIT 1;

    IF FOUND THEN
        v_balance_info := public.get_folio_balance(v_folio.id, p_property_id);
        v_balance_due := (v_balance_info->>'balance_due')::numeric;

        IF v_balance_due > 0 AND NOT p_allow_unpaid_override THEN
            RAISE EXCEPTION 'Cannot complete checkout: Outstanding folio balance of % % must be settled or authorized with override.',
                v_folio.currency, v_balance_due;
        END IF;

        -- Close/Settle Folio upon checkout
        UPDATE public.guest_folios
        SET 
            status = CASE WHEN v_balance_due <= 0 THEN 'CLOSED' ELSE 'SETTLED' END,
            closed_at = now(),
            updated_by = v_profile_id,
            updated_at = now()
        WHERE id = v_folio.id;

        -- Record Audit Event
        INSERT INTO public.folio_events (
            property_id,
            folio_id,
            event_type,
            actor_type,
            actor_profile_id,
            event_data
        ) VALUES (
            p_property_id,
            v_folio.id,
            'CHECKOUT_SETTLEMENT',
            'STAFF',
            v_profile_id,
            jsonb_build_object(
                'stay_id', p_stay_id,
                'balance_due', v_balance_due,
                'override_used', p_allow_unpaid_override
            )
        );
    END IF;

    -- 4. Update Stay to CHECKED_OUT
    UPDATE public.stays
    SET 
        status = 'CHECKED_OUT',
        actual_check_out_at = now(),
        check_out_by = v_auth_user_id,
        updated_by = v_auth_user_id,
        updated_at = now()
    WHERE id = p_stay_id;

    -- 5. Transition Room Status to DIRTY (Housekeeping Lifecycle Start) & Trigger Housekeeping Task
    IF v_stay.room_id IS NOT NULL THEN
        UPDATE public.rooms
        SET 
            status = 'DIRTY',
            housekeeping_status = 'DIRTY',
            updated_by = v_auth_user_id,
            updated_at = now()
        WHERE id = v_stay.room_id;

        SELECT EXISTS (
            SELECT 1 FROM public.housekeeping_tasks
            WHERE room_id = v_stay.room_id
              AND task_type = 'CLEANING'
              AND status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING')
        ) INTO v_active_task_exists;

        IF NOT v_active_task_exists THEN
            INSERT INTO public.housekeeping_tasks (
                property_id,
                room_id,
                task_type,
                status,
                priority,
                scheduled_for,
                notes,
                created_by
            ) VALUES (
                p_property_id,
                v_stay.room_id,
                'CLEANING',
                'PENDING',
                'NORMAL',
                CURRENT_DATE,
                'Automatic checkout cleaning task generated',
                v_auth_user_id
            );
        END IF;
    END IF;

    -- 6. Multi-room Parent Reservation Completion Check
    SELECT count(*) INTO v_uncompleted_rooms_count
    FROM public.reservation_rooms rr
    WHERE rr.reservation_id = v_stay.reservation_id
      AND rr.is_cancelled = false
      AND NOT EXISTS (
          SELECT 1 FROM public.stays s 
          WHERE s.reservation_room_id = rr.id AND s.status = 'CHECKED_OUT'
      );

    IF v_uncompleted_rooms_count = 0 THEN
        UPDATE public.reservations
        SET 
            status = 'COMPLETED',
            updated_by = v_auth_user_id,
            updated_at = now()
        WHERE id = v_stay.reservation_id;
    END IF;

    -- 7. Invalidate Active Guest QR Sessions for this Stay
    UPDATE public.guest_sessions
    SET revoked_at = now(), updated_at = now()
    WHERE stay_id = p_stay_id AND revoked_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'stay_id', p_stay_id,
        'status', 'CHECKED_OUT',
        'balance_due', v_balance_due
    );
END;
$$;
