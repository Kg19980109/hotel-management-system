-- ============================================================
-- STAYHUB MIGRATION 05: ROOM MANAGEMENT & ROOM INVENTORY SCHEMA
-- Phase 6: Floors, Room Types, Rooms & Cross-Tenant Integrity
-- ============================================================

-- 1. FLOORS TABLE
CREATE TABLE IF NOT EXISTS public.floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    floor_number INTEGER,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_property_floor_name UNIQUE (property_id, name)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_floors_property_floor_number 
ON public.floors (property_id, floor_number) 
WHERE floor_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_floors_property_id ON public.floors(property_id);
CREATE INDEX IF NOT EXISTS idx_floors_sort_order ON public.floors(property_id, sort_order);

-- 2. ROOM TYPES TABLE
CREATE TABLE IF NOT EXISTS public.room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT,
    max_occupancy INTEGER NOT NULL DEFAULT 2 CHECK (max_occupancy > 0),
    base_rate NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (base_rate >= 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    bed_configuration VARCHAR(100),
    amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
    size_sqft NUMERIC(8,2),
    size_sqm NUMERIC(8,2),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_property_room_type_code UNIQUE (property_id, code)
);

CREATE INDEX IF NOT EXISTS idx_room_types_property_id ON public.room_types(property_id);
CREATE INDEX IF NOT EXISTS idx_room_types_status ON public.room_types(property_id, status);
CREATE INDEX IF NOT EXISTS idx_room_types_is_active ON public.room_types(property_id, is_active);

-- 3. ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    floor_id UUID REFERENCES public.floors(id) ON DELETE SET NULL,
    room_type_id UUID NOT NULL REFERENCES public.room_types(id) ON DELETE RESTRICT,
    room_number VARCHAR(50) NOT NULL,
    room_name VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    housekeeping_status VARCHAR(50) NOT NULL DEFAULT 'CLEAN',
    availability_status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    max_occupancy INTEGER,
    floor_label VARCHAR(50),
    view_type VARCHAR(50),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_property_room_number UNIQUE (property_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON public.rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property_status ON public.rooms(property_id, status);
CREATE INDEX IF NOT EXISTS idx_rooms_property_floor_id ON public.rooms(property_id, floor_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property_room_type_id ON public.rooms(property_id, room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property_is_active ON public.rooms(property_id, is_active);
CREATE INDEX IF NOT EXISTS idx_rooms_property_housekeeping ON public.rooms(property_id, housekeeping_status);

-- 4. CROSS-TENANT CONSISTENCY TRIGGER
-- Prevents referencing a floor_id or room_type_id belonging to another property
CREATE OR REPLACE FUNCTION public.check_room_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Verify room_type_id belongs to the same property
    IF NOT EXISTS (
        SELECT 1 FROM public.room_types 
        WHERE id = NEW.room_type_id AND property_id = NEW.property_id
    ) THEN
        RAISE EXCEPTION 'Cross-tenant violation: room_type_id % does not belong to property_id %', 
            NEW.room_type_id, NEW.property_id;
    END IF;

    -- Verify floor_id (if specified) belongs to the same property
    IF NEW.floor_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.floors 
            WHERE id = NEW.floor_id AND property_id = NEW.property_id
        ) THEN
            RAISE EXCEPTION 'Cross-tenant violation: floor_id % does not belong to property_id %', 
                NEW.floor_id, NEW.property_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_room_tenant_consistency ON public.rooms;
CREATE TRIGGER trg_check_room_tenant_consistency
BEFORE INSERT OR UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.check_room_tenant_consistency();
