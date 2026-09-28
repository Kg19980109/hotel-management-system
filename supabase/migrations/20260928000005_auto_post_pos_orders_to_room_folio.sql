-- Migration: 20260928000005_auto_post_pos_orders_to_room_folio.sql
-- Description: Auto-link POS orders to active room stay and post charges automatically to guest room folios

-- 1. Update create_restaurant_order RPC with room number auto-resolution & folio posting
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
  v_resolved_stay_id UUID := p_stay_id;
  v_resolved_guest_id UUID := p_guest_id;
  v_resolved_room_id UUID := NULL;
  v_room_num_match TEXT;
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

  -- Auto-resolve active stay and room if not directly provided
  IF v_resolved_stay_id IS NULL AND p_notes IS NOT NULL THEN
    v_room_num_match := (regexp_matches(p_notes, '\[Room:\s*([^\]]+)\]', 'i'))[1];
    IF v_room_num_match IS NULL THEN
      v_room_num_match := (regexp_matches(p_notes, 'Room\s*([0-9A-Za-z_-]+)', 'i'))[1];
    END IF;

    IF v_room_num_match IS NOT NULL THEN
      SELECT s.id, s.guest_id, s.room_id
      INTO v_resolved_stay_id, v_resolved_guest_id, v_resolved_room_id
      FROM public.stays s
      JOIN public.rooms r ON r.id = s.room_id
      WHERE s.property_id = p_property_id
        AND s.status = 'CHECKED_IN'
        AND r.room_number ILIKE trim(v_room_num_match)
      ORDER BY s.actual_check_in_at DESC
      LIMIT 1;
    END IF;
  ELSIF v_resolved_stay_id IS NOT NULL THEN
    SELECT s.guest_id, s.room_id
    INTO v_resolved_guest_id, v_resolved_room_id
    FROM public.stays s
    WHERE s.id = v_resolved_stay_id;
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
    room_id,
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
    v_resolved_room_id,
    p_table_id,
    v_order_number,
    p_order_type,
    'OPEN',
    v_resolved_guest_id,
    v_resolved_stay_id,
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

  -- Automatically post Room Service or Stay order to active guest room folio
  IF v_resolved_stay_id IS NOT NULL THEN
    BEGIN
      PERFORM public.post_restaurant_order_to_folio(
        v_order_id,
        v_resolved_stay_id,
        p_property_id,
        v_profile_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Folio auto-posting notice: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'total_amount', v_total,
    'stay_id', v_resolved_stay_id
  );
END;
$$;

-- 2. Update complete_restaurant_order to guarantee folio sync
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
  v_stay_id UUID;
  v_notes TEXT;
  v_other_active_orders INT;
  v_room_num_match TEXT;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT id INTO v_profile_id
    FROM public.profiles
    WHERE auth_user_id = v_caller_id OR id = v_caller_id
    LIMIT 1;
  END IF;

  SELECT status, table_id, stay_id, notes 
  INTO v_current_status, v_table_id, v_stay_id, v_notes
  FROM public.restaurant_orders
  WHERE id = p_order_id AND property_id = p_property_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_current_status IN ('COMPLETED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Order is already %.', v_current_status;
  END IF;

  -- Try resolve stay_id from notes if null
  IF v_stay_id IS NULL AND v_notes IS NOT NULL THEN
    v_room_num_match := (regexp_matches(v_notes, '\[Room:\s*([^\]]+)\]', 'i'))[1];
    IF v_room_num_match IS NULL THEN
      v_room_num_match := (regexp_matches(v_notes, 'Room\s*([0-9A-Za-z_-]+)', 'i'))[1];
    END IF;

    IF v_room_num_match IS NOT NULL THEN
      SELECT s.id, s.guest_id, s.room_id
      INTO v_stay_id
      FROM public.stays s
      JOIN public.rooms r ON r.id = s.room_id
      WHERE s.property_id = p_property_id
        AND s.status = 'CHECKED_IN'
        AND r.room_number ILIKE trim(v_room_num_match)
      ORDER BY s.actual_check_in_at DESC
      LIMIT 1;

      IF v_stay_id IS NOT NULL THEN
        UPDATE public.restaurant_orders
        SET stay_id = v_stay_id
        WHERE id = p_order_id;
      END IF;
    END IF;
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

  -- Ensure room folio posting is synchronized
  IF v_stay_id IS NOT NULL THEN
    BEGIN
      PERFORM public.post_restaurant_order_to_folio(
        p_order_id,
        v_stay_id,
        p_property_id,
        v_profile_id
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Folio auto-posting on completion notice: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'COMPLETED');
END;
$$;
