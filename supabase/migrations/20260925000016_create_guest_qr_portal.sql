-- ============================================================
-- STAYHUB MIGRATION 16: QR GUEST PORTAL & SECURE GUEST SESSIONS
-- Phase 14: QR Guest Portal & Secure Guest Session Foundation
-- ============================================================

-- 1. PUBLIC PROPERTY EXTENSIONS FOR GUEST-FACING DIRECTORY
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS public_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS public_description TEXT,
ADD COLUMN IF NOT EXISTS public_phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS public_email VARCHAR(255),
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS wifi_ssid VARCHAR(100),
ADD COLUMN IF NOT EXISTS wifi_password VARCHAR(100),
ADD COLUMN IF NOT EXISTS front_desk_phone VARCHAR(50);

-- 2. GUEST QR CODES (ACCESS POINTS)
CREATE TABLE IF NOT EXISTS public.guest_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    qr_type VARCHAR(50) NOT NULL CHECK (qr_type IN ('ROOM', 'HOTEL_GENERAL', 'RESTAURANT_TABLE', 'OTHER')),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    restaurant_table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_qr_room_requires_room_id CHECK (qr_type <> 'ROOM' OR room_id IS NOT NULL),
    CONSTRAINT chk_qr_table_requires_table_id CHECK (qr_type <> 'RESTAURANT_TABLE' OR restaurant_table_id IS NOT NULL)
);

