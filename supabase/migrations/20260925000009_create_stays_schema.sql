-- ============================================================
-- STAYHUB MIGRATION 09: STAYS SCHEMA & OCCUPANCY LIFECYCLE
-- Phase 8: Front Desk, Stay Lifecycle, Check-in / Check-out
-- ============================================================

-- 1. STAYS TABLE
-- Represents the actual in-house guest occupancy lifecycle.
-- Strictly decoupled from commercial reservations and physical inventory.
CREATE TABLE IF NOT EXISTS public.stays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    reservation_room_id UUID REFERENCES public.reservation_rooms(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'EXPECTED'
        CHECK (status IN ('EXPECTED', 'CHECKED_IN', 'CHECKED_OUT', 'NO_SHOW', 'CANCELLED')),
    actual_check_in_at TIMESTAMPTZ,
    actual_check_out_at TIMESTAMPTZ,
    expected_check_out_date DATE NOT NULL,
    adults INTEGER NOT NULL DEFAULT 1 CHECK (adults >= 1),
    children INTEGER NOT NULL DEFAULT 0 CHECK (children >= 0),
    notes TEXT,
    check_in_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    check_out_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Date & Check-in order validations
    CONSTRAINT chk_stays_checkout_requires_checkin 
        CHECK (actual_check_out_at IS NULL OR actual_check_in_at IS NOT NULL),
    CONSTRAINT chk_stays_checkout_after_checkin 
        CHECK (actual_check_out_at IS NULL OR actual_check_in_at IS NULL OR actual_check_out_at >= actual_check_in_at)
);

-- 2. PARTIAL UNIQUE INDEXES FOR CONCURRENCY & INTEGRITY
-- Physical invariant: Exactly ONE active stay (CHECKED_IN) per room at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_stays_unique_active_room 
ON public.stays (room_id) 
WHERE (status = 'CHECKED_IN');

-- One active stay per reservation room item
CREATE UNIQUE INDEX IF NOT EXISTS idx_stays_unique_active_reservation_room 
ON public.stays (reservation_room_id) 
WHERE (status = 'CHECKED_IN');

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_stays_property_id ON public.stays(property_id);
CREATE INDEX IF NOT EXISTS idx_stays_property_status ON public.stays(property_id, status);
CREATE INDEX IF NOT EXISTS idx_stays_reservation_id ON public.stays(reservation_id);
CREATE INDEX IF NOT EXISTS idx_stays_reservation_room_id ON public.stays(reservation_room_id);
CREATE INDEX IF NOT EXISTS idx_stays_guest_id ON public.stays(guest_id);
CREATE INDEX IF NOT EXISTS idx_stays_room_id ON public.stays(room_id);
CREATE INDEX IF NOT EXISTS idx_stays_expected_checkout ON public.stays(property_id, expected_check_out_date);
CREATE INDEX IF NOT EXISTS idx_stays_actual_dates ON public.stays(property_id, actual_check_in_at, actual_check_out_at);

-- 3. CROSS-TENANT INTEGRITY TRIGGER
CREATE OR REPLACE FUNCTION public.check_stay_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_res_prop_id UUID;
    v_guest_prop_id UUID;
    v_room_prop_id UUID;
    v_res_room_prop_id UUID;
BEGIN
    -- 1. Check reservation property
    SELECT property_id INTO v_res_prop_id FROM public.reservations WHERE id = NEW.reservation_id;
    IF v_res_prop_id IS NULL OR v_res_prop_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: reservation_id % belongs to property %, but stay specifies property %',
            NEW.reservation_id, v_res_prop_id, NEW.property_id;
    END IF;

    -- 2. Check guest property
    SELECT property_id INTO v_guest_prop_id FROM public.guests WHERE id = NEW.guest_id;
    IF v_guest_prop_id IS NULL OR v_guest_prop_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: guest_id % belongs to property %, but stay specifies property %',
            NEW.guest_id, v_guest_prop_id, NEW.property_id;
    END IF;

    -- 3. Check room property
    SELECT property_id INTO v_room_prop_id FROM public.rooms WHERE id = NEW.room_id;
    IF v_room_prop_id IS NULL OR v_room_prop_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: room_id % does not belong to property_id %',
            NEW.room_id, NEW.property_id;
    END IF;

    -- 4. Check reservation_room property (if specified)
    IF NEW.reservation_room_id IS NOT NULL THEN
        SELECT property_id INTO v_res_room_prop_id FROM public.reservation_rooms WHERE id = NEW.reservation_room_id;
        IF v_res_room_prop_id IS NULL OR v_res_room_prop_id <> NEW.property_id THEN
            RAISE EXCEPTION 'Cross-tenant violation: reservation_room_id % belongs to property %, but stay specifies property %',
                NEW.reservation_room_id, v_res_room_prop_id, NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_stay_tenant_consistency ON public.stays;
CREATE TRIGGER trg_check_stay_tenant_consistency
BEFORE INSERT OR UPDATE ON public.stays
FOR EACH ROW
EXECUTE FUNCTION public.check_stay_tenant_consistency();

-- 4. ROOM OCCUPANCY INVARIANT TRIGGER
-- A room can only have status = 'OCCUPIED' if an active CHECKED_IN stay exists for that room!
CREATE OR REPLACE FUNCTION public.check_room_occupancy_invariant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'OCCUPIED' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.stays 
            WHERE room_id = NEW.id AND status = 'CHECKED_IN'
        ) THEN
            RAISE EXCEPTION 'Occupancy invariant violation: cannot mark room % as OCCUPIED without an active CHECKED_IN stay',
                NEW.room_number;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_room_occupancy_invariant ON public.rooms;
-- Use CONSTRAINT TRIGGER deferred to transaction commit or AFTER UPDATE to allow check-in transaction to insert stay and update room in any order
CREATE CONSTRAINT TRIGGER trg_check_room_occupancy_invariant
AFTER INSERT OR UPDATE OF status ON public.rooms
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.check_room_occupancy_invariant();
