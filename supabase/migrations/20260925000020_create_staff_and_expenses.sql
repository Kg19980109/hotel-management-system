
-- Migration: Phase 18 Staff, Attendance & Expenses
-- Create tables

CREATE TABLE IF NOT EXISTS public.staff_departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    department_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, name)
);

CREATE TABLE IF NOT EXISTS public.staff_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    employee_code TEXT NOT NULL,
    first_name TEXT NOT NULL,
    middle_name TEXT,
    last_name TEXT NOT NULL,
    display_name TEXT,
    date_of_birth DATE,
    gender TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    department_id UUID REFERENCES public.staff_departments(id) ON DELETE SET NULL,
    designation TEXT,
    employment_type TEXT,
    employment_status TEXT DEFAULT 'ACTIVE',
    joining_date DATE,
    leaving_date DATE,
    manager_staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(property_id, employee_code)
);

CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    status TEXT DEFAULT 'PRESENT',
    source TEXT DEFAULT 'MANUAL',
    notes TEXT,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, staff_id, attendance_date)
);

CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.staff_departments(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    is_overnight BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.staff_shift_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    shift_id UUID NOT NULL REFERENCES public.staff_shifts(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    status TEXT DEFAULT 'ASSIGNED',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, staff_id, shift_date)
);

CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days NUMERIC(5,1) NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'PENDING',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, name)
);

CREATE TABLE IF NOT EXISTS public.staff_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.staff_members(id) ON DELETE CASCADE,
    expense_number TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    expense_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    merchant TEXT,
    description TEXT,
    status TEXT DEFAULT 'DRAFT',
    submitted_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    paid_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, expense_number)
);

CREATE TABLE IF NOT EXISTS public.staff_expense_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES public.staff_expenses(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT,
    file_size BIGINT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.staff_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_expense_receipts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION create_staff_rls_policies(table_name text) RETURNS void AS $$
BEGIN
    EXECUTE format('
        CREATE POLICY "Staff can view %1$s for their property" ON public.%1$s
            FOR SELECT USING (public.user_belongs_to_property(auth.uid(), property_id));
        CREATE POLICY "Staff can insert %1$s for their property" ON public.%1$s
            FOR INSERT WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));
        CREATE POLICY "Staff can update %1$s for their property" ON public.%1$s
            FOR UPDATE USING (public.user_belongs_to_property(auth.uid(), property_id));
        CREATE POLICY "Staff can delete %1$s for their property" ON public.%1$s
            FOR DELETE USING (public.user_belongs_to_property(auth.uid(), property_id));
    ', table_name);
END;
$$ LANGUAGE plpgsql;

SELECT create_staff_rls_policies('staff_departments');
SELECT create_staff_rls_policies('staff_members');
SELECT create_staff_rls_policies('staff_attendance');
SELECT create_staff_rls_policies('staff_shifts');
SELECT create_staff_rls_policies('staff_shift_assignments');
SELECT create_staff_rls_policies('staff_leave_requests');
SELECT create_staff_rls_policies('expense_categories');
SELECT create_staff_rls_policies('staff_expenses');
SELECT create_staff_rls_policies('staff_expense_receipts');
