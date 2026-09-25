-- Migration: Phase 17 Inventory and Suppliers
-- Create tables

CREATE TABLE IF NOT EXISTS public.inventory_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, name)
);

CREATE TABLE IF NOT EXISTS public.inventory_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location_type TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, name)
);

CREATE TABLE IF NOT EXISTS public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
    sku TEXT,
    name TEXT NOT NULL,
    description TEXT,
    item_type TEXT NOT NULL,
    unit_of_measure TEXT NOT NULL,
    base_unit TEXT,
    reorder_level NUMERIC(12,2) DEFAULT 0,
    reorder_quantity NUMERIC(12,2) DEFAULT 0,
    par_level NUMERIC(12,2) DEFAULT 0,
    is_perishable BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    track_batch BOOLEAN DEFAULT false,
    track_expiry BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(property_id, sku)
);

CREATE TABLE IF NOT EXISTS public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    supplier_code TEXT,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    alternate_phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    gst_number TEXT,
    payment_terms TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    UNIQUE(property_id, supplier_code)
);

CREATE TABLE IF NOT EXISTS public.supplier_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    designation TEXT,
    email TEXT,
    phone TEXT,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    manufactured_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    quantity NUMERIC(12,2) DEFAULT 0,
    unit_cost NUMERIC(12,2) DEFAULT 0,
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, inventory_item_id, batch_number)
);

CREATE TABLE IF NOT EXISTS public.inventory_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    quantity NUMERIC(12,2) DEFAULT 0,
    reserved_quantity NUMERIC(12,2) DEFAULT 0,
    available_quantity NUMERIC(12,2) DEFAULT 0,
    average_unit_cost NUMERIC(12,2) DEFAULT 0,
    last_received_at TIMESTAMPTZ,
    last_movement_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, inventory_item_id, location_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL,
    quantity NUMERIC(12,2) NOT NULL,
    unit_cost NUMERIC(12,2),
    reference_type TEXT,
    reference_id UUID,
    reason TEXT,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    po_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    order_date DATE DEFAULT CURRENT_DATE,
    expected_date DATE,
    currency TEXT DEFAULT 'INR',
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, po_number)
);

CREATE TABLE IF NOT EXISTS public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    description TEXT,
    ordered_quantity NUMERIC(12,2) NOT NULL,
    received_quantity NUMERIC(12,2) DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    line_total NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.goods_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT now(),
    received_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    goods_receipt_id UUID NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
    purchase_order_item_id UUID NOT NULL REFERENCES public.purchase_order_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    received_quantity NUMERIC(12,2) NOT NULL,
    accepted_quantity NUMERIC(12,2) NOT NULL,
    rejected_quantity NUMERIC(12,2) DEFAULT 0,
    unit_cost NUMERIC(12,2) NOT NULL,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    transfer_number TEXT NOT NULL,
    source_location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    destination_location_id UUID NOT NULL REFERENCES public.inventory_locations(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, transfer_number),
    CHECK (source_location_id != destination_location_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    inventory_transfer_id UUID NOT NULL REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE RESTRICT,
    quantity NUMERIC(12,2) NOT NULL,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.menu_item_inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    inventory_item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
    quantity_per_unit NUMERIC(12,2) NOT NULL,
    unit_of_measure TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(property_id, menu_item_id, inventory_item_id)
);



-- RLS Policies
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_inventory_items ENABLE ROW LEVEL SECURITY;

-- Helper to create basic RLS policies
CREATE OR REPLACE FUNCTION create_inventory_rls_policies(table_name text) RETURNS void AS $$
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

SELECT create_inventory_rls_policies('inventory_categories');
SELECT create_inventory_rls_policies('inventory_locations');
SELECT create_inventory_rls_policies('inventory_items');
SELECT create_inventory_rls_policies('suppliers');
SELECT create_inventory_rls_policies('supplier_contacts');
SELECT create_inventory_rls_policies('inventory_batches');
SELECT create_inventory_rls_policies('inventory_stock');
SELECT create_inventory_rls_policies('inventory_stock_movements');
SELECT create_inventory_rls_policies('purchase_orders');
SELECT create_inventory_rls_policies('purchase_order_items');
SELECT create_inventory_rls_policies('goods_receipts');
SELECT create_inventory_rls_policies('goods_receipt_items');
SELECT create_inventory_rls_policies('inventory_transfers');
SELECT create_inventory_rls_policies('inventory_transfer_items');
SELECT create_inventory_rls_policies('menu_item_inventory_items');

-- Triggers for Stock Prevention (Negative Stock)
CREATE OR REPLACE FUNCTION trg_prevent_negative_stock() RETURNS trigger AS $$
BEGIN
    IF NEW.available_quantity < 0 THEN
        RAISE EXCEPTION 'Negative stock not allowed for item % at location %', NEW.inventory_item_id, NEW.location_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_negative_stock
    BEFORE INSERT OR UPDATE ON public.inventory_stock
    FOR EACH ROW EXECUTE FUNCTION trg_prevent_negative_stock();

-- RPC for Stock Movement
CREATE OR REPLACE FUNCTION process_stock_movement(
    p_property_id UUID,
    p_item_id UUID,
    p_location_id UUID,
    p_movement_type TEXT,
    p_quantity NUMERIC,
    p_unit_cost NUMERIC,
    p_ref_type TEXT,
    p_ref_id UUID,
    p_reason TEXT,
    p_user_id UUID
) RETURNS void AS $$
DECLARE
    v_stock_id UUID;
    v_curr_qty NUMERIC;
BEGIN
    -- Ensure stock record exists
    INSERT INTO public.inventory_stock (property_id, inventory_item_id, location_id, quantity, available_quantity)
    VALUES (p_property_id, p_item_id, p_location_id, 0, 0)
    ON CONFLICT (property_id, inventory_item_id, location_id) DO NOTHING;

    -- Update stock balances depending on movement type
    IF p_movement_type IN ('PURCHASE_RECEIPT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'OPENING_BALANCE') THEN
        UPDATE public.inventory_stock 
        SET quantity = quantity + p_quantity,
            available_quantity = available_quantity + p_quantity,
            last_movement_at = now()
        WHERE property_id = p_property_id AND inventory_item_id = p_item_id AND location_id = p_location_id;
    ELSIF p_movement_type IN ('TRANSFER_OUT', 'CONSUMPTION', 'ADJUSTMENT_OUT', 'WASTE', 'RETURN_TO_SUPPLIER') THEN
        UPDATE public.inventory_stock 
        SET quantity = quantity - p_quantity,
            available_quantity = available_quantity - p_quantity,
            last_movement_at = now()
        WHERE property_id = p_property_id AND inventory_item_id = p_item_id AND location_id = p_location_id;
    END IF;

    -- Insert movement
    INSERT INTO public.inventory_stock_movements (
        property_id, inventory_item_id, location_id, movement_type, quantity, unit_cost, reference_type, reference_id, reason, performed_by
    ) VALUES (
        p_property_id, p_item_id, p_location_id, p_movement_type, p_quantity, p_unit_cost, p_ref_type, p_ref_id, p_reason, p_user_id
    );
END;
$$ LANGUAGE plpgsql;
