-- ============================================================
-- STAYHUB MIGRATION 02: RLS HELPER FUNCTIONS
-- Phase 4: Non-recursive, high-performance security definer helpers
-- ============================================================

-- 1. Helper to verify if a user has platform SUPER_ADMIN role
CREATE OR REPLACE FUNCTION public.is_platform_super_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.property_memberships pm
    JOIN public.roles r ON r.id = pm.role_id
    WHERE pm.user_id = check_user_id
      AND pm.status = 'active'
      AND r.code = 'SUPER_ADMIN'
  );
$$;

-- 2. Helper to verify if user has active membership in a given property
CREATE OR REPLACE FUNCTION public.user_belongs_to_property(check_user_id UUID, check_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_platform_super_admin(check_user_id)
    OR EXISTS (
      SELECT 1 
      FROM public.property_memberships pm
      WHERE pm.user_id = check_user_id
        AND pm.property_id = check_property_id
        AND pm.status = 'active'
    )
  );
$$;

-- 3. Helper to verify if user has active membership in any property of an organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(check_user_id UUID, check_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_platform_super_admin(check_user_id)
    OR EXISTS (
      SELECT 1 
      FROM public.organizations org
      WHERE org.id = check_org_id
        AND org.created_by = check_user_id
    )
    OR EXISTS (
      SELECT 1 
      FROM public.properties p
      JOIN public.property_memberships pm ON pm.property_id = p.id
      WHERE p.organization_id = check_org_id
        AND pm.user_id = check_user_id
        AND pm.status = 'active'
    )
  );
$$;

-- 4. Helper to check if user has one of the specified roles within a property
CREATE OR REPLACE FUNCTION public.user_has_property_role(
    check_user_id UUID, 
    check_property_id UUID, 
    required_roles TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT (
    public.is_platform_super_admin(check_user_id)
    OR EXISTS (
      SELECT 1 
      FROM public.property_memberships pm
      JOIN public.roles r ON r.id = pm.role_id
      WHERE pm.user_id = check_user_id
        AND pm.property_id = check_property_id
        AND pm.status = 'active'
        AND r.code = ANY(required_roles)
    )
  );
$$;

-- 5. Helper function returning list of property IDs accessible by a user
CREATE OR REPLACE FUNCTION public.get_user_property_ids(check_user_id UUID)
RETURNS TABLE (property_id UUID)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT property_id 
  FROM public.property_memberships
  WHERE user_id = check_user_id 
    AND status = 'active';
$$;
