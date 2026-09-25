-- ============================================================
-- STAYHUB MIGRATION 18: BILLING, PAYMENTS & GUEST FOLIOS
-- Phase 16: Multi-Tenant Hotel Financial Ledger & Invoicing
-- ============================================================

-- 1. SEQUENCES FOR FOLIO, INVOICE, AND PAYMENT NUMBERS
CREATE SEQUENCE IF NOT EXISTS public.folio_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS public.payment_ref_seq START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_folio_number()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_year VARCHAR;
    v_seq_val BIGINT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YY');
    v_seq_val := nextval('public.folio_number_seq');
    RETURN 'FOL-' || v_year || '-' || lpad(v_seq_val::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_year VARCHAR;
    v_seq_val BIGINT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YY');
    v_seq_val := nextval('public.invoice_number_seq');
    RETURN 'INV-' || v_year || '-' || lpad(v_seq_val::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_payment_reference()
RETURNS VARCHAR
LANGUAGE plpgsql
AS $$
DECLARE
    v_year VARCHAR;
    v_seq_val BIGINT;
BEGIN
    v_year := to_char(CURRENT_DATE, 'YY');
    v_seq_val := nextval('public.payment_ref_seq');
    RETURN 'PAY-' || v_year || '-' || lpad(v_seq_val::text, 6, '0');
END;
$$;

-- 2. GUEST FOLIOS TABLE
CREATE TABLE IF NOT EXISTS public.guest_folios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    folio_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'SETTLED', 'CLOSED', 'VOID')),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_guest_folios_property_number UNIQUE (property_id, folio_number)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_guest_folios_single_active_stay 
ON public.guest_folios(property_id, stay_id) 
WHERE status IN ('OPEN', 'SETTLED');

