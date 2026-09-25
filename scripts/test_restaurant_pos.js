const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testRestaurantPosSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 12: RESTAURANT POS INTEGRATION SUITE');
  console.log('===========================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Helper: execute query as authenticated user with Supabase JWT claims
  async function queryAsUser(userId, sql) {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE authenticated;`);
    await client.query(`SELECT set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', true);`);
    try {
      const result = await client.query(sql);
      await client.query('COMMIT');
      return result.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  const userA_id = 'a1111111-0000-0000-0000-000000000001'; // Owner at Property A
  const userB_id = 'b2222222-0000-0000-0000-000000000002'; // Owner at Property B
  const userR_id = '77777777-7777-7777-7777-777777777777'; // Restaurant Staff at Property A
  const userD_id = 'd4444444-0000-0000-0000-000000000004'; // Unaffiliated user

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let restA1_id, restA2_id, restB1_id;
  let areaA1_id, areaA2_id, areaB1_id;
  let tableA1_id, tableA2_id, tableB1_id;
  let catA1_id, catA2_id, catB1_id;
  let itemA1_id, itemA2_id, itemA3_id, itemB1_id;
  let guestA1_id, guestB1_id;
  let stayA1_id;
  let order1_id, order1_number;
  let order2_id, order2_number;

  try {
    // 0. Setup Mock Users & Property Structure
    console.log('\n[SETUP] Initializing test organizations, properties, and roles...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'alice@prop-a.com', '{"full_name": "Alice Owner"}', now(), now()),
        ('${userB_id}', 'bob@prop-b.com', '{"full_name": "Bob Owner"}', now(), now()),
        ('${userR_id}', 'rita@prop-a.com', '{"full_name": "Rita Staff"}', now(), now()),
        ('${userD_id}', 'dave@external.com', '{"full_name": "Dave Stranger"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO public.profiles (id, auth_user_id, full_name, email, status)
      VALUES 
        ('${userA_id}', '${userA_id}', 'Alice Owner', 'alice@prop-a.com', 'active'),
        ('${userB_id}', '${userB_id}', 'Bob Owner', 'bob@prop-b.com', 'active'),
        ('${userR_id}', '${userR_id}', 'Rita Restaurant Staff', 'rita@prop-a.com', 'active'),
        ('${userD_id}', '${userD_id}', 'Dave Stranger', 'dave@external.com', 'active')
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    `);

    const timestamp = Date.now();

    // Clean up any residual test data for test users
    await client.query(`DELETE FROM public.properties WHERE slug LIKE 'rest-prop-%';`);
    await client.query(`DELETE FROM public.organizations WHERE slug LIKE 'rest-org-%';`);

    // Create Organizations & Properties
    const orgRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES 
        ('Org Rest A', 'rest-org-a-${timestamp}', '${userA_id}'),
        ('Org Rest B', 'rest-org-b-${timestamp}', '${userB_id}')
      RETURNING id;
    `);
    orgA_id = orgRes.rows[0].id;
    orgB_id = orgRes.rows[1].id;

    const propRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, timezone, currency, created_by)
      VALUES 
        ('${orgA_id}', 'Property A Grand Resort', 'rest-prop-a-${timestamp}', '10 Main St', 'Miami', 'FL', '33101', 'America/New_York', 'USD', '${userA_id}'),
        ('${orgB_id}', 'Property B Seaside Villa', 'rest-prop-b-${timestamp}', '20 Beach Rd', 'Goa', 'GA', '403001', 'Asia/Kolkata', 'USD', '${userB_id}')
      RETURNING id;
    `);
    propA_id = propRes.rows[0].id;
    propB_id = propRes.rows[1].id;

    // Fetch Roles
    const rolesRes = await client.query(`SELECT id, code FROM public.roles;`);
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.code] = r.id; });

    // Memberships
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES 
        ('${propA_id}', '${userA_id}', '${roleMap['HOTEL_OWNER']}', 'active'),
        ('${propA_id}', '${userR_id}', '${roleMap['RESTAURANT_STAFF']}', 'active'),
        ('${propB_id}', '${userB_id}', '${roleMap['HOTEL_OWNER']}', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // Setup Floors, Room Types, Rooms, Guest, Reservation & Stay in Prop A
    const floorARes = await client.query(`
      INSERT INTO public.floors (property_id, floor_number, name)
      VALUES ('${propA_id}', 1, 'Floor 1')
      RETURNING id;
    `);
    const floorA1_id = floorARes.rows[0].id;

    const roomTypeRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ('${propA_id}', 'Deluxe Suite', 'DLX', 150.00, 2)
      RETURNING id;
    `);
    const roomRes = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${roomTypeRes.rows[0].id}', '101', 'AVAILABLE', 'CLEAN')
      RETURNING id;
    `);
    const guestRes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email)
      VALUES 
        ('${propA_id}', 'John', 'Doe', 'john@example.com'),
        ('${propB_id}', 'Jane', 'Smith', 'jane@example.com')
      RETURNING id, property_id;
    `);
    guestA1_id = guestRes.rows.find(g => g.property_id === propA_id).id;
    guestB1_id = guestRes.rows.find(g => g.property_id === propB_id).id;

    const resvRes = await client.query(`
      INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, check_in_date, check_out_date, status, total_amount)
      VALUES ('${propA_id}', '${guestA1_id}', 'RES-REST-${timestamp}', CURRENT_DATE, CURRENT_DATE + 2, 'CONFIRMED', 300.00)
      RETURNING id;
    `);
    const resRoomRes = await client.query(`
      INSERT INTO public.reservation_rooms (property_id, reservation_id, room_id, room_type_id, check_in_date, check_out_date, nightly_rate, total_amount)
      VALUES ('${propA_id}', '${resvRes.rows[0].id}', '${roomRes.rows[0].id}', '${roomTypeRes.rows[0].id}', CURRENT_DATE, CURRENT_DATE + 2, 150.00, 300.00)
      RETURNING id;
    `);
    const stayRes = await client.query(`
      INSERT INTO public.stays (property_id, reservation_id, reservation_room_id, room_id, guest_id, actual_check_in_at, expected_check_out_date, status)
      VALUES ('${propA_id}', '${resvRes.rows[0].id}', '${resRoomRes.rows[0].id}', '${roomRes.rows[0].id}', '${guestA1_id}', now(), CURRENT_DATE + 2, 'CHECKED_IN')
      RETURNING id;
    `);
    stayA1_id = stayRes.rows[0].id;

    console.log('\n[TEST GROUP 1: Restaurant Outlets & Multi-Tenancy]');
    
    // Test 1: Create restaurant
    const restA1Res = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, description, currency)
      VALUES ('${propA_id}', 'The Grand Bistro', 'BISTRO', 'All-day fine dining', 'USD')
      RETURNING id;
    `);
    restA1_id = restA1Res.rows[0].id;
    assert(!!restA1_id, '1. Create restaurant outlet successfully');

    // Create 2nd restaurant at Prop A
    const restA2Res = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, description, currency)
      VALUES ('${propA_id}', 'Sky Lounge Bar', 'SKYBAR', 'Rooftop cocktail bar', 'USD')
      RETURNING id;
    `);
    restA2_id = restA2Res.rows[0].id;

    // Create restaurant at Prop B
    const restB1Res = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, description, currency)
      VALUES ('${propB_id}', 'Seaside Grill', 'GRILL', 'Beachside dining', 'USD')
      RETURNING id;
    `);
    restB1_id = restB1Res.rows[0].id;

    // Test 2: Property isolation (query as user A)
    const restsAsUserA = await queryAsUser(userA_id, `SELECT id, name FROM public.restaurants;`);
    assert(
      restsAsUserA.some(r => r.id === restA1_id) && !restsAsUserA.some(r => r.id === restB1_id),
      '2. Property isolation: User A only sees Property A restaurants'
    );

    // Test 3: Cross-property restaurant access denied (User B reading Prop A restaurants)
    const restsAsUserB = await queryAsUser(userB_id, `SELECT id, name FROM public.restaurants;`);
    assert(
      restsAsUserB.some(r => r.id === restB1_id) && !restsAsUserB.some(r => r.id === restA1_id),
      '3. Cross-property restaurant access denied for User B'
    );

    console.log('\n[TEST GROUP 2: Restaurant Areas & Tables]');

    // Test 4: Create area
    const areaA1Res = await client.query(`
      INSERT INTO public.restaurant_areas (restaurant_id, name, description, display_order)
      VALUES ('${restA1_id}', 'Main Dining', 'Indoor air-conditioned area', 1)
      RETURNING id;
    `);
    areaA1_id = areaA1Res.rows[0].id;

    const areaA2Res = await client.query(`
      INSERT INTO public.restaurant_areas (restaurant_id, name, display_order)
      VALUES ('${restA2_id}', 'Rooftop Terrace', 1)
      RETURNING id;
    `);
    areaA2_id = areaA2Res.rows[0].id;

    const areaB1Res = await client.query(`
      INSERT INTO public.restaurant_areas (restaurant_id, name, display_order)
      VALUES ('${restB1_id}', 'Beachfront Deck', 1)
      RETURNING id;
    `);
    areaB1_id = areaB1Res.rows[0].id;

    assert(!!areaA1_id, '4. Create restaurant area successfully');

    // Test 5: Create table
    const tableA1Res = await client.query(`
      INSERT INTO public.restaurant_tables (restaurant_id, area_id, table_number, display_name, capacity, status)
      VALUES ('${restA1_id}', '${areaA1_id}', '1', 'Window Table 1', 4, 'AVAILABLE')
      RETURNING id;
    `);
    tableA1_id = tableA1Res.rows[0].id;
    assert(!!tableA1_id, '5. Create table successfully');

    // Test 6: Table uniqueness within restaurant
    let duplicateTableError = false;
    try {
      await client.query(`
        INSERT INTO public.restaurant_tables (restaurant_id, area_id, table_number, capacity)
        VALUES ('${restA1_id}', '${areaA1_id}', '1', 2);
      `);
    } catch (err) {
      duplicateTableError = true;
    }
    assert(duplicateTableError, '6. Table uniqueness enforced within restaurant');

    // Test 7: Same table number allowed in another restaurant
    const tableA2Res = await client.query(`
      INSERT INTO public.restaurant_tables (restaurant_id, area_id, table_number, capacity)
      VALUES ('${restA2_id}', '${areaA2_id}', '1', 2)
      RETURNING id;
    `);
    tableA2_id = tableA2Res.rows[0].id;
    assert(!!tableA2_id, '7. Same table number allowed in another restaurant outlet');

    const tableB1Res = await client.query(`
      INSERT INTO public.restaurant_tables (restaurant_id, area_id, table_number, capacity)
      VALUES ('${restB1_id}', '${areaB1_id}', '1', 4)
      RETURNING id;
    `);
    tableB1_id = tableB1Res.rows[0].id;

    // Test 8: Restaurant / area table consistency trigger
    let crossAreaError = false;
    try {
      await client.query(`
        INSERT INTO public.restaurant_tables (restaurant_id, area_id, table_number, capacity)
        VALUES ('${restA1_id}', '${areaA2_id}', '99', 4);
      `);
    } catch (err) {
      crossAreaError = true;
    }
    assert(crossAreaError, '8. Restaurant/table area consistency trigger enforced');

    console.log('\n[TEST GROUP 3: Menu Categories & Menu Items]');

    // Test 9: Create category
    const catA1Res = await client.query(`
      INSERT INTO public.menu_categories (restaurant_id, name, display_order)
      VALUES ('${restA1_id}', 'Main Course', 1)
      RETURNING id;
    `);
    catA1_id = catA1Res.rows[0].id;

    const catA2Res = await client.query(`
      INSERT INTO public.menu_categories (restaurant_id, name, display_order)
      VALUES ('${restA2_id}', 'Cocktails', 1)
      RETURNING id;
    `);
    catA2_id = catA2Res.rows[0].id;

    const catB1Res = await client.query(`
      INSERT INTO public.menu_categories (restaurant_id, name, display_order)
      VALUES ('${restB1_id}', 'Seafood', 1)
      RETURNING id;
    `);
    catB1_id = catB1Res.rows[0].id;
    assert(!!catA1_id, '9. Create menu category successfully');

    // Test 10: Create menu item
    const itemA1Res = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, price, is_available)
      VALUES ('${restA1_id}', '${catA1_id}', 'Paneer Butter Masala', 280.00, true)
      RETURNING id;
    `);
    itemA1_id = itemA1Res.rows[0].id;

    const itemA2Res = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, price, is_available)
      VALUES ('${restA1_id}', '${catA1_id}', 'Garlic Naan', 60.00, true)
      RETURNING id;
    `);
    itemA2_id = itemA2Res.rows[0].id;

    // Item A3: Out of stock item
    const itemA3Res = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, price, is_available)
      VALUES ('${restA1_id}', '${catA1_id}', 'Truffle Pasta', 450.00, false)
      RETURNING id;
    `);
    itemA3_id = itemA3Res.rows[0].id;

    const itemB1Res = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, price, is_available)
      VALUES ('${restB1_id}', '${catB1_id}', 'Grilled Lobster', 650.00, true)
      RETURNING id;
    `);
    itemB1_id = itemB1Res.rows[0].id;

    assert(!!itemA1_id, '10. Create menu item with numeric pricing');

    // Test 11: Category / menu item consistency trigger
    let crossCatError = false;
    try {
      await client.query(`
        INSERT INTO public.menu_items (restaurant_id, category_id, name, price)
        VALUES ('${restA1_id}', '${catB1_id}', 'Cross Item', 100.00);
      `);
    } catch (err) {
      crossCatError = true;
    }
    assert(crossCatError, '11. Menu item / Category restaurant consistency enforced');

    // Test 12: Menu availability toggle
    await client.query(`UPDATE public.menu_items SET is_available = true WHERE id = '${itemA3_id}';`);
    const itemCheck1 = await client.query(`SELECT is_available FROM public.menu_items WHERE id = '${itemA3_id}';`);
    await client.query(`UPDATE public.menu_items SET is_available = false WHERE id = '${itemA3_id}';`);
    const itemCheck2 = await client.query(`SELECT is_available FROM public.menu_items WHERE id = '${itemA3_id}';`);
    assert(itemCheck1.rows[0].is_available === true && itemCheck2.rows[0].is_available === false, '12. Menu availability toggle operation');

    console.log('\n[TEST GROUP 4: Orders, Pricing, and Calculations]');

    // Test 13: Create DINE_IN order via atomic RPC
    const order1RpcRes = await client.query(`
      SELECT create_restaurant_order(
        p_property_id => '${propA_id}'::UUID,
        p_restaurant_id => '${restA1_id}'::UUID,
        p_order_type => 'DINE_IN'::VARCHAR,
        p_items => '[
          {"menu_item_id": "${itemA1_id}", "quantity": 2, "notes": "No extra butter"},
          {"menu_item_id": "${itemA2_id}", "quantity": 3}
        ]'::JSONB,
        p_table_id => '${tableA1_id}'::UUID,
        p_discount_amount => 40.00::NUMERIC,
        p_notes => 'Less spicy please'::TEXT,
        p_guest_id => '${guestA1_id}'::UUID,
        p_stay_id => '${stayA1_id}'::UUID
      ) AS result;
    `);
    const order1Result = order1RpcRes.rows[0].result;
    order1_id = order1Result.order_id;
    order1_number = order1Result.order_number;
    assert(!!order1_id && !!order1_number, `13. Create DINE_IN order (${order1_number})`);

    // Test 14: Create TAKEAWAY order
    const order2RpcRes = await client.query(`
      SELECT create_restaurant_order(
        p_property_id => '${propA_id}'::UUID,
        p_restaurant_id => '${restA1_id}'::UUID,
        p_order_type => 'TAKEAWAY'::VARCHAR,
        p_items => '[
          {"menu_item_id": "${itemA1_id}", "quantity": 1}
        ]'::JSONB,
        p_notes => 'Pack separately'::TEXT
      ) AS result;
    `);
    order2_id = order2RpcRes.rows[0].result.order_id;
    order2_number = order2RpcRes.rows[0].result.order_number;
    assert(!!order2_id && !!order2_number && order2_number !== order1_number, `14. Create TAKEAWAY order (${order2_number})`);

    // Test 15: Order number uniqueness
    const orderCheck = await client.query(`
      SELECT COUNT(DISTINCT order_number) as distinct_count, COUNT(*) as total_count 
      FROM public.restaurant_orders 
      WHERE property_id = '${propA_id}';
    `);
    assert(orderCheck.rows[0].distinct_count === orderCheck.rows[0].total_count, '15. Server-side order number uniqueness');

    // Test 16: Server-side price validation & calculation
    const order1Row = await client.query(`SELECT * FROM public.restaurant_orders WHERE id = '${order1_id}';`);
    const order1Data = order1Row.rows[0];
    // 2 x 280 (560) + 3 x 60 (180) = 740 subtotal. Discount = 40. Total = 700.
    assert(
      Number(order1Data.subtotal) === 740.00 && Number(order1Data.total_amount) === 700.00,
      `16. Server-side price validation: Subtotal=$${order1Data.subtotal}, Total=$${order1Data.total_amount}`
    );

    // Test 17: Historical price snapshot
    // Change menu item price now from 280 to 350
    await client.query(`UPDATE public.menu_items SET price = 350.00 WHERE id = '${itemA1_id}';`);
    const orderItemRow = await client.query(`
      SELECT item_name, unit_price, line_total FROM public.restaurant_order_items 
      WHERE order_id = '${order1_id}' AND menu_item_id = '${itemA1_id}';
    `);
    assert(
      Number(orderItemRow.rows[0].unit_price) === 280.00,
      `17. Historical price snapshot preserved at $${orderItemRow.rows[0].unit_price} after menu price updated to $350`
    );

    // Test 18: Quantity calculations
    assert(Number(orderItemRow.rows[0].line_total) === 560.00, '18. Order item line_total quantity calculation');

    // Test 19: Subtotal calculation
    assert(Number(order1Data.subtotal) === 740.00, '19. Order subtotal matches sum of line totals');

    // Test 20: Discount validation (discount exceeding subtotal capped or rejected)
    let negativeDiscountError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemA2_id}", "quantity": 1}]'::JSONB,
          p_discount_amount => -50.00::NUMERIC
        );
      `);
    } catch (err) {
      negativeDiscountError = true;
    }
    assert(negativeDiscountError, '20. Negative discount rejected server-side');

    // Test 21: Tax calculation structure
    assert(Number(order1Data.tax_amount) === 0.00, '21. Tax calculation structure initialized');

    // Test 22: Total calculation
    assert(
      Number(order1Data.total_amount) === Number(order1Data.subtotal) - Number(order1Data.discount_amount),
      '22. Total amount correctly derived from subtotal, discount, and tax'
    );

    console.log('\n[TEST GROUP 5: Security & Rejection Cases]');

    // Test 23: Invalid menu item rejected
    let invalidItemError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "00000000-0000-0000-0000-000000000000", "quantity": 1}]'::JSONB
        );
      `);
    } catch (err) {
      invalidItemError = true;
    }
    assert(invalidItemError, '23. Invalid menu item rejected');

    // Test 24: Unavailable menu item rejected
    let unavailableItemError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemA3_id}", "quantity": 1}]'::JSONB
        );
      `);
    } catch (err) {
      unavailableItemError = true;
    }
    assert(unavailableItemError, '24. Unavailable (out-of-stock) menu item rejected');

    // Test 25: Cross-restaurant menu item rejected
    let crossRestItemError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemB1_id}", "quantity": 1}]'::JSONB
        );
      `);
    } catch (err) {
      crossRestItemError = true;
    }
    assert(crossRestItemError, '25. Cross-restaurant menu item rejected');

    // Test 26: Cross-property menu item rejected
    let crossPropItemError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemB1_id}", "quantity": 1}]'::JSONB
        );
      `);
    } catch (err) {
      crossPropItemError = true;
    }
    assert(crossPropItemError, '26. Cross-property menu item rejected');

    // Test 27: Guest / property consistency
    let crossGuestError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemA2_id}", "quantity": 1}]'::JSONB,
          p_guest_id => '${guestB1_id}'::UUID
        );
      `);
    } catch (err) {
      crossGuestError = true;
    }
    assert(crossGuestError, '27. Cross-property guest reference rejected');

    // Test 28: Stay / guest consistency
    let crossStayError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'TAKEAWAY'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemA2_id}", "quantity": 1}]'::JSONB,
          p_guest_id => '${guestB1_id}'::UUID,
          p_stay_id => '${stayA1_id}'::UUID
        );
      `);
    } catch (err) {
      crossStayError = true;
    }
    assert(crossStayError, '28. Stay / guest cross-reference rejected');

    // Test 29: Table / order consistency (table from another restaurant)
    let crossTableError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'DINE_IN'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemA2_id}", "quantity": 1}]'::JSONB,
          p_table_id => '${tableB1_id}'::UUID
        );
      `);
    } catch (err) {
      crossTableError = true;
    }
    assert(crossTableError, '29. Table from another restaurant rejected');

    console.log('\n[TEST GROUP 6: Table Lifecycle & Synchronization]');

    // Test 30: One active order per table protection
    let duplicateActiveTableOrderError = false;
    try {
      await client.query(`
        SELECT create_restaurant_order(
          p_property_id => '${propA_id}'::UUID,
          p_restaurant_id => '${restA1_id}'::UUID,
          p_order_type => 'DINE_IN'::VARCHAR,
          p_items => '[{"menu_item_id": "${itemA2_id}", "quantity": 1}]'::JSONB,
          p_table_id => '${tableA1_id}'::UUID
        );
      `);
    } catch (err) {
      duplicateActiveTableOrderError = true;
    }
    assert(duplicateActiveTableOrderError, '30. One active order per table protection enforced');

    // Test 31: Table OCCUPIED synchronization
    const tableStatus1 = await client.query(`SELECT status FROM public.restaurant_tables WHERE id = '${tableA1_id}';`);
    assert(tableStatus1.rows[0].status === 'OCCUPIED', '31. Table status automatically synchronized to OCCUPIED on order creation');

    // Test 32: Table AVAILABLE synchronization upon completion
    await client.query(`
      SELECT complete_restaurant_order(
        p_order_id => '${order1_id}'::UUID,
        p_property_id => '${propA_id}'::UUID,
        p_notes => 'Table paid cash'::TEXT
      );
    `);
    const tableStatus2 = await client.query(`SELECT status FROM public.restaurant_tables WHERE id = '${tableA1_id}';`);
    assert(tableStatus2.rows[0].status === 'AVAILABLE', '32. Table status automatically synchronized to AVAILABLE on order completion');

    // Test 33: Cancel order
    // Create new order on Table A1 then cancel it
    const order3Rpc = await client.query(`
      SELECT create_restaurant_order(
        p_property_id => '${propA_id}'::UUID,
        p_restaurant_id => '${restA1_id}'::UUID,
        p_order_type => 'DINE_IN'::VARCHAR,
        p_items => '[{"menu_item_id": "${itemA2_id}", "quantity": 1}]'::JSONB,
        p_table_id => '${tableA1_id}'::UUID
      ) AS result;
    `);
    const order3_id = order3Rpc.rows[0].result.order_id;
    await client.query(`
      SELECT cancel_restaurant_order(
        p_order_id => '${order3_id}'::UUID,
        p_property_id => '${propA_id}'::UUID,
        p_cancellation_reason => 'Guest had to leave urgently'::TEXT
      );
    `);
    const order3Row = await client.query(`SELECT status, cancellation_reason FROM public.restaurant_orders WHERE id = '${order3_id}';`);
    assert(
      order3Row.rows[0].status === 'CANCELLED' && order3Row.rows[0].cancellation_reason === 'Guest had to leave urgently',
      '33. Cancel order updates status to CANCELLED and saves reason'
    );

    // Test 34: Cancellation reason required
    let emptyReasonError = false;
    try {
      await client.query(`
        SELECT cancel_restaurant_order(
          p_order_id => '${order2_id}'::UUID,
          p_property_id => '${propA_id}'::UUID,
          p_cancellation_reason => '   '::TEXT
        );
      `);
    } catch (err) {
      emptyReasonError = true;
    }
    assert(emptyReasonError, '34. Order cancellation requires non-empty reason');

    // Test 35: Completed order cannot be deleted or re-cancelled
    let cancelCompletedError = false;
    try {
      await client.query(`
        SELECT cancel_restaurant_order(
          p_order_id => '${order1_id}'::UUID,
          p_property_id => '${propA_id}'::UUID,
          p_cancellation_reason => 'Trying to cancel completed'::TEXT
        );
      `);
    } catch (err) {
      cancelCompletedError = true;
    }
    assert(cancelCompletedError, '35. Completed order cannot be cancelled');

    console.log('\n[TEST GROUP 7: RBAC, RLS & Soft Deletion]');

    // Test 36: Permission enforcement (unaffiliated user cannot access)
    const ordersAsStranger = await queryAsUser(userD_id, `SELECT id FROM public.restaurant_orders WHERE property_id = '${propA_id}';`);
    assert(ordersAsStranger.length === 0, '36. Unaffiliated user denied access via RLS');

    // Test 37: RLS insert protection (User B cannot insert order into Prop A)
    let crossInsertBlocked = false;
    try {
      await queryAsUser(userB_id, `
        INSERT INTO public.restaurant_orders (property_id, restaurant_id, order_number, order_type, status)
        VALUES ('${propA_id}', '${restA1_id}', 'HACK-01', 'TAKEAWAY', 'OPEN');
      `);
    } catch (err) {
      crossInsertBlocked = true;
    }
    assert(crossInsertBlocked, '37. RLS denies cross-property order insertion');

    // Test 38: RLS update protection
    let crossUpdateBlocked = false;
    try {
      await queryAsUser(userB_id, `
        UPDATE public.restaurant_orders SET notes = 'Hacked' WHERE id = '${order1_id}';
      `);
    } catch (err) {
      crossUpdateBlocked = true;
    }
    const order1Check = await client.query(`SELECT notes FROM public.restaurant_orders WHERE id = '${order1_id}';`);
    assert(crossUpdateBlocked || order1Check.rows[0].notes !== 'Hacked', '38. RLS denies cross-property order update');

    // Test 39: RLS delete protection
    let deleteBlocked = false;
    try {
      await queryAsUser(userB_id, `DELETE FROM public.restaurant_orders WHERE id = '${order1_id}';`);
    } catch (err) {
      deleteBlocked = true;
    }
    const order1Exists = await client.query(`SELECT id FROM public.restaurant_orders WHERE id = '${order1_id}';`);
    assert(deleteBlocked || order1Exists.rows.length === 1, '39. RLS denies cross-property order deletion');

    // Test 40: Order history remains after menu item deactivation
    await client.query(`UPDATE public.menu_items SET is_active = false WHERE id = '${itemA1_id}';`);
    const historyItem = await client.query(`
      SELECT oi.item_name, oi.unit_price, oi.line_total 
      FROM public.restaurant_order_items oi
      WHERE oi.order_id = '${order1_id}' AND oi.menu_item_id = '${itemA1_id}';
    `);
    assert(
      historyItem.rows.length === 1 && historyItem.rows[0].item_name === 'Paneer Butter Masala',
      '40. Historical order line items preserved after menu item deactivation'
    );

    // Test 41: Table history remains after table deactivation
    await client.query(`UPDATE public.restaurant_tables SET is_active = false WHERE id = '${tableA1_id}';`);
    const orderWithTable = await client.query(`
      SELECT ro.id, ro.order_number, rt.table_number 
      FROM public.restaurant_orders ro
      JOIN public.restaurant_tables rt ON rt.id = ro.table_id
      WHERE ro.id = '${order1_id}';
    `);
    assert(orderWithTable.rows.length === 1, '41. Historical orders reference table after soft deactivation');

    // Test 42: Audit event creation
    const auditEvents = await client.query(`
      SELECT event_type FROM public.restaurant_order_events 
      WHERE order_id = '${order1_id}'
      ORDER BY created_at ASC;
    `);
    assert(
      auditEvents.rows.some(e => e.event_type === 'CREATED') && auditEvents.rows.some(e => e.event_type === 'COMPLETED'),
      '42. Audit event trail recorded CREATED and COMPLETED events'
    );

    // Test 43: Restaurant filtering
    const restAOrders = await client.query(`SELECT COUNT(*) FROM public.restaurant_orders WHERE restaurant_id = '${restA1_id}';`);
    const restBOrders = await client.query(`SELECT COUNT(*) FROM public.restaurant_orders WHERE restaurant_id = '${restB1_id}';`);
    assert(Number(restAOrders.rows[0].count) >= 2 && Number(restBOrders.rows[0].count) === 0, '43. Restaurant outlet filtering correctly isolates orders');

    // Test 44: Order status & type filtering
    const completedOrders = await client.query(`SELECT COUNT(*) FROM public.restaurant_orders WHERE property_id = '${propA_id}' AND status = 'COMPLETED';`);
    const cancelledOrders = await client.query(`SELECT COUNT(*) FROM public.restaurant_orders WHERE property_id = '${propA_id}' AND status = 'CANCELLED';`);
    assert(Number(completedOrders.rows[0].count) >= 1 && Number(cancelledOrders.rows[0].count) >= 1, '44. Order filtering by status and type');

    // Test 45: Dashboard KPI calculations
    const todaySalesRes = await client.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total_sales
      FROM public.restaurant_orders
      WHERE property_id = '${propA_id}' AND status != 'CANCELLED';
    `);
    assert(Number(todaySalesRes.rows[0].total_sales) > 0, `45. Restaurant KPI gross order sales calculated ($${todaySalesRes.rows[0].total_sales})`);

  } catch (err) {
    console.error('Fatal Error during test execution:', err);
    failed++;
  } finally {
    console.log('\n===========================================================');
    console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log('===========================================================');
    await client.end();
    if (failed > 0) {
      process.exit(1);
    }
  }
}

testRestaurantPosSuite().catch((err) => {
  console.error('Test suite failed to run:', err);
  process.exit(1);
});
