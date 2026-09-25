-- ============================================================
-- STAYHUB MIGRATION 11: EXTEND GUESTS SCHEMA & GUEST CRM
-- Phase 9: Guest CRM, Profile Management, Preferences & Notes
-- ============================================================

-- 1. EXTEND PUBLIC.GUESTS TABLE
-- Adds hotel operational identity, address, document, and preference fields
ALTER TABLE public.guests
    ADD COLUMN IF NOT EXISTS title VARCHAR(20),
    ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(50) DEFAULT 'en',
    ADD COLUMN IF NOT EXISTS alternate_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS address_line_1 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_line_2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state VARCHAR(100),
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(50)
        CHECK (id_document_type IS NULL OR id_document_type IN ('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'OTHER')),
    ADD COLUMN IF NOT EXISTS id_document_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS id_document_country VARCHAR(100),
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS job_title VARCHAR(100),
    ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN NOT NULL DEFAULT false;

-- Normalize status column to uppercase default 'ACTIVE'
ALTER TABLE public.guests ALTER COLUMN status SET DEFAULT 'ACTIVE';

-- Add check constraint for status values
ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS chk_guests_status;
ALTER TABLE public.guests ADD CONSTRAINT chk_guests_status 
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'BLOCKED', 'active', 'inactive', 'blocked'));

-- Performance & Case-Insensitive Search Indexes
CREATE INDEX IF NOT EXISTS idx_guests_property_email_lower 
    ON public.guests (property_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_guests_property_status 
    ON public.guests (property_id, status);
CREATE INDEX IF NOT EXISTS idx_guests_property_company 
    ON public.guests (property_id, company_name);
CREATE INDEX IF NOT EXISTS idx_guests_created_at 
    ON public.guests (property_id, created_at DESC);

-- ============================================================
-- 2. GUEST PREFERENCES TABLE
-- Structured operational preferences (room, bed, dietary, communication, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guest_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    preference_type VARCHAR(50) NOT NULL 
        CHECK (preference_type IN ('ROOM', 'BED', 'FLOOR', 'DIETARY', 'PILLOW', 'COMMUNICATION', 'GENERAL')),
    preference_value VARCHAR(255) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_preferences_guest_id ON public.guest_preferences(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_preferences_property_id ON public.guest_preferences(property_id);

-- Trigger: Tenant Consistency for Guest Preferences
CREATE OR REPLACE FUNCTION public.check_guest_preference_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_guest_prop_id UUID;
BEGIN
    SELECT property_id INTO v_guest_prop_id FROM public.guests WHERE id = NEW.guest_id;
    IF v_guest_prop_id IS NULL OR v_guest_prop_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: guest_id % belongs to property %, but preference specifies property %',
            NEW.guest_id, v_guest_prop_id, NEW.property_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_guest_preference_tenant_consistency ON public.guest_preferences;
CREATE TRIGGER trg_check_guest_preference_tenant_consistency
BEFORE INSERT OR UPDATE ON public.guest_preferences
FOR EACH ROW
EXECUTE FUNCTION public.check_guest_preference_tenant_consistency();

-- ============================================================
-- 3. GUEST NOTES TABLE
-- Internal operational staff notes. Strictly private, never customer-facing.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.guest_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_guest_notes_guest_id ON public.guest_notes(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_notes_property_id ON public.guest_notes(property_id);

-- Trigger: Tenant Consistency for Guest Notes
CREATE OR REPLACE FUNCTION public.check_guest_note_tenant_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_guest_prop_id UUID;
BEGIN
    SELECT property_id INTO v_guest_prop_id FROM public.guests WHERE id = NEW.guest_id;
    IF v_guest_prop_id IS NULL OR v_guest_prop_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: guest_id % belongs to property %, but note specifies property %',
            NEW.guest_id, v_guest_prop_id, NEW.property_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_guest_note_tenant_consistency ON public.guest_notes;
CREATE TRIGGER trg_check_guest_note_tenant_consistency
BEFORE INSERT OR UPDATE ON public.guest_notes
FOR EACH ROW
EXECUTE FUNCTION public.check_guest_note_tenant_consistency();

-- ============================================================
-- 4. ROW LEVEL SECURITY ON NEW GUEST TABLES
-- ============================================================
ALTER TABLE public.guest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_notes ENABLE ROW LEVEL SECURITY;

-- Preferences Policies
DROP POLICY IF EXISTS "guest_preferences_select_policy" ON public.guest_preferences;
CREATE POLICY "guest_preferences_select_policy" ON public.guest_preferences
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

DROP POLICY IF EXISTS "guest_preferences_insert_policy" ON public.guest_preferences;
CREATE POLICY "guest_preferences_insert_policy" ON public.guest_preferences
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

DROP POLICY IF EXISTS "guest_preferences_update_policy" ON public.guest_preferences;
CREATE POLICY "guest_preferences_update_policy" ON public.guest_preferences
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

DROP POLICY IF EXISTS "guest_preferences_delete_policy" ON public.guest_preferences;
CREATE POLICY "guest_preferences_delete_policy" ON public.guest_preferences
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- Notes Policies
DROP POLICY IF EXISTS "guest_notes_select_policy" ON public.guest_notes;
CREATE POLICY "guest_notes_select_policy" ON public.guest_notes
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

DROP POLICY IF EXISTS "guest_notes_insert_policy" ON public.guest_notes;
CREATE POLICY "guest_notes_insert_policy" ON public.guest_notes
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

DROP POLICY IF EXISTS "guest_notes_update_policy" ON public.guest_notes;
CREATE POLICY "guest_notes_update_policy" ON public.guest_notes
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

DROP POLICY IF EXISTS "guest_notes_delete_policy" ON public.guest_notes;
CREATE POLICY "guest_notes_delete_policy" ON public.guest_notes
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);
