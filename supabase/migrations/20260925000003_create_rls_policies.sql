-- ============================================================
-- STAYHUB MIGRATION 03: ROW LEVEL SECURITY POLICIES
-- Phase 4: Strict tenant isolation and role-aware protection
-- ============================================================

-- Enable RLS on all 5 tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 1. ORGANIZATIONS POLICIES
-- ============================================================

-- SELECT: Users can only see organizations they belong to or created
CREATE POLICY "org_select_policy" ON public.organizations
FOR SELECT TO authenticated
USING (
  public.user_belongs_to_organization(auth.uid(), id)
);

-- INSERT: Authenticated users can create an organization (e.g. during onboarding)
CREATE POLICY "org_insert_policy" ON public.organizations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = created_by
);

-- UPDATE: Only Hotel Owners or General Managers of this org or Super Admins can update
CREATE POLICY "org_update_policy" ON public.organizations
FOR UPDATE TO authenticated
USING (
  public.is_platform_super_admin(auth.uid())
  OR (created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.organization_id = id
      AND public.user_has_property_role(auth.uid(), p.id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
  )
)
WITH CHECK (
  public.is_platform_super_admin(auth.uid())
  OR (created_by = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.organization_id = id
      AND public.user_has_property_role(auth.uid(), p.id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
  )
);

-- ============================================================
-- 2. PROPERTIES POLICIES
-- ============================================================

-- SELECT: Users can view properties they have active membership in
CREATE POLICY "property_select_policy" ON public.properties
FOR SELECT TO authenticated
USING (
  public.user_belongs_to_property(auth.uid(), id)
);

-- INSERT: Authenticated users can insert a property into an organization they created or own
CREATE POLICY "property_insert_policy" ON public.properties
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_super_admin(auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.organizations org
    WHERE org.id = organization_id
      AND org.created_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.organization_id = organization_id
      AND public.user_has_property_role(auth.uid(), p.id, ARRAY['HOTEL_OWNER'])
  )
);

-- UPDATE: Property managers (HOTEL_OWNER or GENERAL_MANAGER) can update their property
CREATE POLICY "property_update_policy" ON public.properties
FOR UPDATE TO authenticated
USING (
  public.user_has_property_role(auth.uid(), id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
)
WITH CHECK (
  public.user_has_property_role(auth.uid(), id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- ============================================================
-- 3. PROFILES POLICIES
-- ============================================================

-- SELECT: User can view their own profile, or coworkers within the same property
CREATE POLICY "profile_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth_user_id = auth.uid()
  OR public.is_platform_super_admin(auth.uid())
  OR EXISTS (
    -- Coworkers sharing at least one property
    SELECT 1 
    FROM public.property_memberships my_mem
    JOIN public.property_memberships their_mem ON their_mem.property_id = my_mem.property_id
    WHERE my_mem.user_id = auth.uid()
      AND their_mem.user_id = auth_user_id
      AND my_mem.status = 'active'
      AND their_mem.status = 'active'
  )
);

-- INSERT: User can only insert their own profile
CREATE POLICY "profile_insert_policy" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (
  auth_user_id = auth.uid()
);

-- UPDATE: User can only update their own profile
CREATE POLICY "profile_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (
  auth_user_id = auth.uid()
)
WITH CHECK (
  auth_user_id = auth.uid()
);

-- ============================================================
-- 4. ROLES POLICIES
-- ============================================================

-- SELECT: All authenticated users can read roles (needed for UI role labels and selectors)
CREATE POLICY "role_select_policy" ON public.roles
FOR SELECT TO authenticated
USING (true);

-- INSERT/UPDATE/DELETE: Restricted to Super Admins only
CREATE POLICY "role_modify_policy" ON public.roles
FOR ALL TO authenticated
USING (
  public.is_platform_super_admin(auth.uid())
)
WITH CHECK (
  public.is_platform_super_admin(auth.uid())
);

-- ============================================================
-- 5. PROPERTY MEMBERSHIPS POLICIES
-- ============================================================

-- SELECT: User can see their own memberships, or managers can view team memberships of their property
CREATE POLICY "membership_select_policy" ON public.property_memberships
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- INSERT: Only HOTEL_OWNER / GENERAL_MANAGER can invite/add members to their property
CREATE POLICY "membership_insert_policy" ON public.property_memberships
FOR INSERT TO authenticated
WITH CHECK (
  public.is_platform_super_admin(auth.uid())
  OR public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
  -- Allow self-assignment during atomic onboarding RPC (which runs SECURITY DEFINER)
);

-- UPDATE: Only property owners or general managers can alter membership status or role
CREATE POLICY "membership_update_policy" ON public.property_memberships
FOR UPDATE TO authenticated
USING (
  public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
)
WITH CHECK (
  public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- DELETE: Only property owners can remove memberships
CREATE POLICY "membership_delete_policy" ON public.property_memberships
FOR DELETE TO authenticated
USING (
  public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER'])
);
