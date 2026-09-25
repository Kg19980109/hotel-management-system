-- ============================================================
-- STAYHUB MIGRATION 06: ROOM MANAGEMENT ROW LEVEL SECURITY
-- Phase 6: Tenant Isolation and Role-Aware Security on Room Tables
-- ============================================================

-- 1. Enable RLS
ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. FLOORS POLICIES
-- ============================================================

-- SELECT: Accessible to any user with membership in the property
CREATE POLICY "floors_select_policy" ON public.floors
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

-- INSERT: Allowed for Hotel Owner or General Manager
CREATE POLICY "floors_insert_policy" ON public.floors
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- UPDATE: Allowed for Hotel Owner or General Manager
CREATE POLICY "floors_update_policy" ON public.floors
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- DELETE: Only Hotel Owner or Super Admin
CREATE POLICY "floors_delete_policy" ON public.floors
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);

-- ============================================================
-- 3. ROOM TYPES POLICIES
-- ============================================================

-- SELECT: Accessible to any user with membership in the property
CREATE POLICY "room_types_select_policy" ON public.room_types
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

-- INSERT: Allowed for Hotel Owner or General Manager
CREATE POLICY "room_types_insert_policy" ON public.room_types
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- UPDATE: Allowed for Hotel Owner or General Manager
CREATE POLICY "room_types_update_policy" ON public.room_types
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- DELETE: Only Hotel Owner or Super Admin
CREATE POLICY "room_types_delete_policy" ON public.room_types
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);

-- ============================================================
-- 4. ROOMS POLICIES
-- ============================================================

-- SELECT: Accessible to any user with membership in the property
CREATE POLICY "rooms_select_policy" ON public.rooms
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

-- INSERT: Allowed for Hotel Owner or General Manager
CREATE POLICY "rooms_insert_policy" ON public.rooms
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- UPDATE: Allowed for Owner, GM, Front Desk, Receptionist, Housekeeping, Maintenance
CREATE POLICY "rooms_update_policy" ON public.rooms
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(
        auth.uid(), 
        property_id, 
        ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE']
    )
)
WITH CHECK (
    public.user_has_property_role(
        auth.uid(), 
        property_id, 
        ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST', 'HOUSEKEEPING', 'MAINTENANCE']
    )
);

-- DELETE: Only Hotel Owner or Super Admin
CREATE POLICY "rooms_delete_policy" ON public.rooms
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);
