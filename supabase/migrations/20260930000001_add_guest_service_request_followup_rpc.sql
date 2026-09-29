-- ============================================================
-- STAYHUB MIGRATION: ADD GUEST SERVICE REQUEST FOLLOW-UP RPC & EXPOSE EVENT NOTES
-- Allows guests to send live follow-up notes/instructions to staff and persist in DB
-- ============================================================

CREATE OR REPLACE FUNCTION public.add_guest_service_request_follow_up(
    p_session_token_hash VARCHAR(64),
    p_request_id UUID,
    p_note TEXT
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
    v_event_id UUID;
    v_updated_description TEXT;
BEGIN
    IF p_note IS NULL OR TRIM(p_note) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Note cannot be empty.');
    END IF;

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

    SELECT * INTO v_guest FROM public.guests WHERE id = v_session.guest_id;

    -- Insert timeline event
    INSERT INTO public.guest_service_request_events (
        property_id,
        request_id,
        event_type,
        from_status,
        to_status,
        actor_type,
        actor_profile_id,
        actor_name,
        event_note,
        created_at
    ) VALUES (
        v_req.property_id,
        v_req.id,
        'NOTE_ADDED',
        v_req.status,
        v_req.status,
        'GUEST',
        NULL,
        COALESCE(TRIM(v_guest.first_name || ' ' || COALESCE(v_guest.last_name, '')), 'Guest'),
        TRIM(p_note),
        now()
    ) RETURNING id INTO v_event_id;

    -- Append note to request description so staff sees it prominently in operational queues
    v_updated_description := COALESCE(v_req.description, '') || 
        CASE WHEN COALESCE(v_req.description, '') <> '' THEN E'\n\n' ELSE '' END || 
        '• [Guest Note @ ' || to_char(now() AT TIME ZONE 'Asia/Kolkata', 'HH12:MI AM') || ']: ' || TRIM(p_note);

    UPDATE public.guest_service_requests
    SET description = v_updated_description,
        updated_at = now()
    WHERE id = v_req.id;

    RETURN jsonb_build_object(
        'success', true,
        'event_id', v_event_id,
        'created_at', now()
    );
END;
$$;

-- Update get_guest_service_request_detail to expose actor_name and event_note for guest portal chat
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
    v_assigned_staff_name VARCHAR(150);
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

    -- Resolve friendly staff name if assigned
    IF v_req.assigned_to IS NOT NULL THEN
        SELECT COALESCE(sm.display_name, NULLIF(TRIM(sm.first_name || ' ' || COALESCE(sm.last_name, '')), ''), p.full_name)
        INTO v_assigned_staff_name
        FROM public.profiles p
        LEFT JOIN public.staff_members sm ON (sm.profile_id = p.id OR sm.id = v_req.assigned_to) AND sm.property_id = v_session.property_id
        WHERE p.id = v_req.assigned_to OR p.auth_user_id = v_req.assigned_to OR sm.id = v_req.assigned_to
        LIMIT 1;

        IF v_assigned_staff_name IS NULL THEN
            SELECT COALESCE(display_name, NULLIF(TRIM(first_name || ' ' || COALESCE(last_name, '')), ''))
            INTO v_assigned_staff_name
            FROM public.staff_members
            WHERE (id = v_req.assigned_to OR profile_id = v_req.assigned_to) AND property_id = v_session.property_id
            LIMIT 1;
        END IF;
    END IF;

    -- Fetch guest-safe timeline events including notes and actor_name
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', e.id,
            'event_type', e.event_type,
            'from_status', e.from_status,
            'to_status', e.to_status,
            'actor_type', e.actor_type,
            'actor_name', e.actor_name,
            'event_note', e.event_note,
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
            'assigned_staff_name', v_assigned_staff_name,
            'assigned_department', v_req.assigned_department,
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