-- Indexes for Guest QR Codes
CREATE INDEX IF NOT EXISTS idx_guest_qr_codes_property_id ON public.guest_qr_codes(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_qr_codes_token_hash ON public.guest_qr_codes(token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_qr_codes_room_id ON public.guest_qr_codes(room_id);
CREATE INDEX IF NOT EXISTS idx_guest_qr_codes_table_id ON public.guest_qr_codes(restaurant_table_id);
CREATE INDEX IF NOT EXISTS idx_guest_qr_codes_is_active ON public.guest_qr_codes(property_id, is_active);

-- 3. GUEST SESSIONS
CREATE TABLE IF NOT EXISTS public.guest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    qr_code_id UUID REFERENCES public.guest_qr_codes(id) ON DELETE SET NULL,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
    stay_id UUID REFERENCES public.stays(id) ON DELETE CASCADE,
    session_type VARCHAR(50) NOT NULL DEFAULT 'VERIFIED_STAY'
        CHECK (session_type IN ('VERIFIED_STAY', 'PUBLIC_HOTEL')),
    session_token_hash VARCHAR(64) NOT NULL UNIQUE,
    verification_method VARCHAR(50) NOT NULL DEFAULT 'CONFIRMATION_CODE'
        CHECK (verification_method IN ('CONFIRMATION_CODE', 'LASTNAME_CONFIRMATION', 'PUBLIC_ACCESS', 'FRONT_DESK_DIRECT')),
    expires_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ,
    created_ip_hash VARCHAR(64),
    user_agent_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for Guest Sessions
CREATE INDEX IF NOT EXISTS idx_guest_sessions_token_hash ON public.guest_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_property_id ON public.guest_sessions(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_stay_id ON public.guest_sessions(stay_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_guest_id ON public.guest_sessions(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_room_id ON public.guest_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_active ON public.guest_sessions(expires_at, revoked_at);

-- ============================================================
-- 4. CROSS-TENANT INTEGRITY TRIGGERS
-- ============================================================

-- QR Codes Tenant Consistency
CREATE OR REPLACE FUNCTION public.check_guest_qr_code_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_room_prop UUID;
    v_table_prop UUID;
BEGIN
    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id INTO v_room_prop FROM public.rooms WHERE id = NEW.room_id;
        IF v_room_prop IS NULL OR v_room_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: room % does not belong to property %',
                NEW.room_id, NEW.property_id;
        END IF;
    END IF;

    IF NEW.restaurant_table_id IS NOT NULL THEN
        SELECT r.property_id INTO v_table_prop
        FROM public.restaurant_tables rt
        JOIN public.restaurants r ON rt.restaurant_id = r.id
        WHERE rt.id = NEW.restaurant_table_id;

        IF v_table_prop IS NULL OR v_table_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: restaurant table % does not belong to property %',
                NEW.restaurant_table_id, NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_guest_qr_code_tenant ON public.guest_qr_codes;
CREATE TRIGGER trg_check_guest_qr_code_tenant
BEFORE INSERT OR UPDATE ON public.guest_qr_codes
FOR EACH ROW
EXECUTE FUNCTION public.check_guest_qr_code_tenant();

-- Guest Sessions Tenant Consistency
CREATE OR REPLACE FUNCTION public.check_guest_session_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stay_prop UUID;
    v_guest_prop UUID;
    v_room_prop UUID;
BEGIN
    IF NEW.stay_id IS NOT NULL THEN
        SELECT property_id INTO v_stay_prop FROM public.stays WHERE id = NEW.stay_id;
        IF v_stay_prop IS NULL OR v_stay_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: stay % does not belong to property %',
                NEW.stay_id, NEW.property_id;
        END IF;
    END IF;

    IF NEW.guest_id IS NOT NULL THEN
        SELECT property_id INTO v_guest_prop FROM public.guests WHERE id = NEW.guest_id;
        IF v_guest_prop IS NULL OR v_guest_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: guest % does not belong to property %',
                NEW.guest_id, NEW.property_id;
        END IF;
    END IF;

    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id INTO v_room_prop FROM public.rooms WHERE id = NEW.room_id;
        IF v_room_prop IS NULL OR v_room_prop <> NEW.property_id THEN
            RAISE EXCEPTION 'Tenant Violation: room % does not belong to property %',
                NEW.room_id, NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_guest_session_tenant ON public.guest_sessions;
CREATE TRIGGER trg_check_guest_session_tenant
BEFORE INSERT OR UPDATE ON public.guest_sessions
FOR EACH ROW
EXECUTE FUNCTION public.check_guest_session_tenant();

-- ============================================================
-- 5. ATOMIC QR & GUEST SESSION RPCs
-- ============================================================

-- RPC: create_guest_qr_code
CREATE OR REPLACE FUNCTION public.create_guest_qr_code(
    p_property_id UUID,
    p_qr_type VARCHAR(50),
    p_name VARCHAR(255),
    p_token_hash VARCHAR(64),
    p_room_id UUID DEFAULT NULL,
    p_restaurant_table_id UUID DEFAULT NULL,
    p_expires_at TIMESTAMPTZ DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_qr public.guest_qr_codes;
BEGIN
    -- If room QR, optionally deactivate any older active QR code for that exact room
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
    p_updated_by UUID DEFAULT NULL
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

-- RPC: deactivate_guest_qr_code
CREATE OR REPLACE FUNCTION public.deactivate_guest_qr_code(
    p_qr_id UUID,
    p_property_id UUID,
    p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_updated_qr public.guest_qr_codes;
BEGIN
    UPDATE public.guest_qr_codes
    SET is_active = false,
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
-- Publicly callable resolver. Does NOT expose any sensitive guest/stay information.
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
    -- 1. Find active, non-expired QR code
    SELECT * INTO v_qr
    FROM public.guest_qr_codes
    WHERE token_hash = p_token_hash
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());

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
-- Validates confirmation number against current checked-in stay and issues a guest session.
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

    -- 1. Find active QR code
    SELECT * INTO v_qr
    FROM public.guest_qr_codes
    WHERE token_hash = p_token_hash
      AND is_active = true
      AND (expires_at IS NULL OR expires_at > now());

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

-- RPC: validate_guest_session
-- Validates session token and active checked-in status; returns only guest-safe context.
CREATE OR REPLACE FUNCTION public.validate_guest_session(
    p_session_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session public.guest_sessions;
    v_prop public.properties;
    v_room public.rooms;
    v_room_type_name VARCHAR(100);
    v_stay public.stays;
    v_guest public.guests;
BEGIN
    -- 1. Find session
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND expires_at > now()
      AND revoked_at IS NULL;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Guest session is invalid, expired, or revoked.');
    END IF;

    -- Update last_seen_at
    UPDATE public.guest_sessions
    SET last_seen_at = now()
    WHERE id = v_session.id;

    -- Fetch property
    SELECT * INTO v_prop FROM public.properties WHERE id = v_session.property_id;

    -- 2. If PUBLIC_HOTEL session
    IF v_session.session_type = 'PUBLIC_HOTEL' THEN
        RETURN jsonb_build_object(
            'valid', true,
            'session_id', v_session.id,
            'session_type', 'PUBLIC_HOTEL',
            'property_id', v_prop.id,
            'property_name', COALESCE(v_prop.public_name, v_prop.name),
            'phone', COALESCE(v_prop.public_phone, v_prop.phone),
            'email', COALESCE(v_prop.public_email, v_prop.email),
            'address', v_prop.address_line_1 || ', ' || v_prop.city,
            'city', v_prop.city,
            'check_in_time', v_prop.check_in_time,
            'check_out_time', v_prop.check_out_time,
            'logo_url', v_prop.logo_url,
            'cover_image_url', v_prop.cover_image_url,
            'wifi_ssid', v_prop.wifi_ssid,
            'wifi_password', v_prop.wifi_password,
            'amenities', COALESCE(v_prop.amenities, '[]'::jsonb)
        );
    END IF;

    -- 3. If VERIFIED_STAY session
    IF v_session.session_type = 'VERIFIED_STAY' THEN
        -- Check if stay is STILL checked in!
        SELECT * INTO v_stay
        FROM public.stays
        WHERE id = v_session.stay_id
          AND status = 'CHECKED_IN';

        IF NOT FOUND THEN
            RETURN jsonb_build_object('valid', false, 'error', 'Stay has ended or guest has checked out.');
        END IF;

        -- Fetch guest & room
        SELECT * INTO v_guest FROM public.guests WHERE id = v_session.guest_id;
        SELECT * INTO v_room FROM public.rooms WHERE id = v_session.room_id;

        IF v_room.room_type_id IS NOT NULL THEN
            SELECT name INTO v_room_type_name FROM public.room_types WHERE id = v_room.room_type_id;
        END IF;

        RETURN jsonb_build_object(
            'valid', true,
            'session_id', v_session.id,
            'session_type', 'VERIFIED_STAY',
            'property_id', v_prop.id,
            'property_name', COALESCE(v_prop.public_name, v_prop.name),
            'phone', COALESCE(v_prop.public_phone, v_prop.phone),
            'front_desk_phone', COALESCE(v_prop.front_desk_phone, v_prop.phone),
            'email', COALESCE(v_prop.public_email, v_prop.email),
            'address', v_prop.address_line_1 || ', ' || v_prop.city,
            'city', v_prop.city,
            'logo_url', v_prop.logo_url,
            'cover_image_url', v_prop.cover_image_url,
            'wifi_ssid', v_prop.wifi_ssid,
            'wifi_password', v_prop.wifi_password,
            'amenities', COALESCE(v_prop.amenities, '[]'::jsonb),
            -- Safe Stay Context (NO CRM notes, NO ID numbers, NO internal notes)
            'room_id', v_room.id,
            'room_number', v_room.room_number,
            'room_type', v_room_type_name,
            'guest_first_name', v_guest.first_name,
            'guest_last_name', v_guest.last_name,
            'check_in_date', v_stay.actual_check_in_at,
            'expected_check_out_date', v_stay.expected_check_out_date,
            'adults', v_stay.adults,
            'children', v_stay.children,
            'check_in_time', v_prop.check_in_time,
            'check_out_time', v_prop.check_out_time
        );
    END IF;

    RETURN jsonb_build_object('valid', false, 'error', 'Unknown session type.');
END;
$$;

-- RPC: revoke_guest_session
CREATE OR REPLACE FUNCTION public.revoke_guest_session(
    p_session_id UUID,
    p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.guest_sessions
    SET revoked_at = now(),
        updated_at = now()
    WHERE id = p_session_id
      AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Session not found or unauthorized.');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.guest_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_sessions ENABLE ROW LEVEL SECURITY;

-- Staff policies on guest_qr_codes
DROP POLICY IF EXISTS "Staff can manage guest_qr_codes for their property" ON public.guest_qr_codes;
CREATE POLICY "Staff can manage guest_qr_codes for their property"
ON public.guest_qr_codes
FOR ALL
TO authenticated
USING (public.user_belongs_to_property(auth.uid(), property_id))
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

-- Staff policies on guest_sessions
DROP POLICY IF EXISTS "Staff can view guest_sessions for their property" ON public.guest_sessions;
CREATE POLICY "Staff can view guest_sessions for their property"
ON public.guest_sessions
FOR SELECT
TO authenticated
USING (public.user_belongs_to_property(auth.uid(), property_id));

DROP POLICY IF EXISTS "Staff can update/revoke guest_sessions for their property" ON public.guest_sessions;
CREATE POLICY "Staff can update/revoke guest_sessions for their property"
ON public.guest_sessions
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_property(auth.uid(), property_id))
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));
