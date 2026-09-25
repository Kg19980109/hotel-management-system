-- ============================================================
-- STAYHUB MIGRATION: GUEST QR TOKEN RESILIENCE & RESOLUTION
-- Enables raw_token persistence and robust resolution matching
-- ============================================================

ALTER TABLE public.guest_qr_codes 
ADD COLUMN IF NOT EXISTS raw_token TEXT;

-- RPC: create_guest_qr_code
CREATE OR REPLACE FUNCTION public.create_guest_qr_code(
    p_property_id UUID,
    p_qr_type VARCHAR(50),
    p_name VARCHAR(255),
    p_token_hash VARCHAR(64),
    p_room_id UUID DEFAULT NULL,
    p_restaurant_table_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_created_by UUID DEFAULT NULL,
    p_raw_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_qr public.guest_qr_codes;
BEGIN
    IF p_qr_type = 'ROOM' AND p_room_id IS NOT NULL THEN
        UPDATE public.guest_qr_codes
        SET is_active = false, updated_at = now()
        WHERE property_id = p_property_id
          AND room_id = p_room_id
          AND qr_type = 'ROOM'
          AND is_active = true;
    END IF;

    INSERT INTO public.guest_qr_codes (
        property_id,
        qr_type,
        name,
        token_hash,
        raw_token,
        room_id,
        restaurant_table_id,
        expires_at,
        is_active,
        created_by,
        updated_by
    )
    VALUES (
        p_property_id,
        p_qr_type,
        p_name,
        p_token_hash,
        p_raw_token,
        p_room_id,
        p_restaurant_table_id,
        p_expires_at,
        true,
        p_created_by,
        p_created_by
    )
    RETURNING * INTO v_new_qr;

    RETURN jsonb_build_object(
        'success', true,
        'qr_code', row_to_json(v_new_qr)
    );
END;
$$;

-- RPC: rotate_guest_qr_code
CREATE OR REPLACE FUNCTION public.rotate_guest_qr_code(
    p_qr_id UUID,
    p_property_id UUID,
    p_new_token_hash VARCHAR(64),
    p_updated_by UUID DEFAULT NULL,
    p_new_raw_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_qr public.guest_qr_codes;
BEGIN
    UPDATE public.guest_qr_codes
    SET token_hash = p_new_token_hash,
        raw_token = p_new_raw_token,
        is_active = true,
        updated_by = p_updated_by,
        updated_at = now()
    WHERE id = p_qr_id
      AND property_id = p_property_id
    RETURNING * INTO v_updated_qr;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'QR code not found or unauthorized');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'qr_code', row_to_json(v_updated_qr)
    );
END;
$$;

-- RPC: resolve_guest_qr_access
CREATE OR REPLACE FUNCTION public.resolve_guest_qr_access(
    p_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_qr public.guest_qr_codes;
    v_prop public.properties;
    v_room public.rooms;
    v_room_type_name VARCHAR(100);
    v_active_stay_exists BOOLEAN := false;
BEGIN
    -- 1. Find active, non-expired QR code matching either token_hash or raw_token or sha256
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
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'QR code is invalid or expired.'
        );
    END IF;

    -- 2. Fetch public property info
    SELECT * INTO v_prop
    FROM public.properties
    WHERE id = v_qr.property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Property not found.'
        );
    END IF;

    -- 3. If HOTEL_GENERAL
    IF v_qr.qr_type = 'HOTEL_GENERAL' THEN
        RETURN jsonb_build_object(
            'valid', true,
            'qr_type', 'HOTEL_GENERAL',
            'qr_id', v_qr.id,
            'property_id', v_prop.id,
            'property_name', COALESCE(v_prop.public_name, v_prop.name),
            'property_code', v_prop.property_code,
            'address', v_prop.address_line_1 || ', ' || v_prop.city,
            'city', v_prop.city,
            'phone', COALESCE(v_prop.public_phone, v_prop.phone),
            'email', COALESCE(v_prop.public_email, v_prop.email),
            'logo_url', v_prop.logo_url,
            'cover_image_url', v_prop.cover_image_url,
            'check_in_time', v_prop.check_in_time,
            'check_out_time', v_prop.check_out_time,
            'wifi_ssid', v_prop.wifi_ssid,
            'wifi_password', v_prop.wifi_password
        );
    END IF;

    -- 4. If ROOM
    IF v_qr.qr_type = 'ROOM' THEN
        SELECT * INTO v_room
        FROM public.rooms
        WHERE id = v_qr.room_id;

        IF v_room.room_type_id IS NOT NULL THEN
            SELECT name INTO v_room_type_name
            FROM public.room_types
            WHERE id = v_room.room_type_id;
        END IF;

        -- Check if active checked-in stay exists
        SELECT EXISTS (
            SELECT 1 FROM public.stays
            WHERE room_id = v_qr.room_id
              AND status = 'CHECKED_IN'
        ) INTO v_active_stay_exists;

        RETURN jsonb_build_object(
            'valid', true,
            'qr_type', 'ROOM',
            'qr_id', v_qr.id,
            'property_id', v_prop.id,
            'property_name', COALESCE(v_prop.public_name, v_prop.name),
            'property_code', v_prop.property_code,
            'room_id', v_room.id,
            'room_number', v_room.room_number,
            'room_type', v_room_type_name,
            'has_active_stay', v_active_stay_exists,
            'phone', COALESCE(v_prop.public_phone, v_prop.phone),
            'front_desk_phone', COALESCE(v_prop.front_desk_phone, v_prop.phone),
            'logo_url', v_prop.logo_url,
            'check_in_time', v_prop.check_in_time,
            'check_out_time', v_prop.check_out_time
        );
    END IF;

    RETURN jsonb_build_object(
        'valid', true,
        'qr_type', v_qr.qr_type,
        'property_id', v_prop.id,
        'property_name', COALESCE(v_prop.public_name, v_prop.name)
    );
END;
$$;

-- RPC: verify_and_create_guest_session
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

    -- 3. If ROOM, verify current checked-in stay
    IF v_qr.qr_type = 'ROOM' THEN
        SELECT * INTO v_stay
        FROM public.stays
        WHERE room_id = v_qr.room_id
          AND status = 'CHECKED_IN'
        LIMIT 1;

        IF NOT FOUND THEN
            RETURN jsonb_build_object('success', false, 'error', 'This room is not currently checked in.');
        END IF;

        -- Fetch reservation & guest
        SELECT * INTO v_res FROM public.reservations WHERE id = v_stay.reservation_id;
        SELECT * INTO v_guest FROM public.guests WHERE id = v_stay.guest_id;

        -- Clean inputs
        v_clean_conf := upper(trim(p_confirmation_number));
        
        -- Validate confirmation number match
        IF upper(trim(v_res.confirmation_number)) <> v_clean_conf THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unable to verify stay details with the provided information.');
        END IF;

        -- If last name also provided, validate match
        IF p_last_name IS NOT NULL AND length(trim(p_last_name)) > 0 THEN
            v_clean_last := upper(trim(p_last_name));
            IF upper(trim(v_guest.last_name)) <> v_clean_last THEN
                RETURN jsonb_build_object('success', false, 'error', 'Unable to verify stay details with the provided information.');
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
