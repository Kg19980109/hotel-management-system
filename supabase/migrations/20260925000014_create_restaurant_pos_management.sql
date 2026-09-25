-- ============================================================
-- STAYHUB DATABASE SCHEMA - PHASE 12
-- RESTAURANT POS & RESTAURANT OPERATIONS FOUNDATION
-- ============================================================

-- Sequence for generating human-readable POS order numbers
CREATE SEQUENCE IF NOT EXISTS public.restaurant_order_number_seq START WITH 1001;

-- Function to generate formatted POS order numbers (e.g. POS-26-001001)
CREATE OR REPLACE FUNCTION public.generate_restaurant_order_number(p_property_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
  v_order_num TEXT;
BEGIN
  v_year := to_char(now(), 'YY');
  v_seq := nextval('public.restaurant_order_number_seq');
  v_order_num := 'POS-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  RETURN v_order_num;
END;
$$;

-- ------------------------------------------------------------
-- 1. RESTAURANTS (Outlets)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_restaurant_property_code UNIQUE (property_id, code)
);

-- ------------------------------------------------------------
-- 2. RESTAURANT AREAS (Sections/Zones)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_restaurant_area_name UNIQUE (restaurant_id, name)
);

-- ------------------------------------------------------------
-- 3. RESTAURANT TABLES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  area_id UUID REFERENCES public.restaurant_areas(id) ON DELETE SET NULL,
  table_number VARCHAR(50) NOT NULL,
  display_name VARCHAR(100),
  capacity INT NOT NULL DEFAULT 4 CHECK (capacity > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_restaurant_table_number UNIQUE (restaurant_id, table_number)
);

-- ------------------------------------------------------------
-- 4. MENU CATEGORIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_menu_category_restaurant_name UNIQUE (restaurant_id, name)
);

