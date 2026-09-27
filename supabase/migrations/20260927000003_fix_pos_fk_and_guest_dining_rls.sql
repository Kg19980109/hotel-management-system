-- ============================================================
-- MIGRATION: Fix POS Foreign Key Profiles Mapping & Guest Dining RLS
-- ============================================================

-- 1. Ensure all auth users have profiles
INSERT INTO public.profiles (id, auth_user_id, email, full_name, created_at, updated_at)
SELECT 
  u.id, 
  u.id, 
  u.email, 
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  now(),
  now()
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.auth_user_id = u.id OR p.id = u.id
)
ON CONFLICT DO NOTHING;

-- 2. Add Guest/Public SELECT Policies for Dining Outlets & Menu
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS cuisine_type VARCHAR(100) DEFAULT 'Multi-Cuisine / Continental',
  ADD COLUMN IF NOT EXISTS opening_time VARCHAR(20) DEFAULT '07:00 AM',
  ADD COLUMN IF NOT EXISTS closing_time VARCHAR(20) DEFAULT '11:00 PM';

DROP POLICY IF EXISTS rls_restaurants_guest_select ON public.restaurants;
CREATE POLICY rls_restaurants_guest_select ON public.restaurants 
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS rls_menu_categories_guest_select ON public.menu_categories;
CREATE POLICY rls_menu_categories_guest_select ON public.menu_categories 
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS rls_menu_items_guest_select ON public.menu_items;
CREATE POLICY rls_menu_items_guest_select ON public.menu_items 
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS rls_restaurant_tables_guest_select ON public.restaurant_tables;
CREATE POLICY rls_restaurant_tables_guest_select ON public.restaurant_tables 
FOR SELECT TO public USING (is_active = true);

DROP POLICY IF EXISTS properties_public_read ON public.properties;
CREATE POLICY properties_public_read ON public.properties 
FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS rooms_public_read ON public.rooms;
CREATE POLICY rooms_public_read ON public.rooms 
FOR SELECT TO public USING (is_active = true);

-- 3. Update create_restaurant_order RPC with profile resolution
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
  v_profile_id UUID := NULL;
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

    -- Resolve profile id from auth_user_id or id
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_user_id = v_caller_id OR id = v_caller_id
    LIMIT 1;
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

    -- Check for existing active order on this table
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
    v_profile_id,
    p_notes,
    0,
    v_discount,
    v_tax,
    v_service_charge,
    0,
    COALESCE(v_rest_currency, 'INR')
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
    v_profile_id,
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

-- 4. Update confirm_restaurant_order, complete_restaurant_order, cancel_restaurant_order
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
  v_profile_id UUID := NULL;
  v_current_status VARCHAR(30);
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_user_id = v_caller_id OR id = v_caller_id
    LIMIT 1;
  END IF;

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
    v_profile_id,
    COALESCE(p_notes, 'Order confirmed by cashier')
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'CONFIRMED');
END;
$$;

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
  v_profile_id UUID := NULL;
  v_current_status VARCHAR(30);
  v_table_id UUID;
  v_other_active_orders INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_user_id = v_caller_id OR id = v_caller_id
    LIMIT 1;
  END IF;

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
    v_profile_id,
    COALESCE(p_notes, 'Order completed')
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'COMPLETED');
END;
$$;

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
  v_profile_id UUID := NULL;
  v_current_status VARCHAR(30);
  v_table_id UUID;
  v_other_active_orders INT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_user_id = v_caller_id OR id = v_caller_id
    LIMIT 1;
  END IF;

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
      cancelled_by = v_profile_id,
      cancellation_reason = trim(p_cancellation_reason),
      cancelled_at = now(),
      updated_at = now()
  WHERE id = p_order_id;

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
    v_profile_id,
    'Cancelled: ' || trim(p_cancellation_reason)
  );

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'CANCELLED');
END;
$$;
