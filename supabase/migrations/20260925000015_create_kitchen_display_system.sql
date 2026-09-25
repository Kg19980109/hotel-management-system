-- ============================================================
-- STAYHUB DATABASE SCHEMA - PHASE 13
-- KITCHEN DISPLAY SYSTEM (KDS) & PRODUCTION WORKFLOWS
-- ============================================================

-- Sequence for generating human-readable KDS ticket numbers
CREATE SEQUENCE IF NOT EXISTS public.kitchen_ticket_number_seq START WITH 1001;

-- Function to generate formatted KDS ticket numbers (e.g. KDS-26-001001)
CREATE OR REPLACE FUNCTION public.generate_kitchen_ticket_number(p_property_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_seq BIGINT;
  v_ticket_num TEXT;
BEGIN
  v_year := to_char(now(), 'YY');
  v_seq := nextval('public.kitchen_ticket_number_seq');
  v_ticket_num := 'KDS-' || v_year || '-' || lpad(v_seq::text, 6, '0');
  RETURN v_ticket_num;
END;
$$;

-- ------------------------------------------------------------
-- 1. KITCHEN STATIONS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_kitchen_station_restaurant_code UNIQUE (restaurant_id, code)
);

-- ------------------------------------------------------------
-- 2. MENU ITEM KITCHEN STATIONS (Routing)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_item_kitchen_stations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  kitchen_station_id UUID NOT NULL REFERENCES public.kitchen_stations(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_menu_item_station UNIQUE (menu_item_id, kitchen_station_id)
);