-- ------------------------------------------------------------
-- 5. MENU ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  short_name VARCHAR(100),
  sku VARCHAR(100),
  price NUMERIC(12,2) NOT NULL CHECK (price >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 6. RESTAURANT ORDERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.restaurant_tables(id) ON DELETE SET NULL,
  order_number VARCHAR(50) NOT NULL UNIQUE,
  order_type VARCHAR(30) NOT NULL DEFAULT 'DINE_IN' CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ROOM_SERVICE')),
  status VARCHAR(30) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('DRAFT', 'OPEN', 'CONFIRMED', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED')),
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  stay_id UUID REFERENCES public.stays(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  service_charge_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (service_charge_amount >= 0),
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  currency VARCHAR(10) NOT NULL DEFAULT 'INR',
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- ------------------------------------------------------------
-- 7. RESTAURANT ORDER ITEMS (Snapshots price & name)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  line_total NUMERIC(12,2) NOT NULL CHECK (line_total >= 0),
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED', 'SERVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 8. RESTAURANT ORDER EVENTS (Audit Timeline)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.restaurant_order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'CREATED', 'UPDATED', 'CONFIRMED', 'CANCELLED', 'COMPLETED',
    'ITEM_ADDED', 'ITEM_REMOVED', 'QUANTITY_CHANGED', 'DISCOUNT_APPLIED', 'TABLE_CHANGED'
  )),
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_restaurants_property ON public.restaurants(property_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_areas_restaurant ON public.restaurant_areas(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_restaurant ON public.restaurant_tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_area ON public.restaurant_tables(area_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_tables_status ON public.restaurant_tables(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_menu_categories_restaurant ON public.menu_categories(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(restaurant_id, is_available, is_active);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_property ON public.restaurant_orders(property_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_restaurant ON public.restaurant_orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_table ON public.restaurant_orders(table_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_status ON public.restaurant_orders(property_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_created ON public.restaurant_orders(property_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_items_order ON public.restaurant_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_order_events_order ON public.restaurant_order_events(order_id);

-- ------------------------------------------------------------
-- TENANT AND ENTITY CONSISTENCY TRIGGERS
-- ------------------------------------------------------------

-- 1. Restaurant Table Area Consistency
CREATE OR REPLACE FUNCTION public.check_restaurant_table_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_area_rest_id UUID;
BEGIN
  IF NEW.area_id IS NOT NULL THEN
    SELECT restaurant_id INTO v_area_rest_id
    FROM public.restaurant_areas
    WHERE id = NEW.area_id;

    IF v_area_rest_id IS NULL OR v_area_rest_id != NEW.restaurant_id THEN
      RAISE EXCEPTION 'Table area must belong to the same restaurant.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_restaurant_table_consistency ON public.restaurant_tables;
CREATE TRIGGER trg_check_restaurant_table_consistency
  BEFORE INSERT OR UPDATE ON public.restaurant_tables
  FOR EACH ROW
  EXECUTE FUNCTION public.check_restaurant_table_consistency();

-- 2. Menu Item Category Consistency
CREATE OR REPLACE FUNCTION public.check_menu_item_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_rest_id UUID;
BEGIN
  SELECT restaurant_id INTO v_cat_rest_id
  FROM public.menu_categories
  WHERE id = NEW.category_id;

  IF v_cat_rest_id IS NULL OR v_cat_rest_id != NEW.restaurant_id THEN
    RAISE EXCEPTION 'Menu item category must belong to the same restaurant.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_menu_item_consistency ON public.menu_items;
CREATE TRIGGER trg_check_menu_item_consistency
  BEFORE INSERT OR UPDATE ON public.menu_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_menu_item_consistency();

-- 3. Restaurant Order Consistency
CREATE OR REPLACE FUNCTION public.check_restaurant_order_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rest_prop_id UUID;
  v_table_rest_id UUID;
  v_guest_prop_id UUID;
  v_stay_prop_id UUID;
  v_stay_guest_id UUID;
BEGIN
  -- Verify restaurant belongs to property
  SELECT property_id INTO v_rest_prop_id
  FROM public.restaurants
  WHERE id = NEW.restaurant_id;

  IF v_rest_prop_id IS NULL OR v_rest_prop_id != NEW.property_id THEN
    RAISE EXCEPTION 'Restaurant does not belong to the specified property.';
  END IF;

  -- Verify table belongs to restaurant if provided
  IF NEW.table_id IS NOT NULL THEN
    SELECT restaurant_id INTO v_table_rest_id
    FROM public.restaurant_tables
    WHERE id = NEW.table_id;

    IF v_table_rest_id IS NULL OR v_table_rest_id != NEW.restaurant_id THEN
      RAISE EXCEPTION 'Table does not belong to the specified restaurant.';
    END IF;
  END IF;

  -- Verify guest belongs to property if provided
  IF NEW.guest_id IS NOT NULL THEN
    SELECT property_id INTO v_guest_prop_id
    FROM public.guests
    WHERE id = NEW.guest_id;

    IF v_guest_prop_id IS NULL OR v_guest_prop_id != NEW.property_id THEN
      RAISE EXCEPTION 'Guest does not belong to the specified property.';
    END IF;
  END IF;

  -- Verify stay belongs to property if provided
  IF NEW.stay_id IS NOT NULL THEN
    SELECT property_id, guest_id INTO v_stay_prop_id, v_stay_guest_id
    FROM public.stays
    WHERE id = NEW.stay_id;

    IF v_stay_prop_id IS NULL OR v_stay_prop_id != NEW.property_id THEN
      RAISE EXCEPTION 'Stay does not belong to the specified property.';
    END IF;

    IF NEW.guest_id IS NOT NULL AND v_stay_guest_id IS NOT NULL AND v_stay_guest_id != NEW.guest_id THEN
      RAISE EXCEPTION 'Stay does not match the specified guest.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_restaurant_order_consistency ON public.restaurant_orders;
CREATE TRIGGER trg_check_restaurant_order_consistency
  BEFORE INSERT OR UPDATE ON public.restaurant_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_restaurant_order_consistency();

-- 4. Order Item Consistency
CREATE OR REPLACE FUNCTION public.check_restaurant_order_item_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_rest_id UUID;
  v_item_rest_id UUID;
BEGIN
  SELECT restaurant_id INTO v_order_rest_id
  FROM public.restaurant_orders
  WHERE id = NEW.order_id;

  IF NEW.menu_item_id IS NOT NULL THEN
    SELECT restaurant_id INTO v_item_rest_id
    FROM public.menu_items
    WHERE id = NEW.menu_item_id;

    IF v_item_rest_id IS NULL OR v_item_rest_id != v_order_rest_id THEN
      RAISE EXCEPTION 'Menu item does not belong to the restaurant handling this order.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_restaurant_order_item_consistency ON public.restaurant_order_items;
CREATE TRIGGER trg_check_restaurant_order_item_consistency
  BEFORE INSERT OR UPDATE ON public.restaurant_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.check_restaurant_order_item_consistency();

-- 5. Order Event Consistency
CREATE OR REPLACE FUNCTION public.check_restaurant_order_event_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_prop_id UUID;
BEGIN
  SELECT property_id INTO v_order_prop_id
  FROM public.restaurant_orders
  WHERE id = NEW.order_id;

  IF v_order_prop_id IS NULL OR v_order_prop_id != NEW.property_id THEN
    RAISE EXCEPTION 'Order event property does not match order property.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_restaurant_order_event_consistency ON public.restaurant_order_events;
CREATE TRIGGER trg_check_restaurant_order_event_consistency
  BEFORE INSERT OR UPDATE ON public.restaurant_order_events
  FOR EACH ROW
  EXECUTE FUNCTION public.check_restaurant_order_event_consistency();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_order_events ENABLE ROW LEVEL SECURITY;

-- 1. Restaurants Policies
DROP POLICY IF EXISTS "rls_restaurants_select" ON public.restaurants;
CREATE POLICY "rls_restaurants_select" ON public.restaurants
  FOR SELECT USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_restaurants_insert" ON public.restaurants;
CREATE POLICY "rls_restaurants_insert" ON public.restaurants
  FOR INSERT WITH CHECK (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_restaurants_update" ON public.restaurants;
CREATE POLICY "rls_restaurants_update" ON public.restaurants
  FOR UPDATE USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
    OR public.is_platform_super_admin(auth.uid())
  );

-- 2. Restaurant Areas Policies
DROP POLICY IF EXISTS "rls_restaurant_areas_select" ON public.restaurant_areas;
CREATE POLICY "rls_restaurant_areas_select" ON public.restaurant_areas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_belongs_to_property(auth.uid(), r.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_restaurant_areas_insert" ON public.restaurant_areas;
CREATE POLICY "rls_restaurant_areas_insert" ON public.restaurant_areas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_restaurant_areas_update" ON public.restaurant_areas;
CREATE POLICY "rls_restaurant_areas_update" ON public.restaurant_areas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 3. Restaurant Tables Policies
DROP POLICY IF EXISTS "rls_restaurant_tables_select" ON public.restaurant_tables;
CREATE POLICY "rls_restaurant_tables_select" ON public.restaurant_tables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_belongs_to_property(auth.uid(), r.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_restaurant_tables_insert" ON public.restaurant_tables;
CREATE POLICY "rls_restaurant_tables_insert" ON public.restaurant_tables
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_restaurant_tables_update" ON public.restaurant_tables;
CREATE POLICY "rls_restaurant_tables_update" ON public.restaurant_tables
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF', 'FRONT_DESK']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 4. Menu Categories Policies
DROP POLICY IF EXISTS "rls_menu_categories_select" ON public.menu_categories;
CREATE POLICY "rls_menu_categories_select" ON public.menu_categories
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_belongs_to_property(auth.uid(), r.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_categories_insert" ON public.menu_categories;
CREATE POLICY "rls_menu_categories_insert" ON public.menu_categories
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_categories_update" ON public.menu_categories;
CREATE POLICY "rls_menu_categories_update" ON public.menu_categories
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 5. Menu Items Policies
DROP POLICY IF EXISTS "rls_menu_items_select" ON public.menu_items;
CREATE POLICY "rls_menu_items_select" ON public.menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_belongs_to_property(auth.uid(), r.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_items_insert" ON public.menu_items;
CREATE POLICY "rls_menu_items_insert" ON public.menu_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_items_update" ON public.menu_items;
CREATE POLICY "rls_menu_items_update" ON public.menu_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 6. Restaurant Orders Policies
DROP POLICY IF EXISTS "rls_restaurant_orders_select" ON public.restaurant_orders;
CREATE POLICY "rls_restaurant_orders_select" ON public.restaurant_orders
  FOR SELECT USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_restaurant_orders_insert" ON public.restaurant_orders;
CREATE POLICY "rls_restaurant_orders_insert" ON public.restaurant_orders
  FOR INSERT WITH CHECK (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_restaurant_orders_update" ON public.restaurant_orders;
CREATE POLICY "rls_restaurant_orders_update" ON public.restaurant_orders
  FOR UPDATE USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

-- 7. Restaurant Order Items Policies
DROP POLICY IF EXISTS "rls_restaurant_order_items_select" ON public.restaurant_order_items;
CREATE POLICY "rls_restaurant_order_items_select" ON public.restaurant_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_orders o
      WHERE o.id = order_id
        AND (public.user_belongs_to_property(auth.uid(), o.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_restaurant_order_items_insert" ON public.restaurant_order_items;
CREATE POLICY "rls_restaurant_order_items_insert" ON public.restaurant_order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurant_orders o
      WHERE o.id = order_id
        AND (public.user_belongs_to_property(auth.uid(), o.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_restaurant_order_items_update" ON public.restaurant_order_items;
CREATE POLICY "rls_restaurant_order_items_update" ON public.restaurant_order_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurant_orders o
      WHERE o.id = order_id
        AND (public.user_belongs_to_property(auth.uid(), o.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 8. Restaurant Order Events Policies
DROP POLICY IF EXISTS "rls_restaurant_order_events_select" ON public.restaurant_order_events;
CREATE POLICY "rls_restaurant_order_events_select" ON public.restaurant_order_events
  FOR SELECT USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_restaurant_order_events_insert" ON public.restaurant_order_events;
CREATE POLICY "rls_restaurant_order_events_insert" ON public.restaurant_order_events
  FOR INSERT WITH CHECK (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

-- ------------------------------------------------------------
-- ATOMIC OPERATIONAL RPCS FOR RESTAURANT POS
-- ------------------------------------------------------------

-- 1. Create Restaurant Order
CREATE OR REPLACE FUNCTION public.create_restaurant_order(
  p_property_id UUID,
  p_restaurant_id UUID,
  p_order_type VARCHAR(30),
  p_items JSONB,
  p_table_id UUID DEFAULT NULL,
  p_discount_amount NUMERIC(12,2) DEFAULT 0,
  p_tax_amount NUMERIC(12,2) DEFAULT 0,
  p_service_charge_amount NUMERIC(12,2) DEFAULT 0,
  p_notes TEXT DEFAULT NULL,
  p_guest_id UUID DEFAULT NULL,
  p_stay_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_order_id UUID;
  v_order_number TEXT;
  v_rest_currency VARCHAR(10);
  v_subtotal NUMERIC(12,2) := 0;
  v_total NUMERIC(12,2) := 0;
  v_discount NUMERIC(12,2) := COALESCE(p_discount_amount, 0);
  v_tax NUMERIC(12,2) := COALESCE(p_tax_amount, 0);
  v_service_charge NUMERIC(12,2) := COALESCE(p_service_charge_amount, 0);
  v_item_elem JSONB;
  v_menu_item_id UUID;
  v_qty INT;
  v_item_notes TEXT;
  v_item_name VARCHAR(255);
  v_item_price NUMERIC(12,2);
  v_item_is_avail BOOLEAN;
  v_item_is_act BOOLEAN;
  v_item_rest_id UUID;
  v_line_total NUMERIC(12,2);
  v_existing_active_order_id UUID;
BEGIN
  v_caller_id := auth.uid();

  -- Authorize caller
  IF v_caller_id IS NOT NULL THEN
    IF NOT (
      public.user_belongs_to_property(v_caller_id, p_property_id)
      OR public.is_platform_super_admin(v_caller_id)
    ) THEN
      RAISE EXCEPTION 'Access denied: User does not belong to this property.';
    END IF;
  END IF;

  -- Verify restaurant belongs to property
  SELECT currency INTO v_rest_currency
  FROM public.restaurants
  WHERE id = p_restaurant_id AND property_id = p_property_id AND is_active = true;

  IF v_rest_currency IS NULL THEN
    RAISE EXCEPTION 'Restaurant not found or inactive in this property.';
  END IF;

  -- Verify order type
  IF p_order_type NOT IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY', 'ROOM_SERVICE') THEN
    RAISE EXCEPTION 'Invalid order type: %', p_order_type;
  END IF;

  -- Validate table for DINE_IN
  IF p_order_type = 'DINE_IN' THEN
    IF p_table_id IS NULL THEN
      RAISE EXCEPTION 'Table selection is required for Dine-In orders.';
    END IF;

    -- Check table belongs to restaurant
    IF NOT EXISTS (
      SELECT 1 FROM public.restaurant_tables
      WHERE id = p_table_id AND restaurant_id = p_restaurant_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Table does not belong to this restaurant or is inactive.';
    END IF;

    -- Check for existing active order on this table (protection against simultaneous active orders)
    SELECT id INTO v_existing_active_order_id
    FROM public.restaurant_orders
    WHERE table_id = p_table_id
      AND status NOT IN ('COMPLETED', 'CANCELLED')
    LIMIT 1;

    IF v_existing_active_order_id IS NOT NULL THEN
      RAISE EXCEPTION 'Table is currently occupied by an active order (Order ID: %).', v_existing_active_order_id;
    END IF;
  END IF;

  -- Verify at least one item
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Cannot create an empty restaurant order. Please add menu items.';
  END IF;

  -- Validate discounts
  IF v_discount < 0 THEN
    RAISE EXCEPTION 'Discount amount cannot be negative.';
  END IF;

  -- Generate order number
  v_order_number := public.generate_restaurant_order_number(p_property_id);

  -- Create Order Shell (subtotal computed during item iteration)
  INSERT INTO public.restaurant_orders (
    property_id,
    restaurant_id,
    table_id,
    order_number,
    order_type,
    status,
    guest_id,
    stay_id,
    created_by,
    notes,
    subtotal,
    discount_amount,
    tax_amount,
    service_charge_amount,
    total_amount,
    currency
  ) VALUES (
    p_property_id,
    p_restaurant_id,
    p_table_id,
    v_order_number,
    p_order_type,
    'OPEN',
    p_guest_id,
    p_stay_id,
    v_caller_id,
    p_notes,
    0,
    v_discount,
    v_tax,
    v_service_charge,
    0,
    v_rest_currency
  )
  RETURNING id INTO v_order_id;

  -- Iterate through items, validate server-side, calculate totals & snapshot prices
  FOR v_item_elem IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_menu_item_id := (v_item_elem->>'menu_item_id')::UUID;
    v_qty := COALESCE((v_item_elem->>'quantity')::INT, 1);
    v_item_notes := v_item_elem->>'notes';

    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero.';
    END IF;

    -- Query current menu item from database
    SELECT name, price, is_available, is_active, restaurant_id
    INTO v_item_name, v_item_price, v_item_is_avail, v_item_is_act, v_item_rest_id
    FROM public.menu_items
    WHERE id = v_menu_item_id;

    IF v_item_name IS NULL THEN
      RAISE EXCEPTION 'Menu item not found (ID: %).', v_menu_item_id;
    END IF;

    IF v_item_rest_id != p_restaurant_id THEN
      RAISE EXCEPTION 'Menu item % belongs to another restaurant.', v_item_name;
    END IF;

    IF NOT v_item_is_act THEN
      RAISE EXCEPTION 'Menu item % is discontinued / inactive.', v_item_name;
    END IF;

    IF NOT v_item_is_avail THEN
      RAISE EXCEPTION 'Menu item % is currently marked unavailable (86ed).', v_item_name;
    END IF;

    v_line_total := v_item_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    -- Insert Order Item with Price Snapshot
    INSERT INTO public.restaurant_order_items (
      order_id,
      menu_item_id,
      item_name,
      unit_price,
      quantity,
      line_total,
      notes,
      status
    ) VALUES (
      v_order_id,
      v_menu_item_id,
      v_item_name,
      v_item_price,
      v_qty,
      v_line_total,
      v_item_notes,
      'CONFIRMED'
    );
  END LOOP;

  -- Check discount against subtotal
  IF v_discount > v_subtotal THEN
    RAISE EXCEPTION 'Discount amount (₹%) cannot exceed subtotal (₹%).', v_discount, v_subtotal;
  END IF;

  v_total := (v_subtotal - v_discount) + v_tax + v_service_charge;
  IF v_total < 0 THEN
    v_total := 0;
  END IF;

  -- Update order with recalculated server totals
  UPDATE public.restaurant_orders
  SET subtotal = v_subtotal,
      total_amount = v_total,
      updated_at = now()
  WHERE id = v_order_id;

  -- Synchronize Table Status to OCCUPIED if DINE_IN
  IF p_order_type = 'DINE_IN' AND p_table_id IS NOT NULL THEN
    UPDATE public.restaurant_tables
    SET status = 'OCCUPIED',
        updated_at = now()
    WHERE id = p_table_id;
  END IF;

  -- Insert Audit Event
  INSERT INTO public.restaurant_order_events (
    property_id,
    order_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_order_id,
    'CREATED',
    NULL,
    'OPEN',
    v_caller_id,
    'Order ' || v_order_number || ' created via POS'
  );

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total_amount', v_total
  );
END;
$$;

-- 2. Confirm Restaurant Order
CREATE OR REPLACE FUNCTION public.confirm_restaurant_order(
  p_order_id UUID,
  p_property_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_current_status VARCHAR(30);
BEGIN
  v_caller_id := auth.uid();

  SELECT status INTO v_current_status
  FROM public.restaurant_orders
  WHERE id = p_order_id AND property_id = p_property_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_current_status != 'OPEN' AND v_current_status != 'DRAFT' THEN
    RAISE EXCEPTION 'Only OPEN or DRAFT orders can be confirmed (current status: %).', v_current_status;
  END IF;

  UPDATE public.restaurant_orders
  SET status = 'CONFIRMED',
      updated_at = now()
  WHERE id = p_order_id;

  INSERT INTO public.restaurant_order_events (
    property_id,
    order_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    p_order_id,
    'CONFIRMED',
    v_current_status,
    'CONFIRMED',
    v_caller_id,
    COALESCE(p_notes, 'Order confirmed by cashier')
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'CONFIRMED');
END;
$$;

-- 3. Complete Restaurant Order
CREATE OR REPLACE FUNCTION public.complete_restaurant_order(
  p_order_id UUID,
  p_property_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_current_status VARCHAR(30);
  v_table_id UUID;
  v_other_active_orders INT;
BEGIN
  v_caller_id := auth.uid();

  SELECT status, table_id INTO v_current_status, v_table_id
  FROM public.restaurant_orders
  WHERE id = p_order_id AND property_id = p_property_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_current_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Order is already %.', v_current_status;
  END IF;

  UPDATE public.restaurant_orders
  SET status = 'COMPLETED',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- Synchronize Table Status back to AVAILABLE if no other active orders exist on this table
  IF v_table_id IS NOT NULL THEN
    SELECT count(*) INTO v_other_active_orders
    FROM public.restaurant_orders
    WHERE table_id = v_table_id
      AND id != p_order_id
      AND status NOT IN ('COMPLETED', 'CANCELLED');

    IF v_other_active_orders = 0 THEN
      UPDATE public.restaurant_tables
      SET status = 'AVAILABLE',
          updated_at = now()
      WHERE id = v_table_id;
    END IF;
  END IF;

  INSERT INTO public.restaurant_order_events (
    property_id,
    order_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    p_order_id,
    'COMPLETED',
    v_current_status,
    'COMPLETED',
    v_caller_id,
    COALESCE(p_notes, 'Order completed')
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'COMPLETED');
END;
$$;

-- 4. Cancel Restaurant Order
CREATE OR REPLACE FUNCTION public.cancel_restaurant_order(
  p_order_id UUID,
  p_property_id UUID,
  p_cancellation_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_current_status VARCHAR(30);
  v_table_id UUID;
  v_other_active_orders INT;
BEGIN
  v_caller_id := auth.uid();

  IF p_cancellation_reason IS NULL OR trim(p_cancellation_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to cancel a restaurant order.';
  END IF;

  SELECT status, table_id INTO v_current_status, v_table_id
  FROM public.restaurant_orders
  WHERE id = p_order_id AND property_id = p_property_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_current_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Order is already cancelled.';
  END IF;

  IF v_current_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Completed orders cannot be cancelled casually. Please issue a credit/void through management.';
  END IF;

  UPDATE public.restaurant_orders
  SET status = 'CANCELLED',
      cancelled_by = v_caller_id,
      cancellation_reason = trim(p_cancellation_reason),
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

  -- Synchronize Table Status back to AVAILABLE if no other active orders exist on this table
  IF v_table_id IS NOT NULL THEN
    SELECT count(*) INTO v_other_active_orders
    FROM public.restaurant_orders
    WHERE table_id = v_table_id
      AND id != p_order_id
      AND status NOT IN ('COMPLETED', 'CANCELLED');

    IF v_other_active_orders = 0 THEN
      UPDATE public.restaurant_tables
      SET status = 'AVAILABLE',
          updated_at = now()
      WHERE id = v_table_id;
    END IF;
  END IF;

  INSERT INTO public.restaurant_order_events (
    property_id,
    order_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    p_order_id,
    'CANCELLED',
    v_current_status,
    'CANCELLED',
    v_caller_id,
    'Cancelled: ' || trim(p_cancellation_reason)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'CANCELLED');
END;
$$;

-- 5. Set Table Status (Manual Operational Control)
CREATE OR REPLACE FUNCTION public.set_restaurant_table_status(
  p_table_id UUID,
  p_restaurant_id UUID,
  p_status VARCHAR(30)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'OUT_OF_SERVICE') THEN
    RAISE EXCEPTION 'Invalid table status: %', p_status;
  END IF;

  UPDATE public.restaurant_tables
  SET status = p_status,
      updated_at = now()
  WHERE id = p_table_id AND restaurant_id = p_restaurant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Table not found in specified restaurant.';
  END IF;

  RETURN jsonb_build_object('success', true, 'table_id', p_table_id, 'status', p_status);
END;
$$;
