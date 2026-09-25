-- ============================================================
-- STAYHUB MIGRATION 08: RESERVATION MANAGEMENT ROW LEVEL SECURITY
-- Phase 7: Multi-Tenant Isolation and Role-Aware Security
-- ============================================================

-- 1. Enable RLS on all Phase 7 tables
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservation_rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. GUESTS TABLE POLICIES
-- ============================================================

-- SELECT: Accessible to any user with membership in the property
CREATE POLICY "guests_select_policy" ON public.guests
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

-- INSERT: Allowed for Owner, GM, Front Desk, Receptionist
CREATE POLICY "guests_insert_policy" ON public.guests
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- UPDATE: Allowed for Owner, GM, Front Desk, Receptionist
CREATE POLICY "guests_update_policy" ON public.guests
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- DELETE: Only Hotel Owner
CREATE POLICY "guests_delete_policy" ON public.guests
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);

-- ============================================================
-- 3. RESERVATIONS TABLE POLICIES
-- ============================================================

-- SELECT: Accessible to any user with active membership in the property
CREATE POLICY "reservations_select_policy" ON public.reservations
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

-- INSERT: Allowed for Owner, GM, Front Desk, Receptionist
CREATE POLICY "reservations_insert_policy" ON public.reservations
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- UPDATE: Allowed for Owner, GM, Front Desk, Receptionist
CREATE POLICY "reservations_update_policy" ON public.reservations
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- DELETE: Only Hotel Owner (Soft cancellation is preferred in application layer)
CREATE POLICY "reservations_delete_policy" ON public.reservations
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);

-- ============================================================
-- 4. RESERVATION ROOMS TABLE POLICIES
-- ============================================================

-- SELECT: Accessible to any user with active membership in the property
CREATE POLICY "reservation_rooms_select_policy" ON public.reservation_rooms
FOR SELECT TO authenticated
USING (
    public.user_belongs_to_property(auth.uid(), property_id)
);

-- INSERT: Allowed for Owner, GM, Front Desk, Receptionist
CREATE POLICY "reservation_rooms_insert_policy" ON public.reservation_rooms
FOR INSERT TO authenticated
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- UPDATE: Allowed for Owner, GM, Front Desk, Receptionist
CREATE POLICY "reservation_rooms_update_policy" ON public.reservation_rooms
FOR UPDATE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
)
WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST'])
);

-- DELETE: Only Hotel Owner
CREATE POLICY "reservation_rooms_delete_policy" ON public.reservation_rooms
FOR DELETE TO authenticated
USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);