-- ------------------------------------------------------------
-- 3. KITCHEN TICKETS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  restaurant_order_id UUID NOT NULL REFERENCES public.restaurant_orders(id) ON DELETE CASCADE,
  ticket_number VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED')),
  priority VARCHAR(20) NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  fired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 4. KITCHEN TICKET ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kitchen_ticket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_ticket_id UUID NOT NULL REFERENCES public.kitchen_tickets(id) ON DELETE CASCADE,
  restaurant_order_item_id UUID NOT NULL REFERENCES public.restaurant_order_items(id) ON DELETE CASCADE,
  station_id UUID REFERENCES public.kitchen_stations(id) ON DELETE SET NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  notes TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'CANCELLED', 'REMAKE')),
  remake_count INT NOT NULL DEFAULT 0,
  remake_reason TEXT,
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. KITCHEN TICKET EVENTS (Audit Stream)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.kitchen_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.kitchen_tickets(id) ON DELETE CASCADE,
  ticket_item_id UUID REFERENCES public.kitchen_ticket_items(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30),
  performed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- INDEXES FOR FAST KDS PERFORMANCE
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_kitchen_stations_restaurant_id ON public.kitchen_stations(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_kitchen_stations_item ON public.menu_item_kitchen_stations(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_kitchen_stations_station ON public.menu_item_kitchen_stations(kitchen_station_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_property ON public.kitchen_tickets(property_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_restaurant ON public.kitchen_tickets(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order ON public.kitchen_tickets(restaurant_order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON public.kitchen_tickets(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_active ON public.kitchen_tickets(restaurant_id, status) WHERE status IN ('QUEUED', 'IN_PROGRESS', 'READY');
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_ticket ON public.kitchen_ticket_items(kitchen_ticket_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_station ON public.kitchen_ticket_items(station_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_status ON public.kitchen_ticket_items(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_events_ticket ON public.kitchen_ticket_events(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_events_property ON public.kitchen_ticket_events(property_id);

-- ------------------------------------------------------------
-- CROSS-TENANT & CROSS-RESTAURANT CONSISTENCY TRIGGERS
-- ------------------------------------------------------------

-- 1. Menu Item Kitchen Station Consistency Trigger
CREATE OR REPLACE FUNCTION public.fn_check_menu_item_kitchen_station_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_item_rest_id UUID;
  v_station_rest_id UUID;
BEGIN
  SELECT restaurant_id INTO v_item_rest_id
  FROM public.menu_items
  WHERE id = NEW.menu_item_id;

  SELECT restaurant_id INTO v_station_rest_id
  FROM public.kitchen_stations
  WHERE id = NEW.kitchen_station_id;

  IF v_item_rest_id IS NULL OR v_station_rest_id IS NULL THEN
    RAISE EXCEPTION 'Referenced menu item or kitchen station does not exist.';
  END IF;

  IF v_item_rest_id != v_station_rest_id THEN
    RAISE EXCEPTION 'Cross-restaurant routing forbidden: Menu item restaurant (%) does not match Kitchen station restaurant (%).',
      v_item_rest_id, v_station_rest_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_menu_item_kitchen_station_tenant ON public.menu_item_kitchen_stations;
CREATE TRIGGER trg_check_menu_item_kitchen_station_tenant
  BEFORE INSERT OR UPDATE ON public.menu_item_kitchen_stations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_menu_item_kitchen_station_tenant();

-- 2. Kitchen Ticket Consistency Trigger
CREATE OR REPLACE FUNCTION public.fn_check_kitchen_ticket_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_property_id UUID;
  v_order_restaurant_id UUID;
BEGIN
  SELECT property_id, restaurant_id INTO v_order_property_id, v_order_restaurant_id
  FROM public.restaurant_orders
  WHERE id = NEW.restaurant_order_id;

  IF v_order_property_id IS NULL THEN
    RAISE EXCEPTION 'Referenced restaurant order does not exist.';
  END IF;

  IF NEW.property_id != v_order_property_id THEN
    RAISE EXCEPTION 'Cross-property kitchen ticket forbidden: Ticket property (%) does not match Order property (%).',
      NEW.property_id, v_order_property_id;
  END IF;

  IF NEW.restaurant_id != v_order_restaurant_id THEN
    RAISE EXCEPTION 'Cross-restaurant kitchen ticket forbidden: Ticket restaurant (%) does not match Order restaurant (%).',
      NEW.restaurant_id, v_order_restaurant_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_kitchen_ticket_tenant ON public.kitchen_tickets;
CREATE TRIGGER trg_check_kitchen_ticket_tenant
  BEFORE INSERT OR UPDATE ON public.kitchen_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_kitchen_ticket_tenant();

-- 3. Kitchen Ticket Item Consistency Trigger
CREATE OR REPLACE FUNCTION public.fn_check_kitchen_ticket_item_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_restaurant_id UUID;
  v_station_restaurant_id UUID;
BEGIN
  SELECT restaurant_id INTO v_ticket_restaurant_id
  FROM public.kitchen_tickets
  WHERE id = NEW.kitchen_ticket_id;

  IF v_ticket_restaurant_id IS NULL THEN
    RAISE EXCEPTION 'Referenced kitchen ticket does not exist.';
  END IF;

  IF NEW.station_id IS NOT NULL THEN
    SELECT restaurant_id INTO v_station_restaurant_id
    FROM public.kitchen_stations
    WHERE id = NEW.station_id;

    IF v_station_restaurant_id != v_ticket_restaurant_id THEN
      RAISE EXCEPTION 'Cross-restaurant station assignment forbidden: Station restaurant (%) does not match Ticket restaurant (%).',
        v_station_restaurant_id, v_ticket_restaurant_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_kitchen_ticket_item_tenant ON public.kitchen_ticket_items;
CREATE TRIGGER trg_check_kitchen_ticket_item_tenant
  BEFORE INSERT OR UPDATE ON public.kitchen_ticket_items
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_kitchen_ticket_item_tenant();

-- 4. Kitchen Ticket Event Property Consistency Trigger
CREATE OR REPLACE FUNCTION public.fn_check_kitchen_ticket_event_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_ticket_prop_id UUID;
BEGIN
  SELECT property_id INTO v_ticket_prop_id
  FROM public.kitchen_tickets
  WHERE id = NEW.ticket_id;

  IF v_ticket_prop_id IS NULL THEN
    RAISE EXCEPTION 'Referenced kitchen ticket does not exist.';
  END IF;

  IF NEW.property_id != v_ticket_prop_id THEN
    RAISE EXCEPTION 'Cross-property audit event forbidden: Event property (%) does not match Ticket property (%).',
      NEW.property_id, v_ticket_prop_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_kitchen_ticket_event_tenant ON public.kitchen_ticket_events;
CREATE TRIGGER trg_check_kitchen_ticket_event_tenant
  BEFORE INSERT OR UPDATE ON public.kitchen_ticket_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_check_kitchen_ticket_event_tenant();

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------
ALTER TABLE public.kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_kitchen_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_ticket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_ticket_events ENABLE ROW LEVEL SECURITY;

-- 1. Kitchen Stations
DROP POLICY IF EXISTS "rls_kitchen_stations_select" ON public.kitchen_stations;
CREATE POLICY "rls_kitchen_stations_select" ON public.kitchen_stations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_belongs_to_property(auth.uid(), r.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_kitchen_stations_insert" ON public.kitchen_stations;
CREATE POLICY "rls_kitchen_stations_insert" ON public.kitchen_stations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF', 'KITCHEN_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_kitchen_stations_update" ON public.kitchen_stations;
CREATE POLICY "rls_kitchen_stations_update" ON public.kitchen_stations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF', 'KITCHEN_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_kitchen_stations_delete" ON public.kitchen_stations;
CREATE POLICY "rls_kitchen_stations_delete" ON public.kitchen_stations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.restaurants r
      WHERE r.id = restaurant_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 2. Menu Item Kitchen Stations (Routing)
DROP POLICY IF EXISTS "rls_menu_item_kitchen_stations_select" ON public.menu_item_kitchen_stations;
CREATE POLICY "rls_menu_item_kitchen_stations_select" ON public.menu_item_kitchen_stations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_id
        AND (public.user_belongs_to_property(auth.uid(), r.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_item_kitchen_stations_insert" ON public.menu_item_kitchen_stations;
CREATE POLICY "rls_menu_item_kitchen_stations_insert" ON public.menu_item_kitchen_stations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF', 'KITCHEN_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_item_kitchen_stations_update" ON public.menu_item_kitchen_stations;
CREATE POLICY "rls_menu_item_kitchen_stations_update" ON public.menu_item_kitchen_stations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF', 'KITCHEN_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_menu_item_kitchen_stations_delete" ON public.menu_item_kitchen_stations;
CREATE POLICY "rls_menu_item_kitchen_stations_delete" ON public.menu_item_kitchen_stations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.restaurants r ON r.id = mi.restaurant_id
      WHERE mi.id = menu_item_id
        AND (public.user_has_property_role(auth.uid(), r.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER', 'RESTAURANT_STAFF']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 3. Kitchen Tickets
DROP POLICY IF EXISTS "rls_kitchen_tickets_select" ON public.kitchen_tickets;
CREATE POLICY "rls_kitchen_tickets_select" ON public.kitchen_tickets
  FOR SELECT USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_kitchen_tickets_insert" ON public.kitchen_tickets;
CREATE POLICY "rls_kitchen_tickets_insert" ON public.kitchen_tickets
  FOR INSERT WITH CHECK (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_kitchen_tickets_update" ON public.kitchen_tickets;
CREATE POLICY "rls_kitchen_tickets_update" ON public.kitchen_tickets
  FOR UPDATE USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_kitchen_tickets_delete" ON public.kitchen_tickets;
CREATE POLICY "rls_kitchen_tickets_delete" ON public.kitchen_tickets
  FOR DELETE USING (
    public.user_has_property_role(auth.uid(), property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER'])
    OR public.is_platform_super_admin(auth.uid())
  );

-- 4. Kitchen Ticket Items
DROP POLICY IF EXISTS "rls_kitchen_ticket_items_select" ON public.kitchen_ticket_items;
CREATE POLICY "rls_kitchen_ticket_items_select" ON public.kitchen_ticket_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kitchen_tickets kt
      WHERE kt.id = kitchen_ticket_id
        AND (public.user_belongs_to_property(auth.uid(), kt.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_kitchen_ticket_items_insert" ON public.kitchen_ticket_items;
CREATE POLICY "rls_kitchen_ticket_items_insert" ON public.kitchen_ticket_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kitchen_tickets kt
      WHERE kt.id = kitchen_ticket_id
        AND (public.user_belongs_to_property(auth.uid(), kt.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_kitchen_ticket_items_update" ON public.kitchen_ticket_items;
CREATE POLICY "rls_kitchen_ticket_items_update" ON public.kitchen_ticket_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.kitchen_tickets kt
      WHERE kt.id = kitchen_ticket_id
        AND (public.user_belongs_to_property(auth.uid(), kt.property_id) OR public.is_platform_super_admin(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "rls_kitchen_ticket_items_delete" ON public.kitchen_ticket_items;
CREATE POLICY "rls_kitchen_ticket_items_delete" ON public.kitchen_ticket_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.kitchen_tickets kt
      WHERE kt.id = kitchen_ticket_id
        AND (public.user_has_property_role(auth.uid(), kt.property_id, ARRAY['HOTEL_OWNER', 'GENERAL_MANAGER']) OR public.is_platform_super_admin(auth.uid()))
    )
  );

-- 5. Kitchen Ticket Events (Audit Stream)
DROP POLICY IF EXISTS "rls_kitchen_ticket_events_select" ON public.kitchen_ticket_events;
CREATE POLICY "rls_kitchen_ticket_events_select" ON public.kitchen_ticket_events
  FOR SELECT USING (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

DROP POLICY IF EXISTS "rls_kitchen_ticket_events_insert" ON public.kitchen_ticket_events;
CREATE POLICY "rls_kitchen_ticket_events_insert" ON public.kitchen_ticket_events
  FOR INSERT WITH CHECK (
    public.user_belongs_to_property(auth.uid(), property_id)
    OR public.is_platform_super_admin(auth.uid())
  );

-- ------------------------------------------------------------
-- ATOMIC RPC FUNCTIONS FOR KITCHEN PRODUCTION OPERATIONS
-- ------------------------------------------------------------

-- 1. Create or Fire Kitchen Ticket (Atomic & Idempotent)
CREATE OR REPLACE FUNCTION public.create_or_fire_kitchen_ticket(
  p_order_id UUID,
  p_property_id UUID,
  p_priority VARCHAR DEFAULT 'NORMAL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_order RECORD;
  v_existing_ticket RECORD;
  v_ticket_id UUID;
  v_ticket_num TEXT;
  v_item RECORD;
  v_station_id UUID;
  v_item_count INT := 0;
BEGIN
  v_caller_id := auth.uid();

  -- Verify Order
  SELECT id, property_id, restaurant_id, order_number, status, order_type, table_id
  INTO v_order
  FROM public.restaurant_orders
  WHERE id = p_order_id AND property_id = p_property_id;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'Restaurant order not found.';
  END IF;

  IF v_order.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Cannot fire kitchen ticket for cancelled order.';
  END IF;

  -- Idempotency Check: Return existing ticket if already created
  SELECT id, ticket_number, status INTO v_existing_ticket
  FROM public.kitchen_tickets
  WHERE restaurant_order_id = p_order_id;

  IF v_existing_ticket.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'ticket_id', v_existing_ticket.id,
      'ticket_number', v_existing_ticket.ticket_number,
      'status', v_existing_ticket.status,
      'is_existing', true
    );
  END IF;

  -- Generate Ticket Number
  v_ticket_num := public.generate_kitchen_ticket_number(p_property_id);

  -- Create Ticket
  INSERT INTO public.kitchen_tickets (
    property_id,
    restaurant_id,
    restaurant_order_id,
    ticket_number,
    status,
    priority,
    fired_at
  ) VALUES (
    p_property_id,
    v_order.restaurant_id,
    p_order_id,
    v_ticket_num,
    'QUEUED',
    COALESCE(p_priority, 'NORMAL'),
    now()
  )
  RETURNING id INTO v_ticket_id;

  -- Map and Insert Order Items into Ticket Items
  FOR v_item IN (
    SELECT id, menu_item_id, item_name, quantity, notes
    FROM public.restaurant_order_items
    WHERE order_id = p_order_id
  ) LOOP
    -- Find configured primary station for this menu item
    SELECT kitchen_station_id INTO v_station_id
    FROM public.menu_item_kitchen_stations
    WHERE menu_item_id = v_item.menu_item_id
    ORDER BY is_primary DESC, display_order ASC
    LIMIT 1;

    INSERT INTO public.kitchen_ticket_items (
      kitchen_ticket_id,
      restaurant_order_item_id,
      station_id,
      item_name,
      quantity,
      notes,
      status
    ) VALUES (
      v_ticket_id,
      v_item.id,
      v_station_id,
      v_item.item_name,
      v_item.quantity,
      v_item.notes,
      'QUEUED'
    );

    v_item_count := v_item_count + 1;
  END LOOP;

  -- If order was OPEN / DRAFT, transition order status to CONFIRMED
  IF v_order.status IN ('OPEN', 'DRAFT') THEN
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
      v_order.status,
      'CONFIRMED',
      v_caller_id,
      'Order confirmed and fired to KDS ticket ' || v_ticket_num
    );
  END IF;

  -- Record Kitchen Ticket Audit Event
  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_ticket_id,
    'TICKET_CREATED',
    NULL,
    'QUEUED',
    v_caller_id,
    'Ticket created with ' || v_item_count || ' items'
  );

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_number', v_ticket_num,
    'status', 'QUEUED',
    'item_count', v_item_count,
    'is_existing', false
  );
END;
$$;

-- 2. Start Kitchen Ticket Item (QUEUED -> IN_PROGRESS)
CREATE OR REPLACE FUNCTION public.start_kitchen_ticket_item(
  p_ticket_item_id UUID,
  p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_item RECORD;
  v_ticket RECORD;
BEGIN
  v_caller_id := auth.uid();

  SELECT kti.id, kti.kitchen_ticket_id, kti.status, kti.item_name
  INTO v_item
  FROM public.kitchen_ticket_items kti
  JOIN public.kitchen_tickets kt ON kt.id = kti.kitchen_ticket_id
  WHERE kti.id = p_ticket_item_id AND kt.property_id = p_property_id;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Ticket item not found or property mismatch.';
  END IF;

  IF v_item.status NOT IN ('QUEUED', 'REMAKE') THEN
    RAISE EXCEPTION 'Item cannot be started from current status: %', v_item.status;
  END IF;

  UPDATE public.kitchen_ticket_items
  SET status = 'IN_PROGRESS',
      started_at = COALESCE(started_at, now()),
      updated_at = now()
  WHERE id = p_ticket_item_id;

  -- Ensure Ticket is also marked IN_PROGRESS if it was QUEUED
  SELECT id, status, started_at INTO v_ticket
  FROM public.kitchen_tickets
  WHERE id = v_item.kitchen_ticket_id;

  IF v_ticket.status = 'QUEUED' THEN
    UPDATE public.kitchen_tickets
    SET status = 'IN_PROGRESS',
        started_at = COALESCE(started_at, now()),
        updated_at = now()
    WHERE id = v_item.kitchen_ticket_id;

    INSERT INTO public.kitchen_ticket_events (
      property_id,
      ticket_id,
      event_type,
      from_status,
      to_status,
      performed_by,
      notes
    ) VALUES (
      p_property_id,
      v_item.kitchen_ticket_id,
      'TICKET_STARTED',
      'QUEUED',
      'IN_PROGRESS',
      v_caller_id,
      'Ticket preparation started'
    );
  END IF;

  -- Log Item Audit Event
  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    ticket_item_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_item.kitchen_ticket_id,
    p_ticket_item_id,
    'ITEM_STARTED',
    v_item.status,
    'IN_PROGRESS',
    v_caller_id,
    'Item ' || v_item.item_name || ' started'
  );

  RETURN jsonb_build_object('success', true, 'ticket_item_id', p_ticket_item_id, 'status', 'IN_PROGRESS');
END;
$$;

-- 3. Ready Kitchen Ticket Item (IN_PROGRESS -> READY)
CREATE OR REPLACE FUNCTION public.ready_kitchen_ticket_item(
  p_ticket_item_id UUID,
  p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_item RECORD;
  v_unfinished_count INT;
BEGIN
  v_caller_id := auth.uid();

  SELECT kti.id, kti.kitchen_ticket_id, kti.status, kti.item_name
  INTO v_item
  FROM public.kitchen_ticket_items kti
  JOIN public.kitchen_tickets kt ON kt.id = kti.kitchen_ticket_id
  WHERE kti.id = p_ticket_item_id AND kt.property_id = p_property_id;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Ticket item not found or property mismatch.';
  END IF;

  IF v_item.status NOT IN ('IN_PROGRESS', 'QUEUED', 'REMAKE') THEN
    RAISE EXCEPTION 'Item cannot be marked READY from current status: %', v_item.status;
  END IF;

  UPDATE public.kitchen_ticket_items
  SET status = 'READY',
      ready_at = now(),
      updated_at = now()
  WHERE id = p_ticket_item_id;

  -- Check if all items are READY or COMPLETED
  SELECT count(*) INTO v_unfinished_count
  FROM public.kitchen_ticket_items
  WHERE kitchen_ticket_id = v_item.kitchen_ticket_id
    AND status NOT IN ('READY', 'COMPLETED', 'CANCELLED');

  IF v_unfinished_count = 0 THEN
    UPDATE public.kitchen_tickets
    SET status = 'READY',
        ready_at = COALESCE(ready_at, now()),
        updated_at = now()
    WHERE id = v_item.kitchen_ticket_id;

    INSERT INTO public.kitchen_ticket_events (
      property_id,
      ticket_id,
      event_type,
      from_status,
      to_status,
      performed_by,
      notes
    ) VALUES (
      p_property_id,
      v_item.kitchen_ticket_id,
      'TICKET_READY',
      'IN_PROGRESS',
      'READY',
      v_caller_id,
      'All active items are ready for pickup/service'
    );
  END IF;

  -- Log Item Audit Event
  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    ticket_item_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_item.kitchen_ticket_id,
    p_ticket_item_id,
    'ITEM_READY',
    v_item.status,
    'READY',
    v_caller_id,
    'Item ' || v_item.item_name || ' is ready'
  );

  RETURN jsonb_build_object('success', true, 'ticket_item_id', p_ticket_item_id, 'status', 'READY');
END;
$$;

-- 4. Complete Kitchen Ticket Item (READY -> COMPLETED)
CREATE OR REPLACE FUNCTION public.complete_kitchen_ticket_item(
  p_ticket_item_id UUID,
  p_property_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_item RECORD;
  v_unfinished_count INT;
BEGIN
  v_caller_id := auth.uid();

  SELECT kti.id, kti.kitchen_ticket_id, kti.status, kti.item_name
  INTO v_item
  FROM public.kitchen_ticket_items kti
  JOIN public.kitchen_tickets kt ON kt.id = kti.kitchen_ticket_id
  WHERE kti.id = p_ticket_item_id AND kt.property_id = p_property_id;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Ticket item not found or property mismatch.';
  END IF;

  IF v_item.status NOT IN ('READY', 'IN_PROGRESS', 'QUEUED') THEN
    RAISE EXCEPTION 'Item cannot be completed from current status: %', v_item.status;
  END IF;

  UPDATE public.kitchen_ticket_items
  SET status = 'COMPLETED',
      completed_at = now(),
      updated_at = now()
  WHERE id = p_ticket_item_id;

  -- Check if all items are COMPLETED or CANCELLED
  SELECT count(*) INTO v_unfinished_count
  FROM public.kitchen_ticket_items
  WHERE kitchen_ticket_id = v_item.kitchen_ticket_id
    AND status NOT IN ('COMPLETED', 'CANCELLED');

  IF v_unfinished_count = 0 THEN
    UPDATE public.kitchen_tickets
    SET status = 'COMPLETED',
        completed_at = COALESCE(completed_at, now()),
        updated_at = now()
    WHERE id = v_item.kitchen_ticket_id;

    INSERT INTO public.kitchen_ticket_events (
      property_id,
      ticket_id,
      event_type,
      from_status,
      to_status,
      performed_by,
      notes
    ) VALUES (
      p_property_id,
      v_item.kitchen_ticket_id,
      'TICKET_COMPLETED',
      'READY',
      'COMPLETED',
      v_caller_id,
      'All items served and ticket completed'
    );
  END IF;

  -- Log Item Audit Event
  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    ticket_item_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_item.kitchen_ticket_id,
    p_ticket_item_id,
    'ITEM_COMPLETED',
    v_item.status,
    'COMPLETED',
    v_caller_id,
    'Item ' || v_item.item_name || ' served / completed'
  );

  RETURN jsonb_build_object('success', true, 'ticket_item_id', p_ticket_item_id, 'status', 'COMPLETED');
END;
$$;

-- 5. Requeue Kitchen Ticket Item (IN_PROGRESS -> QUEUED)
CREATE OR REPLACE FUNCTION public.requeue_kitchen_ticket_item(
  p_ticket_item_id UUID,
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
  v_item RECORD;
BEGIN
  v_caller_id := auth.uid();

  SELECT kti.id, kti.kitchen_ticket_id, kti.status, kti.item_name
  INTO v_item
  FROM public.kitchen_ticket_items kti
  JOIN public.kitchen_tickets kt ON kt.id = kti.kitchen_ticket_id
  WHERE kti.id = p_ticket_item_id AND kt.property_id = p_property_id;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Ticket item not found or property mismatch.';
  END IF;

  IF v_item.status != 'IN_PROGRESS' THEN
    RAISE EXCEPTION 'Only IN_PROGRESS items can be requeued (current: %).', v_item.status;
  END IF;

  UPDATE public.kitchen_ticket_items
  SET status = 'QUEUED',
      updated_at = now()
  WHERE id = p_ticket_item_id;

  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    ticket_item_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_item.kitchen_ticket_id,
    p_ticket_item_id,
    'ITEM_REQUEUED',
    'IN_PROGRESS',
    'QUEUED',
    v_caller_id,
    COALESCE(p_notes, 'Item requeued to waiting status')
  );

  RETURN jsonb_build_object('success', true, 'ticket_item_id', p_ticket_item_id, 'status', 'QUEUED');
END;
$$;

-- 6. Remake / Re-fire Kitchen Ticket Item
CREATE OR REPLACE FUNCTION public.remake_kitchen_ticket_item(
  p_ticket_item_id UUID,
  p_property_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_item RECORD;
BEGIN
  v_caller_id := auth.uid();

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to re-fire/remake an item.';
  END IF;

  SELECT kti.id, kti.kitchen_ticket_id, kti.status, kti.item_name, kti.remake_count
  INTO v_item
  FROM public.kitchen_ticket_items kti
  JOIN public.kitchen_tickets kt ON kt.id = kti.kitchen_ticket_id
  WHERE kti.id = p_ticket_item_id AND kt.property_id = p_property_id;

  IF v_item.id IS NULL THEN
    RAISE EXCEPTION 'Ticket item not found or property mismatch.';
  END IF;

  UPDATE public.kitchen_ticket_items
  SET status = 'REMAKE',
      remake_count = v_item.remake_count + 1,
      remake_reason = trim(p_reason),
      updated_at = now()
  WHERE id = p_ticket_item_id;

  -- Reopen Ticket to IN_PROGRESS if it was READY or COMPLETED
  UPDATE public.kitchen_tickets
  SET status = 'IN_PROGRESS',
      updated_at = now()
  WHERE id = v_item.kitchen_ticket_id;

  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    ticket_item_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    v_item.kitchen_ticket_id,
    p_ticket_item_id,
    'ITEM_REMADE',
    v_item.status,
    'REMAKE',
    v_caller_id,
    'Remake requested: ' || trim(p_reason)
  );

  RETURN jsonb_build_object('success', true, 'ticket_item_id', p_ticket_item_id, 'status', 'REMAKE', 'remake_count', v_item.remake_count + 1);
END;
$$;

-- 7. Update Kitchen Ticket Priority
CREATE OR REPLACE FUNCTION public.update_kitchen_ticket_priority(
  p_ticket_id UUID,
  p_property_id UUID,
  p_priority VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_old_priority VARCHAR;
BEGIN
  v_caller_id := auth.uid();

  IF p_priority NOT IN ('LOW', 'NORMAL', 'HIGH', 'URGENT') THEN
    RAISE EXCEPTION 'Invalid priority: %', p_priority;
  END IF;

  SELECT priority INTO v_old_priority
  FROM public.kitchen_tickets
  WHERE id = p_ticket_id AND property_id = p_property_id;

  IF v_old_priority IS NULL THEN
    RAISE EXCEPTION 'Ticket not found.';
  END IF;

  UPDATE public.kitchen_tickets
  SET priority = p_priority,
      updated_at = now()
  WHERE id = p_ticket_id;

  INSERT INTO public.kitchen_ticket_events (
    property_id,
    ticket_id,
    event_type,
    from_status,
    to_status,
    performed_by,
    notes
  ) VALUES (
    p_property_id,
    p_ticket_id,
    'PRIORITY_CHANGED',
    v_old_priority,
    p_priority,
    v_caller_id,
    'Priority elevated from ' || v_old_priority || ' to ' || p_priority
  );

  RETURN jsonb_build_object('success', true, 'ticket_id', p_ticket_id, 'priority', p_priority);
END;
$$;

-- 8. Enhanced Order Cancellation (Auto-cancels linked Kitchen Ticket)
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
  v_ticket_id UUID;
  v_ticket_status VARCHAR(30);
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

  -- Synchronize Kitchen Ticket Cancellation if exists
  SELECT id, status INTO v_ticket_id, v_ticket_status
  FROM public.kitchen_tickets
  WHERE restaurant_order_id = p_order_id;

  IF v_ticket_id IS NOT NULL AND v_ticket_status != 'CANCELLED' THEN
    UPDATE public.kitchen_tickets
    SET status = 'CANCELLED',
        updated_at = now()
    WHERE id = v_ticket_id;

    UPDATE public.kitchen_ticket_items
    SET status = 'CANCELLED',
        updated_at = now()
    WHERE kitchen_ticket_id = v_ticket_id AND status != 'COMPLETED';

    INSERT INTO public.kitchen_ticket_events (
      property_id,
      ticket_id,
      event_type,
      from_status,
      to_status,
      performed_by,
      notes
    ) VALUES (
      p_property_id,
      v_ticket_id,
      'TICKET_CANCELLED',
      v_ticket_status,
      'CANCELLED',
      v_caller_id,
      'Order cancelled: ' || trim(p_cancellation_reason)
    );
  END IF;

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
