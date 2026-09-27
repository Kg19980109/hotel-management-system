-- Migration: Phase 23 Complete Hotel Expense Management & Owner Business Intelligence
-- Created: 2026-09-28

-- 1. Create expenses table for hotel property expenditures
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    expense_number TEXT NOT NULL,
    title TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES public.expense_categories(id) ON DELETE RESTRICT,
    subcategory TEXT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount >= 0),
    currency TEXT DEFAULT 'INR',
    expense_date DATE NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'CASH',
    vendor_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    vendor_name TEXT,
    department_id UUID REFERENCES public.staff_departments(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
    invoice_number TEXT,
    reference_number TEXT,
    description TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'RECORDED',
    receipt_url TEXT,
    receipt_file_name TEXT,
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, expense_number)
);

-- 2. Expense Audit Logs Table
CREATE TABLE IF NOT EXISTS public.expense_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'CREATED', 'UPDATED', 'VOIDED', 'STATUS_CHANGED'
    performed_by UUID REFERENCES auth.users(id),
    performed_by_name TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Composite Performance Indexes
CREATE INDEX IF NOT EXISTS idx_expenses_prop_date ON public.expenses(property_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_prop_cat ON public.expenses(property_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_prop_vendor ON public.expenses(property_id, vendor_id);
CREATE INDEX IF NOT EXISTS idx_expenses_prop_dept ON public.expenses(property_id, department_id);
CREATE INDEX IF NOT EXISTS idx_expenses_prop_status ON public.expenses(property_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_audit_logs_exp ON public.expense_audit_logs(expense_id, created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view expenses for their property" ON public.expenses;
    CREATE POLICY "Users can view expenses for their property" ON public.expenses
        FOR SELECT USING (public.user_belongs_to_property(auth.uid(), property_id));

    DROP POLICY IF EXISTS "Users can insert expenses for their property" ON public.expenses;
    CREATE POLICY "Users can insert expenses for their property" ON public.expenses
        FOR INSERT WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

    DROP POLICY IF EXISTS "Users can update expenses for their property" ON public.expenses;
    CREATE POLICY "Users can update expenses for their property" ON public.expenses
        FOR UPDATE USING (public.user_belongs_to_property(auth.uid(), property_id));

    DROP POLICY IF EXISTS "Users can delete expenses for their property" ON public.expenses;
    CREATE POLICY "Users can delete expenses for their property" ON public.expenses
        FOR DELETE USING (public.user_belongs_to_property(auth.uid(), property_id));

    DROP POLICY IF EXISTS "Users can view expense audit logs for their property" ON public.expense_audit_logs;
    CREATE POLICY "Users can view expense audit logs for their property" ON public.expense_audit_logs
        FOR SELECT USING (public.user_belongs_to_property(auth.uid(), property_id));

    DROP POLICY IF EXISTS "Users can insert expense audit logs for their property" ON public.expense_audit_logs;
    CREATE POLICY "Users can insert expense audit logs for their property" ON public.expense_audit_logs
        FOR INSERT WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));
END $$;

-- 5. RPC to generate sequential expense number & create expense with audit entry
CREATE OR REPLACE FUNCTION public.create_hotel_expense(
    p_property_id UUID,
    p_title TEXT,
    p_category_id UUID,
    p_subcategory TEXT,
    p_amount NUMERIC,
    p_currency TEXT,
    p_expense_date DATE,
    p_payment_method TEXT,
    p_vendor_id UUID,
    p_vendor_name TEXT,
    p_department_id UUID,
    p_staff_id UUID,
    p_invoice_number TEXT,
    p_reference_number TEXT,
    p_description TEXT,
    p_notes TEXT,
    p_status TEXT,
    p_receipt_url TEXT,
    p_receipt_file_name TEXT,
    p_user_id UUID,
    p_user_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_year TEXT;
    v_seq_num INT;
    v_expense_number TEXT;
    v_expense_id UUID;
    v_resolved_vendor_name TEXT;
BEGIN
    -- Check user property membership
    IF NOT public.user_belongs_to_property(p_user_id, p_property_id) AND p_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized for property');
    END IF;

    -- Resolve vendor name if vendor_id is given
    IF p_vendor_id IS NOT NULL AND (p_vendor_name IS NULL OR p_vendor_name = '') THEN
        SELECT name INTO v_resolved_vendor_name FROM public.suppliers WHERE id = p_vendor_id;
    ELSE
        v_resolved_vendor_name := p_vendor_name;
    END IF;

    -- Generate Expense Number: EXP-YYYY-XXXX
    v_year := to_char(COALESCE(p_expense_date, CURRENT_DATE), 'YYYY');
    SELECT COUNT(*) + 1 INTO v_seq_num
    FROM public.expenses
    WHERE property_id = p_property_id AND to_char(expense_date, 'YYYY') = v_year;

    v_expense_number := 'EXP-' || v_year || '-' || LPAD(v_seq_num::TEXT, 4, '0');

    -- Insert Expense
    INSERT INTO public.expenses (
        property_id,
        expense_number,
        title,
        category_id,
        subcategory,
        amount,
        currency,
        expense_date,
        payment_method,
        vendor_id,
        vendor_name,
        department_id,
        staff_id,
        invoice_number,
        reference_number,
        description,
        notes,
        status,
        receipt_url,
        receipt_file_name,
        created_by,
        updated_by
    ) VALUES (
        p_property_id,
        v_expense_number,
        p_title,
        p_category_id,
        p_subcategory,
        p_amount,
        COALESCE(p_currency, 'INR'),
        COALESCE(p_expense_date, CURRENT_DATE),
        COALESCE(p_payment_method, 'CASH'),
        p_vendor_id,
        v_resolved_vendor_name,
        p_department_id,
        p_staff_id,
        p_invoice_number,
        p_reference_number,
        p_description,
        p_notes,
        COALESCE(p_status, 'RECORDED'),
        p_receipt_url,
        p_receipt_file_name,
        p_user_id,
        p_user_id
    )
    RETURNING id INTO v_expense_id;

    -- Record Audit Trail
    INSERT INTO public.expense_audit_logs (
        property_id,
        expense_id,
        action,
        performed_by,
        performed_by_name,
        details,
        notes
    ) VALUES (
        p_property_id,
        v_expense_id,
        'CREATED',
        p_user_id,
        p_user_name,
        jsonb_build_object(
            'amount', p_amount,
            'title', p_title,
            'category_id', p_category_id,
            'payment_method', p_payment_method,
            'status', COALESCE(p_status, 'RECORDED')
        ),
        'Expense recorded'
    );

    RETURN jsonb_build_object(
        'success', true,
        'id', v_expense_id,
        'expense_number', v_expense_number
    );
END;
$$;

-- 6. RPC to safely void an expense without destructive deletion
CREATE OR REPLACE FUNCTION public.void_hotel_expense(
    p_property_id UUID,
    p_expense_id UUID,
    p_reason TEXT,
    p_user_id UUID,
    p_user_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_old_status TEXT;
    v_amount NUMERIC;
    v_title TEXT;
BEGIN
    -- Check user property membership
    IF NOT public.user_belongs_to_property(p_user_id, p_property_id) AND p_user_id IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Unauthorized for property');
    END IF;

    -- Fetch current state
    SELECT status, amount, title INTO v_old_status, v_amount, v_title
    FROM public.expenses
    WHERE id = p_expense_id AND property_id = p_property_id;

    IF v_old_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Expense not found');
    END IF;

    IF v_old_status = 'CANCELLED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Expense is already cancelled/voided');
    END IF;

    -- Update status to CANCELLED
    UPDATE public.expenses
    SET status = 'CANCELLED',
        notes = CASE 
            WHEN notes IS NULL OR notes = '' THEN 'Voided: ' || COALESCE(p_reason, 'No reason provided')
            ELSE notes || E'\n[Voided]: ' || COALESCE(p_reason, 'No reason provided')
        END,
        updated_by = p_user_id,
        updated_at = now()
    WHERE id = p_expense_id AND property_id = p_property_id;

    -- Record Audit Log
    INSERT INTO public.expense_audit_logs (
        property_id,
        expense_id,
        action,
        performed_by,
        performed_by_name,
        details,
        notes
    ) VALUES (
        p_property_id,
        p_expense_id,
        'VOIDED',
        p_user_id,
        p_user_name,
        jsonb_build_object(
            'previous_status', v_old_status,
            'new_status', 'CANCELLED',
            'amount', v_amount,
            'title', v_title,
            'reason', p_reason
        ),
        p_reason
    );

    RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Seed standard hotel expense categories for properties that have none
DO $$
DECLARE
    prop RECORD;
BEGIN
    FOR prop IN SELECT id FROM public.properties LOOP
        -- Seed standard categories if none exist for this property
        IF NOT EXISTS (SELECT 1 FROM public.expense_categories WHERE property_id = prop.id) THEN
            INSERT INTO public.expense_categories (property_id, name, description, is_active) VALUES
                (prop.id, 'Utilities', 'Electricity, water, gas, internet and telecom bills', true),
                (prop.id, 'Maintenance & Repairs', 'HVAC, plumbing, electrical, carpentry, building upkeep', true),
                (prop.id, 'Housekeeping & Laundry', 'Linen, cleaning supplies, toiletries, guest amenities', true),
                (prop.id, 'Food & Beverage', 'Raw kitchen ingredients, perishables, bar stock, beverages', true),
                (prop.id, 'Staff & Welfare', 'Staff uniforms, training, staff meals, bonuses, welfare', true),
                (prop.id, 'Marketing & Advertising', 'Online ads, print collateral, social media, signage', true),
                (prop.id, 'Software & IT', 'PMS subscriptions, POS software, domain & hosting, tech hardware', true),
                (prop.id, 'Rent & Property Lease', 'Building lease, land lease, parking space rental', true),
                (prop.id, 'Taxes & Licenses', 'Municipal taxes, commercial licenses, GST/VAT filings, compliance', true),
                (prop.id, 'Office & Administration', 'Stationery, printing, postage, courier, banking fees', true),
                (prop.id, 'Miscellaneous', 'General sundry expenses, emergency petty cash, unexpected costs', true)
            ON CONFLICT (property_id, name) DO NOTHING;
        END IF;
    END LOOP;
END $$;
