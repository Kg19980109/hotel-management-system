-- ============================================================
-- STAYHUB MIGRATION 07: RESERVATION LEDGER & GUEST FOUNDATION
-- Phase 7: Guests, Reservations, Reservation Rooms & Concurrency
-- ============================================================

-- Ensure btree_gist extension is available for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. GUESTS FOUNDATION TABLE
-- Minimal property-scoped guest entity for reservation bookings
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    country_code VARCHAR(10),
    nationality VARCHAR(100),
    date_of_birth DATE,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guests_property_id ON public.guests(property_id);
CREATE INDEX IF NOT EXISTS idx_guests_property_email ON public.guests(property_id, email);
CREATE INDEX IF NOT EXISTS idx_guests_property_phone ON public.guests(property_id, phone);
CREATE INDEX IF NOT EXISTS idx_guests_property_name ON public.guests(property_id, last_name, first_name);

-- 2. RESERVATIONS TABLE
-- Main reservation commitment ledger
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    confirmation_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'CONFIRMED'
        CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'NO_SHOW', 'COMPLETED')),
    booking_source VARCHAR(50) NOT NULL DEFAULT 'DIRECT'
        CHECK (booking_source IN ('DIRECT', 'WALK_IN', 'PHONE', 'EMAIL', 'WEBSITE', 'OTA', 'CORPORATE', 'TRAVEL_AGENT', 'OTHER')),
    booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
    children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
    special_requests TEXT,
    internal_notes TEXT,
    primary_guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_reservations_property_confirmation UNIQUE (property_id, confirmation_number),
    CONSTRAINT chk_reservations_dates CHECK (check_out_date > check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_reservations_property_id ON public.reservations(property_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON public.reservations(property_id, status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON public.reservations(property_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON public.reservations(property_id, primary_guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_confirmation ON public.reservations(property_id, confirmation_number);
CREATE INDEX IF NOT EXISTS idx_reservations_source ON public.reservations(property_id, booking_source);

-- 3. RESERVATION ROOMS TABLE
-- Details each room booked under a reservation (supports multi-room and room-type requests)
CREATE TABLE IF NOT EXISTS public.reservation_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE RESTRICT,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    is_cancelled BOOLEAN NOT NULL DEFAULT false,
    adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
    children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
    nightly_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (nightly_rate >= 0),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_res_rooms_dates CHECK (check_out_date > check_in_date)
);

-- PostgreSQL Exclusion Constraint:
-- Physically guarantees no two active bookings for the same room overlap on [check_in_date, check_out_date)
ALTER TABLE public.reservation_rooms
DROP CONSTRAINT IF EXISTS uq_no_overlapping_room_bookings;

ALTER TABLE public.reservation_rooms
ADD CONSTRAINT uq_no_overlapping_room_bookings
EXCLUDE USING gist (
    room_id WITH =,
    daterange(check_in_date, check_out_date, '[)') WITH &&
)
WHERE (room_id IS NOT NULL AND NOT is_cancelled);

CREATE INDEX IF NOT EXISTS idx_res_rooms_reservation_id ON public.reservation_rooms(reservation_id);
CREATE INDEX IF NOT EXISTS idx_res_rooms_property_id ON public.reservation_rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_res_rooms_room_id ON public.reservation_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_res_rooms_room_type_id ON public.reservation_rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_res_rooms_dates ON public.reservation_rooms(check_in_date, check_out_date);

-- ============================================================
-- 4. CROSS-TENANT INTEGRITY & SYNC TRIGGERS
-- ============================================================

-- Function to check reservation tenant consistency (primary_guest belongs to property)
CREATE OR REPLACE FUNCTION public.check_reservation_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.guests 
        WHERE id = NEW.primary_guest_id AND property_id = NEW.property_id
    ) THEN
        RAISE EXCEPTION 'Cross-tenant violation: primary_guest_id % does not belong to property_id %', 
            NEW.primary_guest_id, NEW.property_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_reservation_tenant_consistency ON public.reservations;
CREATE TRIGGER trg_check_reservation_tenant_consistency
BEFORE INSERT OR UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.check_reservation_tenant_consistency();

-- Function to check reservation_room tenant consistency
CREATE OR REPLACE FUNCTION public.check_reservation_room_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_res_property_id UUID;
    v_room_property_id UUID;
    v_room_type_id UUID;
BEGIN
    -- Verify reservation belongs to same property
    SELECT property_id INTO v_res_property_id 
    FROM public.reservations 
    WHERE id = NEW.reservation_id;

    IF v_res_property_id IS NULL OR v_res_property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: reservation_id % belongs to property %, but room item specifies property %', 
            NEW.reservation_id, v_res_property_id, NEW.property_id;
    END IF;

    -- Verify room_type belongs to same property
    IF NOT EXISTS (
        SELECT 1 FROM public.room_types 
        WHERE id = NEW.room_type_id AND property_id = NEW.property_id
    ) THEN
        RAISE EXCEPTION 'Cross-tenant violation: room_type_id % does not belong to property_id %', 
            NEW.room_type_id, NEW.property_id;
    END IF;

    -- Verify room (if assigned) belongs to same property and matches room_type
    IF NEW.room_id IS NOT NULL THEN
        SELECT property_id, room_type_id INTO v_room_property_id, v_room_type_id
        FROM public.rooms 
        WHERE id = NEW.room_id;

        IF v_room_property_id IS NULL OR v_room_property_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Cross-tenant violation: room_id % does not belong to property_id %', 
                NEW.room_id, NEW.property_id;
        END IF;

        IF v_room_type_id <> NEW.room_type_id THEN
            RAISE EXCEPTION 'Room type mismatch: room_id % is of type %, but requested type is %', 
                NEW.room_id, v_room_type_id, NEW.room_type_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_reservation_room_tenant_consistency ON public.reservation_rooms;
CREATE TRIGGER trg_check_reservation_room_tenant_consistency
BEFORE INSERT OR UPDATE ON public.reservation_rooms
FOR EACH ROW
EXECUTE FUNCTION public.check_reservation_room_tenant_consistency();

-- Function to sync reservation changes (dates, cancellation) to reservation_rooms
CREATE OR REPLACE FUNCTION public.sync_reservation_to_rooms()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.reservation_rooms
    SET 
        check_in_date = NEW.check_in_date,
        check_out_date = NEW.check_out_date,
        is_cancelled = (NEW.status = 'CANCELLED'),
        updated_at = now()
    WHERE reservation_id = NEW.id;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_reservation_to_rooms ON public.reservations;
CREATE TRIGGER trg_sync_reservation_to_rooms
AFTER UPDATE OF check_in_date, check_out_date, status ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.sync_reservation_to_rooms();

-- ============================================================
-- 5. CONFIRMATION NUMBER GENERATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_reservation_confirmation_number(p_property_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
AS $$
DECLARE
    v_year VARCHAR(4);
    v_code VARCHAR(50);
    v_exists BOOLEAN;
    v_attempts INTEGER := 0;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YY');

    LOOP
        v_attempts := v_attempts + 1;
        -- Format: STH-YY-XXXXXX (e.g. STH-26-8K2F94)
        v_code := 'STH-' || v_year || '-' || UPPER(substring(replace(gen_random_uuid()::text, '-', ''), 1, 6));

        SELECT EXISTS (
            SELECT 1 FROM public.reservations 
            WHERE property_id = p_property_id AND confirmation_number = v_code
        ) INTO v_exists;

        IF NOT v_exists THEN
            RETURN v_code;
        END IF;

        IF v_attempts > 10 THEN
            -- Fallback with timestamp microsecond
            RETURN 'STH-' || v_year || '-' || to_char(clock_timestamp(), 'HH24MISSMS');
        END IF;
    END LOOP;
END;
$$;
