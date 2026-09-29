-- ==============================================================================
-- STAYHUB MIGRATION: GRANULAR PERMISSIONS & ROLE-BASED ACCESS CONTROL (RBAC)
-- Migration: 20260929000001_create_granular_permission_schema.sql
-- Phase 1: Granular Permission Schema + Security Foundation
-- ==============================================================================

-- 1. Create Master Permissions Registry
CREATE TABLE IF NOT EXISTS public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    module VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permission_type VARCHAR(20) NOT NULL DEFAULT 'ACTION' CHECK (permission_type IN ('MODULE', 'ACTION')),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON public.permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_key ON public.permissions(key);
CREATE INDEX IF NOT EXISTS idx_permissions_type ON public.permissions(permission_type);

-- 2. Create Global System Role Default Permissions Table
CREATE TABLE IF NOT EXISTS public.role_default_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_role_default_permission UNIQUE (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_default_permissions_role ON public.role_default_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_default_permissions_permission ON public.role_default_permissions(permission_id);

-- 3. Create Property-Level Role Permission Overrides (Multi-Tenant Customization)
CREATE TABLE IF NOT EXISTS public.property_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
    granted BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_property_role_permission UNIQUE (property_id, role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_property_role_permissions_lookup ON public.property_role_permissions(property_id, role_id);
CREATE INDEX IF NOT EXISTS idx_property_role_permissions_granted ON public.property_role_permissions(property_id, role_id, granted);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY POLICIES
-- ==============================================================================

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_default_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_role_permissions ENABLE ROW LEVEL SECURITY;

-- Permissions: All authenticated users can view the permissions registry
CREATE POLICY "permissions_select_policy" ON public.permissions
FOR SELECT TO authenticated
USING (true);

-- Permissions: Modification restricted to Super Admin
CREATE POLICY "permissions_modify_policy" ON public.permissions
FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- Role Default Permissions: Read by all authenticated users
CREATE POLICY "role_default_permissions_select_policy" ON public.role_default_permissions
FOR SELECT TO authenticated
USING (true);

-- Role Default Permissions: Modification restricted to Super Admin
CREATE POLICY "role_default_permissions_modify_policy" ON public.role_default_permissions
FOR ALL TO authenticated
USING (public.is_platform_super_admin(auth.uid()))
WITH CHECK (public.is_platform_super_admin(auth.uid()));

-- Property Role Permissions: Read by members of the property
CREATE POLICY "property_role_permissions_select_policy" ON public.property_role_permissions
FOR SELECT TO authenticated
USING (public.user_belongs_to_property(auth.uid(), property_id));

-- Property Role Permissions: Managed only by Hotel Owners, General Managers, or Super Admins
CREATE POLICY "property_role_permissions_insert_policy" ON public.property_role_permissions
FOR INSERT TO authenticated
WITH CHECK (
    public.is_platform_super_admin(auth.uid())
    OR public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

CREATE POLICY "property_role_permissions_update_policy" ON public.property_role_permissions
FOR UPDATE TO authenticated
USING (
    public.is_platform_super_admin(auth.uid())
    OR public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
)
WITH CHECK (
    public.is_platform_super_admin(auth.uid())
    OR public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

CREATE POLICY "property_role_permissions_delete_policy" ON public.property_role_permissions
FOR DELETE TO authenticated
USING (
    public.is_platform_super_admin(auth.uid())
    OR public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
);

-- ==============================================================================
-- 5. HIGH-PERFORMANCE SECURITY DEFINER RESOLVER RPCS
-- ==============================================================================

-- Returns the complete set of effective permission keys for a user in a property
CREATE OR REPLACE FUNCTION public.get_user_effective_permissions(
    p_property_id UUID,
    p_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
    permission_key VARCHAR,
    module VARCHAR,
    permission_type VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_role_id UUID;
    v_role_code VARCHAR;
    v_is_authorized BOOLEAN := false;
BEGIN
    -- Verify caller is querying for themselves OR is a manager of the property / super admin
    IF v_caller_id = p_user_id THEN
        v_is_authorized := true;
    ELSIF public.is_platform_super_admin(v_caller_id) THEN
        v_is_authorized := true;
    ELSIF public.user_has_property_role(v_caller_id, p_property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER']) THEN
        v_is_authorized := true;
    END IF;

    IF NOT v_is_authorized THEN
        RAISE EXCEPTION 'Access denied: You cannot resolve permissions for another user without management privileges.';
    END IF;

    -- Check active property membership
    SELECT pm.role_id, r.code 
    INTO v_role_id, v_role_code
    FROM public.property_memberships pm
    JOIN public.roles r ON r.id = pm.role_id
    WHERE pm.property_id = p_property_id
      AND pm.user_id = p_user_id
      AND pm.status = 'active';

    IF v_role_id IS NULL THEN
        -- Check if user is platform super admin
        IF public.is_platform_super_admin(p_user_id) THEN
            RETURN QUERY 
            SELECT p.key, p.module, p.permission_type 
            FROM public.permissions p;
            RETURN;
        ELSE
            RETURN; -- No active membership, return empty
        END IF;
    END IF;

    -- If role is SUPER_ADMIN, return all permissions
    IF v_role_code = 'SUPER_ADMIN' THEN
        RETURN QUERY 
        SELECT p.key, p.module, p.permission_type 
        FROM public.permissions p;
        RETURN;
    END IF;

    -- Resolve effective permissions: (Role Defaults - Property Revocations + Property Grants)
    RETURN QUERY
    WITH role_defaults AS (
        SELECT p.id AS permission_id, p.key, p.module, p.permission_type
        FROM public.role_default_permissions rdp
        JOIN public.permissions p ON p.id = rdp.permission_id
        WHERE rdp.role_id = v_role_id
    ),
    property_overrides AS (
        SELECT prp.permission_id, prp.granted
        FROM public.property_role_permissions prp
        WHERE prp.property_id = p_property_id
          AND prp.role_id = v_role_id
    ),
    all_effective AS (
        -- Granted via default and NOT revoked by property override
        SELECT rd.key, rd.module, rd.permission_type
        FROM role_defaults rd
        LEFT JOIN property_overrides po ON po.permission_id = rd.permission_id
        WHERE po.granted IS NULL OR po.granted = true

        UNION

        -- Explicitly granted by property override even if not in default
        SELECT p.key, p.module, p.permission_type
        FROM property_overrides po
        JOIN public.permissions p ON p.id = po.permission_id
        WHERE po.granted = true
    )
    SELECT ae.key, ae.module, ae.permission_type
    FROM all_effective ae;
END;
$$;

-- Fast single-permission check helper function
CREATE OR REPLACE FUNCTION public.user_has_effective_permission(
    check_user_id UUID,
    check_property_id UUID,
    required_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.get_user_effective_permissions(check_property_id, check_user_id) ep
        WHERE ep.permission_key = required_permission
    );
END;
$$;

-- ==============================================================================
-- 6. SEED MASTER PERMISSION REGISTRY
-- ==============================================================================

INSERT INTO public.permissions (key, module, name, description, permission_type, display_order)
VALUES
    -- Overview
    ('dashboard.view', 'dashboard', 'View Dashboard', 'Access operational metrics, KPI summaries, and arrival overview', 'MODULE', 10),

    -- Front Desk & Stays
    ('front_desk.view', 'front_desk', 'View Front Desk', 'Access front desk console, room rack, and arrival list', 'MODULE', 20),
    ('front_desk.check_in', 'front_desk', 'Perform Check-In', 'Register guest arrivals, create stays, and issue keycards/passes', 'ACTION', 21),
    ('front_desk.check_out', 'front_desk', 'Perform Check-Out', 'Process guest departures, finalize billing, and close stays', 'ACTION', 22),
    ('front_desk.room_assign', 'front_desk', 'Room Allocation & Upgrade', 'Assign specific rooms, change allocations, or upgrade categories', 'ACTION', 23),

    -- Rooms Inventory
    ('rooms.view', 'rooms', 'View Room Inventory', 'View room statuses, floor maps, and inventory grid', 'MODULE', 30),
    ('rooms.status_update', 'rooms', 'Update Room Status', 'Update room status (Clean, Dirty, Inspecting, Out of Order)', 'ACTION', 31),
    ('rooms.manage', 'rooms', 'Manage Room Config', 'Create, edit, or configure room types, numbers, and pricing', 'ACTION', 32),

    -- Bookings & Reservations
    ('bookings.view', 'bookings', 'View Bookings', 'Access reservation calendar, booking directory, and search', 'MODULE', 40),
    ('bookings.create', 'bookings', 'Create Reservations', 'Create direct, walk-in, and OTA reservation records', 'ACTION', 41),
    ('bookings.manage', 'bookings', 'Modify & Cancel Bookings', 'Edit dates, room types, guest allocations, or cancel reservations', 'ACTION', 42),
    ('bookings.financials', 'bookings', 'View Booking Financials', 'View reservation rates, balance due, and commercial pricing', 'ACTION', 43),

    -- Guests & CRM
    ('guests.view', 'guests', 'View Guest Profiles', 'Search and view guest directory and stay history', 'MODULE', 50),
    ('guests.manage', 'guests', 'Manage Guest Profiles', 'Create, update, merge, or note guest preferences & VIP status', 'ACTION', 51),

    -- Housekeeping
    ('housekeeping.view', 'housekeeping', 'View Housekeeping', 'Access room turnover roster, priorities, and task board', 'MODULE', 60),
    ('housekeeping.assign', 'housekeeping', 'Assign Housekeeping Tasks', 'Assign cleaning tasks to specific attendants or teams', 'ACTION', 61),
    ('housekeeping.update', 'housekeeping', 'Update Cleaning Progress', 'Start cleaning and update progress timestamps', 'ACTION', 62),
    ('housekeeping.complete', 'housekeeping', 'Complete Cleaning Tasks', 'Mark cleaning completed and submit for inspection', 'ACTION', 63),
    ('housekeeping.inspect', 'housekeeping', 'Inspect Rooms', 'Perform quality inspection and pass or fail cleaned rooms', 'ACTION', 64),
    ('housekeeping.manage', 'housekeeping', 'Manage Housekeeping Operations', 'Create cleaning tasks, turndowns, and deep clean schedules', 'ACTION', 65),

    -- Maintenance & Engineering
    ('maintenance.view', 'maintenance', 'View Maintenance', 'View work orders, asset repair logs, and facility tickets', 'MODULE', 70),
    ('maintenance.create', 'maintenance', 'Create Work Orders', 'Report maintenance issues for rooms, facilities, and assets', 'ACTION', 71),
    ('maintenance.assign', 'maintenance', 'Assign Work Orders', 'Assign work orders to technicians and schedule repairs', 'ACTION', 72),
    ('maintenance.update', 'maintenance', 'Update Work Progress', 'Log labor hours, progress notes, and parts used', 'ACTION', 73),
    ('maintenance.resolve', 'maintenance', 'Resolve & Close Work Orders', 'Mark maintenance tasks resolved, verify repair, and close', 'ACTION', 74),
    ('maintenance.manage', 'maintenance', 'Manage Assets & Schedules', 'Configure maintenance assets and preventive schedules', 'ACTION', 75),

    -- Guest Service Requests
    ('guest_requests.view', 'guest_requests', 'View Guest Requests', 'Monitor incoming digital QR requests and room service calls', 'MODULE', 80),
    ('guest_requests.assign', 'guest_requests', 'Assign Service Requests', 'Dispatch guest requests to departments or individual staff', 'ACTION', 81),
    ('guest_requests.update', 'guest_requests', 'Acknowledge & Update Requests', 'Acknowledge alerts, silence buzzers, and update progress', 'ACTION', 82),
    ('guest_requests.resolve', 'guest_requests', 'Complete & Close Requests', 'Mark service request fulfilled and complete delivery', 'ACTION', 83),

    -- POS & Dining
    ('pos.view', 'pos', 'View POS & Tables', 'Access Restaurant Point of Sale terminal and table layout', 'MODULE', 90),
    ('pos.order_create', 'pos', 'Create Dining Orders', 'Take dine-in, takeaway, and room service food & beverage orders', 'ACTION', 91),
    ('pos.room_charge', 'pos', 'Post Charges to Room Folio', 'Charge restaurant bills directly to active guest room folios', 'ACTION', 92),
    ('pos.config', 'pos', 'Configure POS Outlets', 'Configure dining tables, POS outlets, and tax rates', 'ACTION', 93),

    -- Menu Configuration
    ('menu.view', 'menu', 'View Menus', 'View digital menus, categories, and item availability', 'MODULE', 100),
    ('menu.config', 'menu', 'Configure Menu Items', 'Add, edit, or remove menu items, prices, and station routing', 'ACTION', 101),

    -- Kitchen Display System (KDS)
    ('kitchen.view', 'kitchen', 'View Kitchen Display (KDS)', 'View real-time kitchen order tickets and station prep queues', 'MODULE', 110),
    ('kitchen.update', 'kitchen', 'Progress Kitchen Tickets', 'Mark items in prep, ready for pickup, or served', 'ACTION', 111),
    ('kitchen.manage', 'kitchen', 'Manage Stations & 86 Items', 'Configure kitchen stations and mark items out-of-stock (86)', 'ACTION', 112),

    -- QR Services
    ('qr_services.view', 'qr_services', 'View QR Services', 'View room and table QR codes and digital access links', 'MODULE', 120),
    ('qr_services.manage', 'qr_services', 'Generate & Print QR Passes', 'Generate QR table cards and printable room tokens', 'ACTION', 121),

    -- Staff Management & Directory
    ('staff.view', 'staff', 'View Staff Directory', 'Access employee directory, designations, and roster', 'MODULE', 130),
    ('staff.create', 'staff', 'Create Staff Members', 'Add new employees, provision logins, and assign departments', 'ACTION', 131),
    ('staff.edit', 'staff', 'Edit Staff Profiles', 'Update employee details, contact info, and active status', 'ACTION', 132),
    ('staff.manage_roles', 'staff', 'Manage Staff Roles & Permissions', 'Assign security roles and customize granular permissions', 'ACTION', 133),
    ('staff.departments', 'staff', 'Manage Departments', 'Create and configure hotel operational departments', 'ACTION', 134),

    -- Attendance & Rostering
    ('attendance.view', 'attendance', 'View Attendance', 'View employee attendance logs, check-ins, and shift schedules', 'MODULE', 140),
    ('attendance.manage', 'attendance', 'Manage Shifts & Attendance', 'Log check-in/out, approve leave, and assign shifts', 'ACTION', 141),

    -- Billing & Folios
    ('billing.view', 'billing', 'View Billing & Folios', 'Access stay billing folios, invoices, and payment ledgers', 'MODULE', 150),
    ('billing.folio_charge', 'billing', 'Post Incidental Charges', 'Post room service, minibar, and laundry charges to folios', 'ACTION', 151),
    ('billing.invoices', 'billing', 'Generate Invoices & Payments', 'Issue tax invoices, record card/cash payments, and close folios', 'ACTION', 152),
    ('billing.refunds_discounts', 'billing', 'Authorize Discounts & Refunds', 'Apply discounts, fee waivers, invoice voids, and refunds', 'ACTION', 153),
    ('billing.manage', 'billing', 'Configure Billing & Taxes', 'Set tax rules, payment gateways, and fiscal compliance', 'ACTION', 154),

    -- Hotel Expenses
    ('expenses.view', 'expenses', 'View Expenses', 'View operational expense logs, receipts, and categories', 'MODULE', 160),
    ('expenses.create', 'expenses', 'Submit Expenses', 'Log employee expenses and attach purchase receipts', 'ACTION', 161),
    ('expenses.approve', 'expenses', 'Approve & Settle Expenses', 'Authorize or reject staff expense claims and record payout', 'ACTION', 162),

    -- Reports & Business Intelligence
    ('reports.view', 'reports', 'View Reports', 'Access analytics dashboards and operational reports', 'MODULE', 170),
    ('reports.export', 'reports', 'Export Report Data', 'Export financial, attendance, and operational CSV reports', 'ACTION', 171),
    ('reports.financials', 'reports', 'View Financial & Revenue Reports', 'Access ADR, RevPAR, tax, and revenue audits', 'ACTION', 172),
    ('reports.operational', 'reports', 'View Operational Reports', 'Access occupancy, housekeeping, maintenance, and staff reports', 'ACTION', 173),

    -- Inventory & Supplies
    ('inventory.view', 'inventory', 'View Inventory', 'View stock levels, consumables, and supplier directory', 'MODULE', 180),
    ('inventory.manage', 'inventory', 'Manage Stock & Purchase Orders', 'Record stock adjustments and issue supplier purchase orders', 'ACTION', 181),

    -- System & Property Settings
    ('settings.view', 'settings', 'View Hotel Settings', 'View property profile, contact info, and policies', 'MODULE', 190),
    ('settings.manage', 'settings', 'Manage Hotel Settings', 'Update property details, branding, integrations, and policies', 'ACTION', 191)
ON CONFLICT (key) DO UPDATE SET
    module = EXCLUDED.module,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    permission_type = EXCLUDED.permission_type,
    display_order = EXCLUDED.display_order;

-- ==============================================================================
-- 7. SEED INITIAL ROLE DEFAULT PERMISSIONS (MATCHING EXACT CURRENT CAPABILITIES)
-- ==============================================================================

-- Helper CTE function to batch seed permissions for a role code
DO $$
DECLARE
    v_super_admin UUID;
    v_hotel_owner UUID;
    v_general_manager UUID;
    v_front_desk UUID;
    v_receptionist UUID;
    v_housekeeping UUID;
    v_maintenance UUID;
    v_restaurant_staff UUID;
    v_kitchen_staff UUID;
    v_accountant UUID;
BEGIN
    SELECT id INTO v_super_admin FROM public.roles WHERE code = 'SUPER_ADMIN';
    SELECT id INTO v_hotel_owner FROM public.roles WHERE code = 'HOTEL_OWNER';
    SELECT id INTO v_general_manager FROM public.roles WHERE code = 'GENERAL_MANAGER';
    SELECT id INTO v_front_desk FROM public.roles WHERE code = 'FRONT_DESK';
    SELECT id INTO v_receptionist FROM public.roles WHERE code = 'RECEPTIONIST';
    SELECT id INTO v_housekeeping FROM public.roles WHERE code = 'HOUSEKEEPING';
    SELECT id INTO v_maintenance FROM public.roles WHERE code = 'MAINTENANCE';
    SELECT id INTO v_restaurant_staff FROM public.roles WHERE code = 'RESTAURANT_STAFF';
    SELECT id INTO v_kitchen_staff FROM public.roles WHERE code = 'KITCHEN_STAFF';
    SELECT id INTO v_accountant FROM public.roles WHERE code = 'ACCOUNTANT';

    -- 1. SUPER_ADMIN: All permissions
    IF v_super_admin IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_super_admin, p.id FROM public.permissions p
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 2. HOTEL_OWNER: All permissions
    IF v_hotel_owner IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_hotel_owner, p.id FROM public.permissions p
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 3. GENERAL_MANAGER: All operational, financial, and management permissions except property ownership transfer
    IF v_general_manager IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_general_manager, p.id FROM public.permissions p
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 4. FRONT_DESK (Supervisor)
    IF v_front_desk IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_front_desk, p.id FROM public.permissions p
        WHERE p.key IN (
            'dashboard.view',
            'front_desk.view', 'front_desk.check_in', 'front_desk.check_out', 'front_desk.room_assign',
            'rooms.view', 'rooms.status_update',
            'bookings.view', 'bookings.create', 'bookings.manage', 'bookings.financials',
            'guests.view', 'guests.manage',
            'housekeeping.view', 'housekeeping.assign', 'housekeeping.inspect',
            'maintenance.view', 'maintenance.create',
            'guest_requests.view', 'guest_requests.assign', 'guest_requests.update', 'guest_requests.resolve',
            'pos.view', 'pos.order_create',
            'qr_services.view', 'qr_services.manage',
            'staff.view',
            'attendance.view',
            'billing.view', 'billing.folio_charge', 'billing.invoices',
            'reports.view', 'reports.export', 'reports.operational',
            'inventory.view',
            'settings.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 5. RECEPTIONIST (Agent)
    IF v_receptionist IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_receptionist, p.id FROM public.permissions p
        WHERE p.key IN (
            'dashboard.view',
            'front_desk.view', 'front_desk.check_in', 'front_desk.check_out',
            'rooms.view', 'rooms.status_update',
            'bookings.view', 'bookings.create', 'bookings.manage',
            'guests.view',
            'housekeeping.view',
            'guest_requests.view', 'guest_requests.update', 'guest_requests.resolve',
            'pos.view',
            'qr_services.view',
            'attendance.view',
            'billing.view', 'billing.folio_charge', 'billing.invoices',
            'reports.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 6. HOUSEKEEPING
    IF v_housekeeping IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_housekeeping, p.id FROM public.permissions p
        WHERE p.key IN (
            'housekeeping.view', 'housekeeping.assign', 'housekeeping.update', 'housekeeping.complete', 'housekeeping.inspect',
            'rooms.view', 'rooms.status_update',
            'bookings.view',
            'front_desk.view',
            'guest_requests.view', 'guest_requests.update', 'guest_requests.resolve',
            'attendance.view',
            'reports.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 7. MAINTENANCE
    IF v_maintenance IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_maintenance, p.id FROM public.permissions p
        WHERE p.key IN (
            'maintenance.view', 'maintenance.create', 'maintenance.assign', 'maintenance.update', 'maintenance.resolve',
            'rooms.view', 'rooms.status_update',
            'bookings.view',
            'front_desk.view',
            'guest_requests.view', 'guest_requests.update', 'guest_requests.resolve',
            'attendance.view',
            'reports.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 8. RESTAURANT_STAFF
    IF v_restaurant_staff IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_restaurant_staff, p.id FROM public.permissions p
        WHERE p.key IN (
            'pos.view', 'pos.order_create', 'pos.room_charge',
            'menu.view',
            'kitchen.view',
            'bookings.view',
            'front_desk.view',
            'guest_requests.view', 'guest_requests.update',
            'attendance.view',
            'reports.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 9. KITCHEN_STAFF
    IF v_kitchen_staff IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_kitchen_staff, p.id FROM public.permissions p
        WHERE p.key IN (
            'kitchen.view', 'kitchen.update', 'kitchen.manage',
            'menu.view',
            'attendance.view',
            'reports.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;

    -- 10. ACCOUNTANT
    IF v_accountant IS NOT NULL THEN
        INSERT INTO public.role_default_permissions (role_id, permission_id)
        SELECT v_accountant, p.id FROM public.permissions p
        WHERE p.key IN (
            'dashboard.view',
            'rooms.view',
            'bookings.view', 'bookings.financials',
            'front_desk.view',
            'billing.view', 'billing.folio_charge', 'billing.invoices', 'billing.refunds_discounts', 'billing.manage',
            'expenses.view', 'expenses.approve',
            'reports.view', 'reports.export', 'reports.financials', 'reports.operational',
            'inventory.view',
            'staff.view',
            'attendance.view',
            'settings.view'
        )
        ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
END $$;
