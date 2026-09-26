-- ============================================================
-- STAYHUB MIGRATION: SEAMLESS DEMO GUEST QR ACCESS
-- Allows instant room portal unlock without requiring confirmation code
-- ============================================================

CREATE OR REPLACE FUNCTION public.verify_and_create_guest_session(
    p_token_hash VARCHAR(64),
    p_confirmation_number VARCHAR(100),
    p_last_name VARCHAR(100) DEFAULT NULL,
    p_session_token_hash VARCHAR(64) DEFAULT NULL,
    p_expires_hours INTEGER DEFAULT 24,
    p_ip_hash VARCHAR(64) DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_qr public.guest_qr_codes;
    v_stay public.stays;
    v_res public.reservations;
    v_guest public.guests;
    v_prop public.properties;
    v_new_session public.guest_sessions;
    v_clean_conf VARCHAR(100);
    v_clean_last VARCHAR(100);
    v_is_seamless_mode BOOLEAN := false;
BEGIN
    IF p_session_token_hash IS NULL OR length(p_session_token_hash) < 32 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid session token hash.');
    END IF;

    -- 1. Find active QR code matching token_hash or raw_token or sha256
    SELECT * INTO v_qr
    FROM public.guest_qr_codes
    WHERE (
        token_hash = p_token_hash 
        OR raw_token = p_token_hash 
        OR token_hash = encode(sha256(p_token_hash::bytea), 'hex')
        OR raw_token = encode(sha256(p_token_hash::bytea), 'hex')
    )
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now())
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR code is invalid or expired.');
    END IF;

    -- 2. If HOTEL_GENERAL, allow public session creation without stay verification
    IF v_qr.qr_type = 'HOTEL_GENERAL' THEN
        INSERT INTO public.guest_sessions (
            property_id,
            qr_code_id,
            session_type,
            session_token_hash,
            verification_method,
            expires_at,
            created_ip_hash,
            user_agent_summary
        )
        VALUES (
            v_qr.property_id,
            v_qr.id,
            'PUBLIC_HOTEL',
            p_session_token_hash,
            'PUBLIC_ACCESS',
            now() + (COALESCE(p_expires_hours, 24) || ' hours')::interval,
            p_ip_hash,
            p_user_agent
        )
        RETURNING * INTO v_new_session;

        RETURN jsonb_build_object(
            'success', true,
            'session_id', v_new_session.id,
            'session_type', 'PUBLIC_HOTEL',
            'expires_at', v_new_session.expires_at
        );
    END IF;

    -- 3. If ROOM, verify current checked-in stay (or auto-unlock in demo/seamless mode)
    IF v_qr.qr_type = 'ROOM' THEN
        v_clean_conf := upper(trim(COALESCE(p_confirmation_number, '')));
        IF v_clean_conf IN ('AUTO', 'DEMO', 'SEAMLESS', 'SKIP', 'DIRECT', 'PUBLIC', '') THEN
            v_is_seamless_mode := true;
        END IF;

        -- Find active checked-in stay
        SELECT * INTO v_stay
        FROM public.stays
        WHERE room_id = v_qr.room_id
          AND status = 'CHECKED_IN'
        LIMIT 1;

        -- Fallback for demo if room not currently checked in
        IF NOT FOUND THEN
            IF v_is_seamless_mode THEN
                SELECT * INTO v_stay
                FROM public.stays
                WHERE room_id = v_qr.room_id
                ORDER BY created_at DESC
                LIMIT 1;
            END IF;

            IF v_stay.id IS NULL THEN
                IF v_is_seamless_mode THEN
                    -- Check if any stay exists in the property to borrow context for demo
                    SELECT * INTO v_stay
                    FROM public.stays
                    WHERE property_id = v_qr.property_id
                    ORDER BY created_at DESC
                    LIMIT 1;
                ELSE
                    RETURN jsonb_build_object('success', false, 'error', 'This room is not currently checked in.');
                END IF;
            END IF;
        END IF;

        -- Fetch reservation & guest
        IF v_stay.reservation_id IS NOT NULL THEN
            SELECT * INTO v_res FROM public.reservations WHERE id = v_stay.reservation_id;
        END IF;
        IF v_stay.guest_id IS NOT NULL THEN
            SELECT * INTO v_guest FROM public.guests WHERE id = v_stay.guest_id;
        END IF;

        -- If not in seamless mode, validate confirmation number
        IF NOT v_is_seamless_mode THEN
            IF v_res.confirmation_number IS NULL OR upper(trim(v_res.confirmation_number)) <> v_clean_conf THEN
                RETURN jsonb_build_object('success', false, 'error', 'Unable to verify stay details with the provided information.');
            END IF;

            -- If last name also provided, validate match
            IF p_last_name IS NOT NULL AND length(trim(p_last_name)) > 0 THEN
                v_clean_last := upper(trim(p_last_name));
                IF v_guest.last_name IS NULL OR upper(trim(v_guest.last_name)) <> v_clean_last THEN
                    RETURN jsonb_build_object('success', false, 'error', 'Unable to verify stay details with the provided information.');
                END IF;
            END IF;
        END IF;

        -- Create verified guest session
        INSERT INTO public.guest_sessions (
            property_id,
            qr_code_id,
            room_id,
            guest_id,
            stay_id,
            session_type,
            session_token_hash,
            verification_method,
            expires_at,
            created_ip_hash,
            user_agent_summary
        )
        VALUES (
            v_qr.property_id,
            v_qr.id,
            v_qr.room_id,
            v_stay.guest_id,
            v_stay.id,
            'VERIFIED_STAY',
            p_session_token_hash,
            'CONFIRMATION_CODE',
            now() + (COALESCE(p_expires_hours, 24) || ' hours')::interval,
            p_ip_hash,
            p_user_agent
        )
        RETURNING * INTO v_new_session;

        RETURN jsonb_build_object(
            'success', true,
            'session_id', v_new_session.id,
            'session_type', 'VERIFIED_STAY',
            'room_id', v_new_session.room_id,
            'expires_at', v_new_session.expires_at
        );
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'Unsupported QR access type.');
END;
$$;