CREATE INDEX IF NOT EXISTS idx_guest_folios_property_status ON public.guest_folios(property_id, status);
CREATE INDEX IF NOT EXISTS idx_guest_folios_guest_id ON public.guest_folios(guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_folios_stay_id ON public.guest_folios(stay_id);
CREATE INDEX IF NOT EXISTS idx_guest_folios_reservation_id ON public.guest_folios(reservation_id);

-- 3. FOLIO CHARGES TABLE
CREATE TABLE IF NOT EXISTS public.folio_charges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    charge_type VARCHAR(50) NOT NULL CHECK (charge_type IN ('ROOM', 'RESTAURANT', 'ROOM_SERVICE', 'SERVICE', 'TAX', 'DISCOUNT', 'ADJUSTMENT', 'OTHER')),
    source_type VARCHAR(50) NOT NULL CHECK (source_type IN ('STAY', 'RESTAURANT_ORDER', 'GUEST_SERVICE_REQUEST', 'MANUAL', 'OTHER')),
    source_id UUID,
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    charge_date DATE NOT NULL DEFAULT CURRENT_DATE,
    posted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_folio_charges_amounts CHECK (unit_price >= 0 AND subtotal >= 0 AND total_amount >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_folio_charges_source_unique 
ON public.folio_charges(property_id, source_type, source_id) 
WHERE source_id IS NOT NULL AND voided_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_folio_charges_folio_id ON public.folio_charges(folio_id);
CREATE INDEX IF NOT EXISTS idx_folio_charges_property_date ON public.folio_charges(property_id, charge_date);
CREATE INDEX IF NOT EXISTS idx_folio_charges_charge_type ON public.folio_charges(charge_type);

-- 4. FOLIO PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS public.folio_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    payment_reference VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE', 'WALLET', 'OTHER')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    received_by UUID REFERENCES public.profiles(id),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_folio_payments_property_ref UNIQUE (property_id, payment_reference)
);

CREATE INDEX IF NOT EXISTS idx_folio_payments_folio_id ON public.folio_payments(folio_id);
CREATE INDEX IF NOT EXISTS idx_folio_payments_property_paid_at ON public.folio_payments(property_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_folio_payments_status ON public.folio_payments(status);

-- 5. FOLIO REFUNDS TABLE
CREATE TABLE IF NOT EXISTS public.folio_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES public.folio_payments(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'CANCELLED')),
    refunded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folio_refunds_folio_id ON public.folio_refunds(folio_id);
CREATE INDEX IF NOT EXISTS idx_folio_refunds_payment_id ON public.folio_refunds(payment_id);

-- 6. INVOICES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
    stay_id UUID NOT NULL REFERENCES public.stays(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES public.guests(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(50) NOT NULL,
    invoice_status VARCHAR(50) NOT NULL DEFAULT 'ISSUED' CHECK (invoice_status IN ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID')),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    billing_name VARCHAR(255) NOT NULL,
    billing_email VARCHAR(255),
    billing_address TEXT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    voided_at TIMESTAMPTZ,
    void_reason TEXT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_invoices_property_number UNIQUE (property_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_invoices_property_folio ON public.invoices(property_id, folio_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(invoice_status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);

-- 7. INVOICE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    folio_charge_id UUID REFERENCES public.folio_charges(id) ON DELETE SET NULL,
    description VARCHAR(255) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1.00,
    unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- 8. FOLIO EVENTS AUDIT TIMELINE
CREATE TABLE IF NOT EXISTS public.folio_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    folio_id UUID NOT NULL REFERENCES public.guest_folios(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    actor_type VARCHAR(20) NOT NULL CHECK (actor_type IN ('STAFF', 'SYSTEM', 'GUEST')),
    actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_folio_events_folio_id ON public.folio_events(folio_id);
CREATE INDEX IF NOT EXISTS idx_folio_events_property_id ON public.folio_events(property_id);

-- ============================================================
-- 9. CROSS-TENANT INTEGRITY & IMMUTABILITY TRIGGERS
-- ============================================================

-- A. Validate folio tenant relationships
CREATE OR REPLACE FUNCTION public.check_guest_folio_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_stay RECORD;
BEGIN
    SELECT property_id, guest_id, reservation_id INTO v_stay
    FROM public.stays
    WHERE id = NEW.stay_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stay % not found', NEW.stay_id;
    END IF;

    IF v_stay.property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: stay % belongs to property %, not %',
            NEW.stay_id, v_stay.property_id, NEW.property_id;
    END IF;

    IF v_stay.guest_id <> NEW.guest_id THEN
        RAISE EXCEPTION 'Cross-guest violation: stay % belongs to guest %, not %',
            NEW.stay_id, v_stay.guest_id, NEW.guest_id;
    END IF;

    IF v_stay.reservation_id <> NEW.reservation_id THEN
        RAISE EXCEPTION 'Cross-reservation violation: stay % belongs to reservation %, not %',
            NEW.stay_id, v_stay.reservation_id, NEW.reservation_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_guest_folio_tenant ON public.guest_folios;
CREATE TRIGGER trg_check_guest_folio_tenant
BEFORE INSERT OR UPDATE ON public.guest_folios
FOR EACH ROW EXECUTE FUNCTION public.check_guest_folio_tenant();

-- B. Validate folio charge tenant relationships
CREATE OR REPLACE FUNCTION public.check_folio_charge_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_folio RECORD;
BEGIN
    SELECT property_id, stay_id, guest_id INTO v_folio
    FROM public.guest_folios
    WHERE id = NEW.folio_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folio % not found', NEW.folio_id;
    END IF;

    IF v_folio.property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: folio % belongs to property %, not %',
            NEW.folio_id, v_folio.property_id, NEW.property_id;
    END IF;

    IF v_folio.stay_id <> NEW.stay_id THEN
        RAISE EXCEPTION 'Cross-stay violation: folio % belongs to stay %, not %',
            NEW.folio_id, v_folio.stay_id, NEW.stay_id;
    END IF;

    IF v_folio.guest_id <> NEW.guest_id THEN
        RAISE EXCEPTION 'Cross-guest violation: folio % belongs to guest %, not %',
            NEW.folio_id, v_folio.guest_id, NEW.guest_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_folio_charge_tenant ON public.folio_charges;
CREATE TRIGGER trg_check_folio_charge_tenant
BEFORE INSERT OR UPDATE ON public.folio_charges
FOR EACH ROW EXECUTE FUNCTION public.check_folio_charge_tenant();

-- C. Validate folio payment tenant relationships
CREATE OR REPLACE FUNCTION public.check_folio_payment_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_folio RECORD;
BEGIN
    SELECT property_id, stay_id, guest_id INTO v_folio
    FROM public.guest_folios
    WHERE id = NEW.folio_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Folio % not found', NEW.folio_id;
    END IF;

    IF v_folio.property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: folio % belongs to property %, not %',
            NEW.folio_id, v_folio.property_id, NEW.property_id;
    END IF;

    IF v_folio.stay_id <> NEW.stay_id THEN
        RAISE EXCEPTION 'Cross-stay violation: folio % belongs to stay %, not %',
            NEW.folio_id, v_folio.stay_id, NEW.stay_id;
    END IF;

    IF v_folio.guest_id <> NEW.guest_id THEN
        RAISE EXCEPTION 'Cross-guest violation: folio % belongs to guest %, not %',
            NEW.folio_id, v_folio.guest_id, NEW.guest_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_folio_payment_tenant ON public.folio_payments;
CREATE TRIGGER trg_check_folio_payment_tenant
BEFORE INSERT OR UPDATE ON public.folio_payments
FOR EACH ROW EXECUTE FUNCTION public.check_folio_payment_tenant();

-- D. Validate folio refund tenant relationships
CREATE OR REPLACE FUNCTION public.check_folio_refund_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment RECORD;
BEGIN
    SELECT property_id, folio_id, amount, currency, status INTO v_payment
    FROM public.folio_payments
    WHERE id = NEW.payment_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment % not found', NEW.payment_id;
    END IF;

    IF v_payment.property_id <> NEW.property_id THEN
        RAISE EXCEPTION 'Cross-tenant violation: payment % belongs to property %, not %',
            NEW.payment_id, v_payment.property_id, NEW.property_id;
    END IF;

    IF v_payment.folio_id <> NEW.folio_id THEN
        RAISE EXCEPTION 'Cross-folio violation: payment % belongs to folio %, not %',
            NEW.payment_id, v_payment.folio_id, NEW.folio_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_folio_refund_tenant ON public.folio_refunds;
CREATE TRIGGER trg_check_folio_refund_tenant
BEFORE INSERT OR UPDATE ON public.folio_refunds
FOR EACH ROW EXECUTE FUNCTION public.check_folio_refund_tenant();

-- E. Prevent mutation on folio charges once posted (except voiding)
CREATE OR REPLACE FUNCTION public.prevent_folio_charges_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (OLD.unit_price IS DISTINCT FROM NEW.unit_price) OR
       (OLD.subtotal IS DISTINCT FROM NEW.subtotal) OR
       (OLD.discount_amount IS DISTINCT FROM NEW.discount_amount) OR
       (OLD.tax_amount IS DISTINCT FROM NEW.tax_amount) OR
       (OLD.total_amount IS DISTINCT FROM NEW.total_amount) OR
       (OLD.currency IS DISTINCT FROM NEW.currency) OR
       (OLD.source_id IS DISTINCT FROM NEW.source_id) OR
       (OLD.charge_type IS DISTINCT FROM NEW.charge_type) THEN
        RAISE EXCEPTION 'Immutable financial record: cannot alter financial terms of an already posted charge. Please post an adjustment or void the charge instead.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_folio_charges_mutation ON public.folio_charges;
CREATE TRIGGER trg_prevent_folio_charges_mutation
BEFORE UPDATE ON public.folio_charges
FOR EACH ROW EXECUTE FUNCTION public.prevent_folio_charges_mutation();

-- F. Prevent mutation on folio payments once completed (except status update on refund)
CREATE OR REPLACE FUNCTION public.prevent_folio_payments_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF (OLD.amount IS DISTINCT FROM NEW.amount) OR
       (OLD.currency IS DISTINCT FROM NEW.currency) OR
       (OLD.payment_reference IS DISTINCT FROM NEW.payment_reference) OR
       (OLD.payment_method IS DISTINCT FROM NEW.payment_method) THEN
        RAISE EXCEPTION 'Immutable financial record: cannot alter amount or method of an existing payment.';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_folio_payments_mutation ON public.folio_payments;
CREATE TRIGGER trg_prevent_folio_payments_mutation
BEFORE UPDATE ON public.folio_payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_folio_payments_mutation();

-- G. Immutability for Folio Events
CREATE OR REPLACE FUNCTION public.prevent_folio_events_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Financial audit history is strictly immutable and cannot be deleted.';
    END IF;
    IF TG_OP = 'UPDATE' THEN
        IF (OLD.event_type IS DISTINCT FROM NEW.event_type) OR
           (OLD.event_data IS DISTINCT FROM NEW.event_data) OR
           (OLD.created_at IS DISTINCT FROM NEW.created_at) THEN
            RAISE EXCEPTION 'Financial audit history is strictly immutable and cannot be updated.';
        END IF;
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_folio_events_mutation ON public.folio_events;
CREATE TRIGGER trg_prevent_folio_events_mutation
BEFORE UPDATE OR DELETE ON public.folio_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_folio_events_mutation();

-- ============================================================
-- 10. ROW LEVEL SECURITY POLICIES
-- ============================================================

ALTER TABLE public.guest_folios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folio_events ENABLE ROW LEVEL SECURITY;

-- Staff RLS Policies: Property-Scoped
CREATE POLICY "Staff can view property folios"
ON public.guest_folios FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property folios"
ON public.guest_folios FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can update property folios"
ON public.guest_folios FOR UPDATE
USING (public.user_belongs_to_property(auth.uid(), property_id))
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can view property charges"
ON public.folio_charges FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property charges"
ON public.folio_charges FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can update property charges"
ON public.folio_charges FOR UPDATE
USING (public.user_belongs_to_property(auth.uid(), property_id))
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can view property payments"
ON public.folio_payments FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property payments"
ON public.folio_payments FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can update property payments"
ON public.folio_payments FOR UPDATE
USING (public.user_belongs_to_property(auth.uid(), property_id))
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can view property refunds"
ON public.folio_refunds FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property refunds"
ON public.folio_refunds FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can view property invoices"
ON public.invoices FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property invoices"
ON public.invoices FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can update property invoices"
ON public.invoices FOR UPDATE
USING (public.user_belongs_to_property(auth.uid(), property_id))
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can view property invoice items"
ON public.invoice_items FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property invoice items"
ON public.invoice_items FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can view property folio events"
ON public.folio_events FOR SELECT
USING (public.user_belongs_to_property(auth.uid(), property_id));

CREATE POLICY "Staff can insert property folio events"
ON public.folio_events FOR INSERT
WITH CHECK (public.user_belongs_to_property(auth.uid(), property_id));

-- ============================================================
-- 11. ATOMIC FINANCIAL RPCS
-- ============================================================

-- A. Authoritative Folio Balance Calculation Helper
CREATE OR REPLACE FUNCTION public.get_folio_balance(
    p_folio_id UUID,
    p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_folio RECORD;
    v_charges_subtotal NUMERIC(12,2) := 0.00;
    v_discounts_total NUMERIC(12,2) := 0.00;
    v_taxes_total NUMERIC(12,2) := 0.00;
    v_gross_charges NUMERIC(12,2) := 0.00;
    v_payments_total NUMERIC(12,2) := 0.00;
    v_refunds_total NUMERIC(12,2) := 0.00;
    v_net_payments NUMERIC(12,2) := 0.00;
    v_balance_due NUMERIC(12,2) := 0.00;
BEGIN
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE id = p_folio_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
    END IF;

    -- Aggregate active charges (voided charges are excluded)
    SELECT 
        COALESCE(SUM(subtotal), 0.00),
        COALESCE(SUM(discount_amount), 0.00),
        COALESCE(SUM(tax_amount), 0.00),
        COALESCE(SUM(total_amount), 0.00)
    INTO v_charges_subtotal, v_discounts_total, v_taxes_total, v_gross_charges
    FROM public.folio_charges
    WHERE folio_id = p_folio_id AND voided_at IS NULL;

    -- Aggregate completed payments
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_payments_total
    FROM public.folio_payments
    WHERE folio_id = p_folio_id AND status IN ('COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED');

    -- Aggregate completed refunds
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_refunds_total
    FROM public.folio_refunds
    WHERE folio_id = p_folio_id AND status = 'COMPLETED';

    v_net_payments := v_payments_total - v_refunds_total;
    v_balance_due := v_gross_charges - v_net_payments;

    RETURN jsonb_build_object(
        'success', true,
        'folio_id', p_folio_id,
        'property_id', p_property_id,
        'currency', v_folio.currency,
        'status', v_folio.status,
        'charges_subtotal', v_charges_subtotal,
        'discounts_total', v_discounts_total,
        'taxes_total', v_taxes_total,
        'gross_charges', v_gross_charges,
        'payments_total', v_payments_total,
        'refunds_total', v_refunds_total,
        'net_payments', v_net_payments,
        'balance_due', v_balance_due
    );
END;
$$;

-- B. Get or Create Primary Active Stay Folio
CREATE OR REPLACE FUNCTION public.get_or_create_stay_folio(
    p_stay_id UUID,
    p_property_id UUID,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stay RECORD;
    v_prop RECORD;
    v_folio RECORD;
    v_folio_number VARCHAR(50);
BEGIN
    -- 1. Fetch Stay Details
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = p_stay_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stay not found');
    END IF;

    -- 2. Check for Existing Active Folio
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE stay_id = p_stay_id AND property_id = p_property_id AND status IN ('OPEN', 'SETTLED')
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'folio', to_jsonb(v_folio),
            'created', false
        );
    END IF;

    -- 3. Fetch Property Currency
    SELECT currency INTO v_prop FROM public.properties WHERE id = p_property_id;

    -- 4. Generate Folio Number and Insert
    v_folio_number := public.generate_folio_number();

    INSERT INTO public.guest_folios (
        property_id,
        stay_id,
        guest_id,
        reservation_id,
        folio_number,
        status,
        currency,
        opened_at,
        created_by,
        updated_by
    ) VALUES (
        p_property_id,
        p_stay_id,
        v_stay.guest_id,
        v_stay.reservation_id,
        v_folio_number,
        'OPEN',
        COALESCE(v_prop.currency, 'INR'),
        now(),
        p_performed_by,
        p_performed_by
    ) RETURNING * INTO v_folio;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        v_folio.id,
        'FOLIO_OPENED',
        CASE WHEN p_performed_by IS NOT NULL THEN 'STAFF' ELSE 'SYSTEM' END,
        p_performed_by,
        jsonb_build_object(
            'folio_number', v_folio.folio_number,
            'stay_id', p_stay_id,
            'guest_id', v_stay.guest_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'folio', to_jsonb(v_folio),
        'created', true
    );
END;
$$;

-- C. Post Room Charges for a Stay (Idempotent per Reservation Room)
CREATE OR REPLACE FUNCTION public.post_room_charges_for_stay(
    p_stay_id UUID,
    p_property_id UUID,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stay RECORD;
    v_res_room RECORD;
    v_folio RECORD;
    v_folio_res JSONB;
    v_nights NUMERIC(12,2);
    v_unit_rate NUMERIC(12,2);
    v_subtotal NUMERIC(12,2);
    v_tax_rate NUMERIC(12,4) := 0.12; -- 12% standard hotel room GST
    v_tax_amount NUMERIC(12,2);
    v_source_id UUID;
    v_charge_date DATE;
BEGIN
    -- 1. Fetch Stay & Reservation Room Record
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = p_stay_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stay not found');
    END IF;

    IF v_stay.reservation_room_id IS NOT NULL THEN
        SELECT * INTO v_res_room
        FROM public.reservation_rooms
        WHERE id = v_stay.reservation_room_id AND property_id = p_property_id;

        IF FOUND THEN
            v_source_id := v_res_room.id;
            v_unit_rate := COALESCE(v_res_room.rate_per_night, 0.00);
        ELSE
            v_source_id := v_stay.id;
            SELECT COALESCE(rt.base_rate, 0.00) INTO v_unit_rate
            FROM public.rooms r
            JOIN public.room_types rt ON rt.id = r.room_type_id
            WHERE r.id = v_stay.room_id;
        END IF;
    ELSE
        v_source_id := v_stay.id;
        SELECT COALESCE(rt.base_rate, 0.00) INTO v_unit_rate
        FROM public.rooms r
        JOIN public.room_types rt ON rt.id = r.room_type_id
        WHERE r.id = v_stay.room_id;
    END IF;

    -- 2. Resolve Active Folio
    v_folio_res := public.get_or_create_stay_folio(p_stay_id, p_property_id, p_performed_by);
    IF NOT (v_folio_res->>'success')::boolean THEN
        RETURN v_folio_res;
    END IF;

    -- 3. Check for Existing Active Room Charge for this Source
    SELECT * INTO v_charge
    FROM public.folio_charges
    WHERE property_id = p_property_id 
      AND source_type = 'STAY' 
      AND source_id = v_source_id 
      AND voided_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'charge', to_jsonb(v_charge),
            'already_posted', true
        );
    END IF;

    -- 4. Calculate Room Charges (Rate * Nights + Tax)
    v_charge_date := COALESCE(v_stay.actual_check_in_at::date, CURRENT_DATE);
    v_nights := GREATEST(1, (v_stay.expected_check_out_date - v_charge_date));
    v_unit_rate := COALESCE(v_unit_rate, 0.00);
    v_subtotal := ROUND(v_unit_rate * v_nights, 2);
    v_tax_amount := ROUND(v_subtotal * v_tax_rate, 2);
    v_total_amount := v_subtotal + v_tax_amount;

    -- 5. Insert Folio Charge
    INSERT INTO public.folio_charges (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        charge_type,
        source_type,
        source_id,
        description,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        currency,
        charge_date,
        posted_at,
        created_by
    ) VALUES (
        p_property_id,
        (v_folio_res->'folio'->>'id')::UUID,
        p_stay_id,
        v_stay.guest_id,
        'ROOM',
        'STAY',
        v_source_id,
        'Room Accommodation (' || v_nights::int || ' night' || CASE WHEN v_nights > 1 THEN 's' ELSE '' END || ')',
        v_nights,
        v_unit_rate,
        v_subtotal,
        0.00,
        v_tax_amount,
        v_total_amount,
        COALESCE(v_folio_res->'folio'->>'currency', 'INR'),
        v_charge_date,
        now(),
        p_performed_by
    ) RETURNING * INTO v_charge;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        (v_folio_res->'folio'->>'id')::UUID,
        'CHARGE_POSTED',
        CASE WHEN p_performed_by IS NOT NULL THEN 'STAFF' ELSE 'SYSTEM' END,
        p_performed_by,
        jsonb_build_object(
            'charge_id', v_charge.id,
            'charge_type', 'ROOM',
            'amount', v_charge.total_amount,
            'description', v_charge.description
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'charge', to_jsonb(v_charge),
        'already_posted', false
    );
END;
$$;

-- D. Post Restaurant/Room Service Order to Folio (Idempotent per Order)
CREATE OR REPLACE FUNCTION public.post_restaurant_order_to_folio(
    p_order_id UUID,
    p_stay_id UUID,
    p_property_id UUID,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_stay RECORD;
    v_folio_res JSONB;
    v_charge RECORD;
    v_charge_type VARCHAR(50);
BEGIN
    -- 1. Fetch Restaurant Order
    SELECT * INTO v_order
    FROM public.restaurant_orders
    WHERE id = p_order_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Restaurant order not found');
    END IF;

    -- 2. Fetch Stay
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = p_stay_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Stay not found');
    END IF;

    -- 3. Resolve Folio
    v_folio_res := public.get_or_create_stay_folio(p_stay_id, p_property_id, p_performed_by);
    IF NOT (v_folio_res->>'success')::boolean THEN
        RETURN v_folio_res;
    END IF;

    -- 4. Check for Existing Active Charge for this Order
    SELECT * INTO v_charge
    FROM public.folio_charges
    WHERE property_id = p_property_id 
      AND source_type = 'RESTAURANT_ORDER' 
      AND source_id = p_order_id 
      AND voided_at IS NULL
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'charge', to_jsonb(v_charge),
            'already_posted', true
        );
    END IF;

    -- 5. Determine Charge Type
    IF v_order.order_type = 'ROOM_SERVICE' THEN
        v_charge_type := 'ROOM_SERVICE';
    ELSE
        v_charge_type := 'RESTAURANT';
    END IF;

    -- 6. Insert Folio Charge
    INSERT INTO public.folio_charges (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        charge_type,
        source_type,
        source_id,
        description,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        currency,
        charge_date,
        posted_at,
        created_by
    ) VALUES (
        p_property_id,
        (v_folio_res->'folio'->>'id')::UUID,
        p_stay_id,
        v_stay.guest_id,
        v_charge_type,
        'RESTAURANT_ORDER',
        p_order_id,
        'Food & Beverage (' || v_order.order_number || ' - ' || v_order.order_type || ')',
        1.00,
        v_order.subtotal,
        v_order.subtotal,
        COALESCE(v_order.discount_amount, 0.00),
        COALESCE(v_order.tax_amount, 0.00),
        v_order.total_amount,
        COALESCE(v_order.currency, 'INR'),
        CURRENT_DATE,
        now(),
        p_performed_by
    ) RETURNING * INTO v_charge;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        (v_folio_res->'folio'->>'id')::UUID,
        'CHARGE_POSTED',
        CASE WHEN p_performed_by IS NOT NULL THEN 'STAFF' ELSE 'SYSTEM' END,
        p_performed_by,
        jsonb_build_object(
            'charge_id', v_charge.id,
            'charge_type', v_charge_type,
            'amount', v_charge.total_amount,
            'order_number', v_order.order_number
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'charge', to_jsonb(v_charge),
        'already_posted', false
    );
END;
$$;

-- E. Post Manual Folio Charge / Adjustment
CREATE OR REPLACE FUNCTION public.post_manual_folio_charge(
    p_folio_id UUID,
    p_property_id UUID,
    p_charge_type VARCHAR,
    p_description TEXT,
    p_quantity NUMERIC,
    p_unit_price NUMERIC,
    p_tax_amount NUMERIC DEFAULT 0.00,
    p_discount_amount NUMERIC DEFAULT 0.00,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_folio RECORD;
    v_subtotal NUMERIC(12,2);
    v_total_amount NUMERIC(12,2);
    v_charge RECORD;
BEGIN
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE id = p_folio_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
    END IF;

    IF v_folio.status IN ('CLOSED', 'VOID') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot post charge to a closed or voided folio');
    END IF;

    IF p_quantity <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Quantity must be greater than zero');
    END IF;

    IF p_discount_amount < 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Discount amount cannot be negative');
    END IF;

    v_subtotal := ROUND(p_quantity * p_unit_price, 2);
    v_total_amount := v_subtotal - COALESCE(p_discount_amount, 0.00) + COALESCE(p_tax_amount, 0.00);

    INSERT INTO public.folio_charges (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        charge_type,
        source_type,
        source_id,
        description,
        quantity,
        unit_price,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        currency,
        charge_date,
        posted_at,
        created_by
    ) VALUES (
        p_property_id,
        p_folio_id,
        v_folio.stay_id,
        v_folio.guest_id,
        p_charge_type,
        'MANUAL',
        NULL,
        p_description,
        p_quantity,
        p_unit_price,
        v_subtotal,
        COALESCE(p_discount_amount, 0.00),
        COALESCE(p_tax_amount, 0.00),
        v_total_amount,
        v_folio.currency,
        CURRENT_DATE,
        now(),
        p_performed_by
    ) RETURNING * INTO v_charge;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        p_folio_id,
        'CHARGE_POSTED',
        'STAFF',
        p_performed_by,
        jsonb_build_object(
            'charge_id', v_charge.id,
            'charge_type', p_charge_type,
            'amount', v_charge.total_amount,
            'description', p_description
        )
    );

    RETURN jsonb_build_object('success', true, 'charge', to_jsonb(v_charge));
END;
$$;

-- F. Void a Folio Charge
CREATE OR REPLACE FUNCTION public.void_folio_charge(
    p_charge_id UUID,
    p_property_id UUID,
    p_reason TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_charge RECORD;
BEGIN
    SELECT * INTO v_charge
    FROM public.folio_charges
    WHERE id = p_charge_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folio charge not found');
    END IF;

    IF v_charge.voided_at IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Charge has already been voided');
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'A reason is required to void a charge');
    END IF;

    UPDATE public.folio_charges
    SET 
        voided_at = now(),
        void_reason = p_reason,
        updated_at = now()
    WHERE id = p_charge_id;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        v_charge.folio_id,
        'CHARGE_VOIDED',
        'STAFF',
        p_performed_by,
        jsonb_build_object(
            'charge_id', p_charge_id,
            'amount', v_charge.total_amount,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', true, 'charge_id', p_charge_id);
END;
$$;

-- G. Record Folio Payment
CREATE OR REPLACE FUNCTION public.record_folio_payment(
    p_folio_id UUID,
    p_property_id UUID,
    p_payment_method VARCHAR,
    p_amount NUMERIC,
    p_notes TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_folio RECORD;
    v_balance_info JSONB;
    v_payment_ref VARCHAR(50);
    v_payment RECORD;
BEGIN
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE id = p_folio_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Folio not found');
    END IF;

    IF v_folio.status IN ('CLOSED', 'VOID') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot record payment for a closed or voided folio');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero');
    END IF;

    v_payment_ref := public.generate_payment_reference();

    INSERT INTO public.folio_payments (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        payment_reference,
        payment_method,
        amount,
        currency,
        status,
        paid_at,
        received_by,
        notes
    ) VALUES (
        p_property_id,
        p_folio_id,
        v_folio.stay_id,
        v_folio.guest_id,
        v_payment_ref,
        p_payment_method,
        ROUND(p_amount, 2),
        v_folio.currency,
        'COMPLETED',
        now(),
        p_performed_by,
        p_notes
    ) RETURNING * INTO v_payment;

    -- Recalculate balance
    v_balance_info := public.get_folio_balance(p_folio_id, p_property_id);

    -- If balance is now <= 0, mark folio as SETTLED
    IF (v_balance_info->>'balance_due')::numeric <= 0 THEN
        UPDATE public.guest_folios
        SET status = 'SETTLED', updated_at = now(), updated_by = p_performed_by
        WHERE id = p_folio_id AND status = 'OPEN';
    END IF;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        p_folio_id,
        'PAYMENT_RECORDED',
        'STAFF',
        p_performed_by,
        jsonb_build_object(
            'payment_id', v_payment.id,
            'payment_reference', v_payment_ref,
            'amount', v_payment.amount,
            'method', p_payment_method,
            'balance_due', (v_balance_info->>'balance_due')::numeric
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment', to_jsonb(v_payment),
        'balance', v_balance_info
    );
END;
$$;

-- H. Refund a Folio Payment
CREATE OR REPLACE FUNCTION public.refund_folio_payment(
    p_payment_id UUID,
    p_property_id UUID,
    p_amount NUMERIC,
    p_reason TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_payment RECORD;
    v_prior_refunds NUMERIC(12,2) := 0.00;
    v_max_refundable NUMERIC(12,2);
    v_refund RECORD;
    v_new_payment_status VARCHAR(50);
BEGIN
    SELECT * INTO v_payment
    FROM public.folio_payments
    WHERE id = p_payment_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment not found');
    END IF;

    IF v_payment.status IN ('VOIDED', 'REFUNDED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment has already been fully refunded or voided');
    END IF;

    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Refund amount must be greater than zero');
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'A reason is required to process a refund');
    END IF;

    -- Calculate total prior refunds for this payment
    SELECT COALESCE(SUM(amount), 0.00) INTO v_prior_refunds
    FROM public.folio_refunds
    WHERE payment_id = p_payment_id AND status = 'COMPLETED';

    v_max_refundable := v_payment.amount - v_prior_refunds;

    IF p_amount > v_max_refundable THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Refund amount (' || p_amount || ') exceeds refundable balance (' || v_max_refundable || ')'
        );
    END IF;

    -- Insert Refund Record
    INSERT INTO public.folio_refunds (
        property_id,
        folio_id,
        payment_id,
        amount,
        currency,
        reason,
        status,
        refunded_at,
        processed_by
    ) VALUES (
        p_property_id,
        v_payment.folio_id,
        p_payment_id,
        ROUND(p_amount, 2),
        v_payment.currency,
        p_reason,
        'COMPLETED',
        now(),
        p_performed_by
    ) RETURNING * INTO v_refund;

    -- Update parent payment status
    IF (v_prior_refunds + p_amount) >= v_payment.amount THEN
        v_new_payment_status := 'REFUNDED';
    ELSE
        v_new_payment_status := 'PARTIALLY_REFUNDED';
    END IF;

    UPDATE public.folio_payments
    SET status = v_new_payment_status, updated_at = now()
    WHERE id = p_payment_id;

    -- If folio was settled, re-evaluate status
    UPDATE public.guest_folios
    SET status = 'OPEN', updated_at = now(), updated_by = p_performed_by
    WHERE id = v_payment.folio_id AND status = 'SETTLED';

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        v_payment.folio_id,
        'REFUND_PROCESSED',
        'STAFF',
        p_performed_by,
        jsonb_build_object(
            'refund_id', v_refund.id,
            'payment_id', p_payment_id,
            'amount', v_refund.amount,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'refund', to_jsonb(v_refund),
        'payment_status', v_new_payment_status
    );
END;
$$;

-- I. Generate Finalized Invoice from Active Folio
CREATE OR REPLACE FUNCTION public.generate_invoice(
    p_folio_id UUID,
    p_property_id UUID,
    p_billing_name VARCHAR DEFAULT NULL,
    p_billing_email VARCHAR DEFAULT NULL,
    p_billing_address TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_folio RECORD;
    v_guest RECORD;
    v_balance_info JSONB;
    v_inv_number VARCHAR(50);
    v_invoice RECORD;
    v_charge RECORD;
    v_name VARCHAR;
    v_email VARCHAR;
BEGIN
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE id = p_folio_id AND property_id = p_property_id;

    -- 1. Check if an active invoice already exists for this folio
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE folio_id = p_folio_id AND property_id = p_property_id AND invoice_status <> 'VOID'
    ORDER BY created_at DESC
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'invoice', to_jsonb(v_invoice),
            'already_generated', true
        );
    END IF;

    -- Fetch guest details for billing defaults
    SELECT * INTO v_guest FROM public.guests WHERE id = v_folio.guest_id;

    v_name := COALESCE(p_billing_name, v_guest.first_name || ' ' || v_guest.last_name);
    v_email := COALESCE(p_billing_email, v_guest.email);

    -- Calculate authoritative balance
    v_balance_info := public.get_folio_balance(p_folio_id, p_property_id);

    v_inv_number := public.generate_invoice_number();

    INSERT INTO public.invoices (
        property_id,
        folio_id,
        stay_id,
        guest_id,
        invoice_number,
        invoice_status,
        invoice_date,
        due_date,
        currency,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        paid_amount,
        balance_due,
        billing_name,
        billing_email,
        billing_address,
        issued_at,
        created_by
    ) VALUES (
        p_property_id,
        p_folio_id,
        v_folio.stay_id,
        v_folio.guest_id,
        v_inv_number,
        CASE WHEN (v_balance_info->>'balance_due')::numeric <= 0 THEN 'PAID' ELSE 'ISSUED' END,
        CURRENT_DATE,
        CURRENT_DATE,
        v_folio.currency,
        (v_balance_info->>'charges_subtotal')::numeric,
        (v_balance_info->>'discounts_total')::numeric,
        (v_balance_info->>'taxes_total')::numeric,
        (v_balance_info->>'gross_charges')::numeric,
        (v_balance_info->>'net_payments')::numeric,
        (v_balance_info->>'balance_due')::numeric,
        v_name,
        v_email,
        p_billing_address,
        now(),
        p_performed_by
    ) RETURNING * INTO v_invoice;

    -- Snapshot active folio charges into invoice items
    FOR v_charge IN 
        SELECT * FROM public.folio_charges 
        WHERE folio_id = p_folio_id AND voided_at IS NULL
        ORDER BY charge_date ASC, posted_at ASC
    LOOP
        INSERT INTO public.invoice_items (
            property_id,
            invoice_id,
            folio_charge_id,
            description,
            quantity,
            unit_price,
            subtotal,
            discount_amount,
            tax_amount,
            total_amount
        ) VALUES (
            p_property_id,
            v_invoice.id,
            v_charge.id,
            v_charge.description,
            v_charge.quantity,
            v_charge.unit_price,
            v_charge.subtotal,
            v_charge.discount_amount,
            v_charge.tax_amount,
            v_charge.total_amount
        );
    END LOOP;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        p_folio_id,
        'INVOICE_GENERATED',
        'STAFF',
        p_performed_by,
        jsonb_build_object(
            'invoice_id', v_invoice.id,
            'invoice_number', v_inv_number,
            'total_amount', v_invoice.total_amount,
            'balance_due', v_invoice.balance_due
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'invoice', to_jsonb(v_invoice)
    );
END;
$$;

-- J. Void an Invoice
CREATE OR REPLACE FUNCTION public.void_invoice(
    p_invoice_id UUID,
    p_property_id UUID,
    p_reason TEXT,
    p_performed_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invoice RECORD;
BEGIN
    SELECT * INTO v_invoice
    FROM public.invoices
    WHERE id = p_invoice_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invoice not found');
    END IF;

    IF v_invoice.invoice_status = 'VOID' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invoice is already voided');
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RETURN jsonb_build_object('success', false, 'error', 'A reason is required to void an invoice');
    END IF;

    UPDATE public.invoices
    SET 
        invoice_status = 'VOID',
        voided_at = now(),
        void_reason = p_reason,
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Record Audit Event
    INSERT INTO public.folio_events (
        property_id,
        folio_id,
        event_type,
        actor_type,
        actor_profile_id,
        event_data
    ) VALUES (
        p_property_id,
        v_invoice.folio_id,
        'INVOICE_VOIDED',
        'STAFF',
        p_performed_by,
        jsonb_build_object(
            'invoice_id', p_invoice_id,
            'invoice_number', v_invoice.invoice_number,
            'reason', p_reason
        )
    );

    RETURN jsonb_build_object('success', true, 'invoice_id', p_invoice_id);
END;
$$;

-- K. Secure Guest Portal RPC: Get Verified Guest's Folio
CREATE OR REPLACE FUNCTION public.get_guest_folio(
    p_session_token_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session RECORD;
    v_folio RECORD;
    v_charges JSONB;
    v_payments JSONB;
    v_balance_info JSONB;
BEGIN
    -- 1. Validate guest session
    SELECT * INTO v_session
    FROM public.guest_sessions
    WHERE session_token_hash = p_session_token_hash
      AND revoked_at IS NULL
      AND expires_at > now();

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired guest session');
    END IF;

    IF v_session.session_type <> 'VERIFIED_STAY' OR v_session.stay_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Verified stay required to access guest billing');
    END IF;

    -- 2. Fetch or create active stay folio
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE stay_id = v_session.stay_id 
      AND property_id = v_session.property_id
      AND status IN ('OPEN', 'SETTLED')
    LIMIT 1;

    IF NOT FOUND THEN
        -- Return empty zero balance context if no folio has been posted yet
        RETURN jsonb_build_object(
            'success', true,
            'has_folio', false,
            'balance_due', 0.00,
            'currency', 'INR',
            'charges', '[]'::jsonb,
            'payments', '[]'::jsonb
        );
    END IF;

    -- 3. Fetch sanitized charges (excluding voided charges and internal staff audit data)
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', c.id,
            'charge_type', c.charge_type,
            'description', c.description,
            'quantity', c.quantity,
            'unit_price', c.unit_price,
            'subtotal', c.subtotal,
            'tax_amount', c.tax_amount,
            'total_amount', c.total_amount,
            'currency', c.currency,
            'charge_date', c.charge_date,
            'posted_at', c.posted_at
        ) ORDER BY c.posted_at ASC
    ), '[]'::jsonb) INTO v_charges
    FROM public.folio_charges c
    WHERE c.folio_id = v_folio.id AND c.voided_at IS NULL;

    -- 4. Fetch sanitized payments
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', p.id,
            'payment_reference', p.payment_reference,
            'payment_method', p.payment_method,
            'amount', p.amount,
            'currency', p.currency,
            'status', p.status,
            'paid_at', p.paid_at
        ) ORDER BY p.paid_at ASC
    ), '[]'::jsonb) INTO v_payments
    FROM public.folio_payments p
    WHERE p.folio_id = v_folio.id;

    -- 5. Authoritative Balance
    v_balance_info := public.get_folio_balance(v_folio.id, v_session.property_id);

    RETURN jsonb_build_object(
        'success', true,
        'has_folio', true,
        'folio_number', v_folio.folio_number,
        'status', v_folio.status,
        'currency', v_folio.currency,
        'charges_subtotal', (v_balance_info->>'charges_subtotal')::numeric,
        'taxes_total', (v_balance_info->>'taxes_total')::numeric,
        'gross_charges', (v_balance_info->>'gross_charges')::numeric,
        'net_payments', (v_balance_info->>'net_payments')::numeric,
        'balance_due', (v_balance_info->>'balance_due')::numeric,
        'charges', v_charges,
        'payments', v_payments
    );
END;
$$;

-- L. Enhanced Check-Out RPC with Settlement Verification
CREATE OR REPLACE FUNCTION public.check_out_stay(
    p_stay_id UUID,
    p_property_id UUID,
    p_allow_unpaid_override BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_has_role BOOLEAN;
    v_stay RECORD;
    v_folio RECORD;
    v_balance_info JSONB;
    v_balance_due NUMERIC(12,2) := 0.00;
    v_uncompleted_rooms_count INTEGER;
    v_active_task_exists BOOLEAN;
BEGIN
    -- 1. Authentication & Role Validation
    v_user_id := auth.uid();
    IF v_user_id IS NOT NULL THEN
        v_has_role := public.user_has_property_role(
            v_user_id,
            p_property_id,
            ARRAY['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'FRONT_DESK', 'RECEPTIONIST']
        );

        IF NOT v_has_role THEN
            RAISE EXCEPTION 'Unauthorized: front desk check-out permissions required';
        END IF;
    END IF;

    -- 2. Fetch & Validate Stay
    SELECT * INTO v_stay
    FROM public.stays
    WHERE id = p_stay_id AND property_id = p_property_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Stay record % not found for property %', p_stay_id, p_property_id;
    END IF;

    IF v_stay.status <> 'CHECKED_IN' THEN
        RAISE EXCEPTION 'Cannot check out stay with status % (must be CHECKED_IN)', v_stay.status;
    END IF;

    -- 3. Check Financial Settlement on Active Folio
    SELECT * INTO v_folio
    FROM public.guest_folios
    WHERE stay_id = p_stay_id AND property_id = p_property_id AND status IN ('OPEN', 'SETTLED')
    LIMIT 1;

    IF FOUND THEN
        v_balance_info := public.get_folio_balance(v_folio.id, p_property_id);
        v_balance_due := (v_balance_info->>'balance_due')::numeric;

        IF v_balance_due > 0 AND NOT p_allow_unpaid_override THEN
            RAISE EXCEPTION 'Cannot complete checkout: Outstanding folio balance of % % must be settled or authorized with override.',
                v_folio.currency, v_balance_due;
        END IF;

        -- Close/Settle Folio upon checkout
        UPDATE public.guest_folios
        SET 
            status = CASE WHEN v_balance_due <= 0 THEN 'CLOSED' ELSE 'SETTLED' END,
            closed_at = now(),
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_folio.id;

        -- Record Audit Event
        INSERT INTO public.folio_events (
            property_id,
            folio_id,
            event_type,
            actor_type,
            actor_profile_id,
            event_data
        ) VALUES (
            p_property_id,
            v_folio.id,
            'CHECKOUT_SETTLEMENT',
            'STAFF',
            v_user_id,
            jsonb_build_object(
                'stay_id', p_stay_id,
                'balance_due', v_balance_due,
                'override_used', p_allow_unpaid_override
            )
        );
    END IF;

    -- 4. Update Stay to CHECKED_OUT
    UPDATE public.stays
    SET 
        status = 'CHECKED_OUT',
        actual_check_out_at = now(),
        check_out_by = v_user_id,
        updated_by = v_user_id,
        updated_at = now()
    WHERE id = p_stay_id;

    -- 5. Transition Room Status to DIRTY (Housekeeping Lifecycle Start) & Trigger Housekeeping Task
    IF v_stay.room_id IS NOT NULL THEN
        UPDATE public.rooms
        SET 
            status = 'DIRTY',
            housekeeping_status = 'DIRTY',
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_stay.room_id;

        SELECT EXISTS (
            SELECT 1 FROM public.housekeeping_tasks
            WHERE room_id = v_stay.room_id
              AND task_type = 'CLEANING'
              AND status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'INSPECTION_PENDING')
        ) INTO v_active_task_exists;

        IF NOT v_active_task_exists THEN
            INSERT INTO public.housekeeping_tasks (
                property_id,
                room_id,
                task_type,
                status,
                priority,
                scheduled_for,
                notes,
                created_by
            ) VALUES (
                p_property_id,
                v_stay.room_id,
                'CLEANING',
                'PENDING',
                'NORMAL',
                CURRENT_DATE,
                'Automatic checkout cleaning task generated',
                v_user_id
            );
        END IF;
    END IF;

    -- 6. Multi-room Parent Reservation Completion Check
    SELECT count(*) INTO v_uncompleted_rooms_count
    FROM public.reservation_rooms rr
    WHERE rr.reservation_id = v_stay.reservation_id
      AND rr.is_cancelled = false
      AND NOT EXISTS (
          SELECT 1 FROM public.stays s 
          WHERE s.reservation_room_id = rr.id AND s.status = 'CHECKED_OUT'
      );

    IF v_uncompleted_rooms_count = 0 THEN
        UPDATE public.reservations
        SET 
            status = 'COMPLETED',
            updated_by = v_user_id,
            updated_at = now()
        WHERE id = v_stay.reservation_id;
    END IF;

    -- 7. Invalidate Active Guest QR Sessions for this Stay
    UPDATE public.guest_sessions
    SET revoked_at = now(), updated_at = now()
    WHERE stay_id = p_stay_id AND revoked_at IS NULL;

    RETURN jsonb_build_object(
        'success', true,
        'stay_id', p_stay_id,
        'status', 'CHECKED_OUT',
        'balance_due', v_balance_due
    );
END;
$$;
