-- ============================================================
-- STAYHUB MIGRATION 01: IDENTITY AND TENANCY FOUNDATION
-- Phase 4: Authentication, Multi-Tenancy & Hotel Onboarding
-- ============================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    legal_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. PROPERTIES (Hotels / Resorts)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    property_code VARCHAR(50),
    description TEXT,
    address_line_1 VARCHAR(255) NOT NULL,
    address_line_2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    phone VARCHAR(50),
    email VARCHAR(255),
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    check_in_time VARCHAR(20) NOT NULL DEFAULT '14:00',
    check_out_time VARCHAR(20) NOT NULL DEFAULT '11:00',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_organization_property_slug UNIQUE (organization_id, slug)
);

-- 3. PROFILES (Application User Profile linked 1-to-1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ROLES
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. PROPERTY MEMBERSHIPS (User <-> Property relation with Role)
CREATE TABLE IF NOT EXISTS public.property_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_property_user_role UNIQUE (property_id, user_id, role_id)
);

-- ============================================================
-- INDEXES FOR HIGH-PERFORMANCE TENANT QUERIES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_properties_organization_id ON public.properties(organization_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_property_memberships_property_id ON public.property_memberships(property_id);
CREATE INDEX IF NOT EXISTS idx_property_memberships_user_id ON public.property_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_property_memberships_role_id ON public.property_memberships(role_id);
CREATE INDEX IF NOT EXISTS idx_property_memberships_composite ON public.property_memberships(user_id, property_id, status);

-- ============================================================
-- SEED INITIAL SYSTEM ROLES
-- ============================================================

INSERT INTO public.roles (code, name, description, is_system)
VALUES 
    ('SUPER_ADMIN', 'Platform Super Administrator', 'Full platform-level administration across all organizations and properties', true),
    ('HOTEL_OWNER', 'Hotel Owner', 'Primary property administrator with full financial, operational, and staff authority', true),
    ('GENERAL_MANAGER', 'General Manager', 'Operational leader managing day-to-day hotel activities, inventory, and staff', true),
    ('FRONT_DESK', 'Front Desk Supervisor', 'Front desk lead managing check-ins, reservations, folios, and reception staff', true),
    ('RECEPTIONIST', 'Receptionist', 'Front desk agent handling walk-ins, guest check-in/out, and inquiries', true),
    ('HOUSEKEEPING', 'Housekeeping Staff', 'Room attendant updating cleaning statuses, inspection results, and linen', true),
    ('MAINTENANCE', 'Maintenance Technician', 'Facilities engineer handling room repair tickets and work orders', true),
    ('RESTAURANT_STAFF', 'Restaurant / F&B Staff', 'Dining server managing table orders, room bill charges, and POS', true),
    ('KITCHEN_STAFF', 'Kitchen Staff / Chef', 'Kitchen Display System operator preparing orders and updating statuses', true),
    ('ACCOUNTANT', 'Accountant', 'Financial officer handling vendor payables, tax invoices, and revenue reports', true)
ON CONFLICT (code) DO NOTHING;
