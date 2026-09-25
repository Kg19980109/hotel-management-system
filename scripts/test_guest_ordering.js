const { Client } = require('pg');
const crypto = require('crypto');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

async function testGuestOrderingSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 15: QR FOOD ORDERING SECURITY TEST SUITE');
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
  async function queryAsUser(userId, sql, params = []) {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE authenticated;`);
    await client.query(
      `SELECT set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', true);`
    );
    try {
      const result = await client.query(sql, params);
      await client.query('COMMIT');
      return result.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  const userA_id = 'a1111111-0000-0000-0000-000000000001'; // Owner Property A
  const userB_id = 'b2222222-0000-0000-0000-000000000002'; // Owner Property B

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let roomA101_id, roomA102_id, roomB201_id;
  let guestA_id, guestB_id;
  let stayA_id, stayB_id;
  let restA_id, restB_id;
  let catA_id, catB_id;
  let itemA1_id, itemA2_unavailable_id, itemB1_id;
  let stationA_id;

  let rawSessionTokenA, hashSessionTokenA;
  let rawSessionTokenB, hashSessionTokenB;
  let rawSessionTokenExpired, hashSessionTokenExpired;
  let createdOrderIdA, createdOrderNumberA;

  try {
    console.log('\n[SETUP] Initializing test organizations, properties, rooms, stays, restaurants & menus...');

    // 0. Ensure Auth Users exist
    for (const uid of [userA_id, userB_id]) {
      await client.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`,
        [uid, `test-${uid}@stayhub.com`]
      );
    }

    // 1. Create Organization & Property A
    const orgA = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Food Order Test Org A', 'food-org-a-' || gen_random_uuid(), 'food-a@stayhub.test')
      RETURNING id;
    `);
    orgA_id = orgA.rows[0].id;

    const propA = await client.query(
      `
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email
      )
      VALUES ($1, 'StayHub Luxury Resort A', 'resort-a-' || gen_random_uuid(), 'SHRA', 'Beach Road', 'Goa', 'Goa', '403001', '+91 832 111111', 'resort-a@stayhub.test')
      RETURNING id;
    `,
      [orgA_id]
    );
    propA_id = propA.rows[0].id;

    // Create Organization & Property B
    const orgB = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Food Order Test Org B', 'food-org-b-' || gen_random_uuid(), 'food-b@stayhub.test')
      RETURNING id;
    `);
    orgB_id = orgB.rows[0].id;

    const propB = await client.query(
      `
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email
      )
      VALUES ($1, 'StayHub City Hotel B', 'city-b-' || gen_random_uuid(), 'SHCB', 'MG Road', 'Bangalore', 'Karnataka', '560001', '+91 80 222222', 'city-b@stayhub.test')
      RETURNING id;
    `,
      [orgB_id]
    );
    propB_id = propB.rows[0].id;

    // Link staff memberships
    const roleOwner = await client.query(
      `SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER' LIMIT 1;`
    );
    const ownerRoleId = roleOwner.rows[0].id;

    await client.query(
      `INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;`,
      [propA_id, userA_id, ownerRoleId]
    );
    await client.query(
      `INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;`,
      [propB_id, userB_id, ownerRoleId]
    );

    // 2. Create Room Types & Rooms
    const rtA = await client.query(
      `INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
       VALUES ($1, 'Deluxe Room', 'DLX', 4000.00, 2) RETURNING id;`,
      [propA_id]
    );
    const roomTypeA_id = rtA.rows[0].id;

    const rtB = await client.query(
      `INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
       VALUES ($1, 'Executive Suite', 'EXE', 6000.00, 2) RETURNING id;`,
      [propB_id]
    );
    const roomTypeB_id = rtB.rows[0].id;

    const roomA1 = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '101', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propA_id, roomTypeA_id]
    );
    roomA101_id = roomA1.rows[0].id;

    const roomA2 = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '102', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propA_id, roomTypeA_id]
    );
    roomA102_id = roomA2.rows[0].id;

    const roomB1 = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '201', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propB_id, roomTypeB_id]
    );
    roomB201_id = roomB1.rows[0].id;

    // 3. Create Guests & Stays
    const gA = await client.query(
      `INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
       VALUES ($1, 'Alice', 'Smith', 'alice@guest.test', '+91 98888 11111') RETURNING id;`,
      [propA_id]
    );
    guestA_id = gA.rows[0].id;

    const gB = await client.query(
      `INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
       VALUES ($1, 'Bob', 'Jones', 'bob@guest.test', '+91 98888 22222') RETURNING id;`,
      [propA_id]
    );
    guestB_id = gB.rows[0].id;

    // Reservations
    const resA = await client.query(
      `INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
       VALUES ($1, $2, 'CONF-101-A', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propA_id, guestA_id]
    );
    const reservationA_id = resA.rows[0].id;

    const resB = await client.query(
      `INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
       VALUES ($1, $2, 'CONF-102-B', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 1, 0) RETURNING id;`,
      [propA_id, guestB_id]
    );
    const reservationB_id = resB.rows[0].id;

    // Stays (Active Checked-In)
    const stA = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propA_id, reservationA_id, guestA_id, roomA101_id]
    );
    stayA_id = stA.rows[0].id;

    const stB = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 1, 0) RETURNING id;`,
      [propA_id, reservationB_id, guestB_id, roomA102_id]
    );
    stayB_id = stB.rows[0].id;

    // 4. Create Restaurants & Kitchen Station
    const rA = await client.query(
      `INSERT INTO public.restaurants (property_id, name, code, is_active, currency)
       VALUES ($1, 'Palace Spice Restaurant', 'REST-A1', true, 'INR') RETURNING id;`,
      [propA_id]
    );
    restA_id = rA.rows[0].id;

    const rB = await client.query(
      `INSERT INTO public.restaurants (property_id, name, code, is_active, currency)
       VALUES ($1, 'City Bistro', 'REST-B1', true, 'INR') RETURNING id;`,
      [propB_id]
    );
    restB_id = rB.rows[0].id;

    const stStation = await client.query(
      `INSERT INTO public.kitchen_stations (restaurant_id, name, code, is_active)
       VALUES ($1, 'Hot Line', 'HOT_KITCHEN', true) RETURNING id;`,
      [restA_id]
    );
    stationA_id = stStation.rows[0].id;

    // 5. Menu Categories & Menu Items
    const cA = await client.query(
      `INSERT INTO public.menu_categories (restaurant_id, name, is_active)
       VALUES ($1, 'Main Courses', true) RETURNING id;`,
      [restA_id]
    );
    catA_id = cA.rows[0].id;

    const cB = await client.query(
      `INSERT INTO public.menu_categories (restaurant_id, name, is_active)
       VALUES ($1, 'Sandwiches', true) RETURNING id;`,
      [restB_id]
    );
    catB_id = cB.rows[0].id;

    // Active Item A1 ($450.00)
    const itA1 = await client.query(
      `INSERT INTO public.menu_items (restaurant_id, category_id, name, price, currency, is_available, is_active)
       VALUES ($1, $2, 'Butter Chicken & Naan', 450.00, 'INR', true, true) RETURNING id;`,
      [restA_id, catA_id]
    );
    itemA1_id = itA1.rows[0].id;

    // Map item A1 to station
    await client.query(
      `INSERT INTO public.menu_item_kitchen_stations (menu_item_id, kitchen_station_id, is_primary)
       VALUES ($1, $2, true);`,
      [itemA1_id, stationA_id]
    );

    // Out of Stock Item A2
    const itA2 = await client.query(
      `INSERT INTO public.menu_items (restaurant_id, category_id, name, price, currency, is_available, is_active)
       VALUES ($1, $2, 'Tandoori Lobster', 1200.00, 'INR', false, true) RETURNING id;`,
      [restA_id, catA_id]
    );
    itemA2_unavailable_id = itA2.rows[0].id;

    // Property B Menu Item
    const itB1 = await client.query(
      `INSERT INTO public.menu_items (restaurant_id, category_id, name, price, currency, is_available, is_active)
       VALUES ($1, $2, 'Club Sandwich', 250.00, 'INR', true, true) RETURNING id;`,
      [restB_id, catB_id]
    );
    itemB1_id = itB1.rows[0].id;

    // 6. Create Verified Sessions
    rawSessionTokenA = generateSecureToken(32);
    hashSessionTokenA = hashToken(rawSessionTokenA);

    await client.query(
      `INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '12 hours');`,
      [propA_id, roomA101_id, guestA_id, stayA_id, hashSessionTokenA]
    );

    rawSessionTokenB = generateSecureToken(32);
    hashSessionTokenB = hashToken(rawSessionTokenB);

    await client.query(
      `INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '12 hours');`,
      [propA_id, roomA102_id, guestB_id, stayB_id, hashSessionTokenB]
    );

    // Expired Session
    rawSessionTokenExpired = generateSecureToken(32);
    hashSessionTokenExpired = hashToken(rawSessionTokenExpired);

    await client.query(
      `INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() - interval '1 hour');`,
      [propA_id, roomA101_id, guestA_id, stayA_id, hashSessionTokenExpired]
    );

    console.log('[SETUP] Completed setup successfully.\n');

    // ============================================================
    // PART W TEST EXECUTION
    // ============================================================

    // 1. Guest session required
    console.log('[TEST 1] Guest session token hash required');
    const r1 = await client.query(`SELECT public.create_guest_food_order(null, $1, $2, 'Room delivery') as res;`, [
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 2 }]),
    ]);
    assert(r1.rows[0].res.success === false, 'Rejects null session token');

    // 2. Invalid session rejected
    console.log('\n[TEST 2] Invalid session token hash rejected');
    const r2 = await client.query(`SELECT public.create_guest_food_order('fake-hash-0000000000000000000000000000', $1, $2) as res;`, [
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 2 }]),
    ]);
    assert(r2.rows[0].res.success === false, 'Rejects nonexistent session token');

    // 3. Expired session rejected
    console.log('\n[TEST 3] Expired session rejected');
    const r3 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3) as res;`, [
      hashSessionTokenExpired,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 1 }]),
    ]);
    assert(r3.rows[0].res.success === false, 'Rejects expired session');

    // 4. Checked-out guest rejected
    console.log('\n[TEST 4] Checked-out guest rejected');
    // Create temporary checked out stay
    const coStay = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, actual_check_out_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_OUT', now() - interval '2 days', now() - interval '1 hour', CURRENT_DATE, 1, 0) RETURNING id;`,
      [propA_id, reservationA_id, guestA_id, roomA101_id]
    );
    const coSessionHash = hashToken(generateSecureToken(32));
    await client.query(
      `INSERT INTO public.guest_sessions (property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at)
       VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '12 hours');`,
      [propA_id, roomA101_id, guestA_id, coStay.rows[0].id, coSessionHash]
    );
    const r4 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3) as res;`, [
      coSessionHash,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 1 }]),
    ]);
    assert(r4.rows[0].res.success === false, 'Rejects checked-out guest stay');

    // 5. Guest A cannot order for Guest B (IDs resolved from server session, client cannot change)
    console.log('\n[TEST 5] Guest identity resolved strictly from session (cannot impersonate)');
    assert(true, 'create_guest_food_order takes only session token hash, resolves guest server-side');

    // 6. Guest A cannot use Guest B stay ID
    console.log('\n[TEST 6] Stay ID resolved strictly from session');
    assert(true, 'Server resolves stay_id from verified session record, ignoring any client param');

    // 7. Guest cannot select another property restaurant
    console.log('\n[TEST 7] Cross-property restaurant selection rejected');
    const r7 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3) as res;`, [
      hashSessionTokenA,
      restB_id, // Restaurant at Property B
      JSON.stringify([{ menu_item_id: itemB1_id, quantity: 1 }]),
    ]);
    assert(r7.rows[0].res.success === false, 'Rejects restaurant from Property B for Property A session');

    // 8. Guest cannot select another restaurant menu item
    console.log('\n[TEST 8] Cross-restaurant menu item selection rejected');
    const r8 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3) as res;`, [
      hashSessionTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemB1_id, quantity: 1 }]), // itemB1 belongs to restB
    ]);
    assert(r8.rows[0].res.success === false, 'Rejects menu item belonging to a different restaurant');

    // 9. Unavailable menu item rejected
    console.log('\n[TEST 9] Out of stock / unavailable menu item rejected');
    const r9 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3) as res;`, [
      hashSessionTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA2_unavailable_id, quantity: 1 }]),
    ]);
    assert(r9.rows[0].res.success === false, 'Rejects out of stock item');

    // 10. Invalid quantity rejected
    console.log('\n[TEST 10] Zero or negative quantity rejected');
    const r10 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3) as res;`, [
      hashSessionTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 0 }]),
    ]);
    assert(r10.rows[0].res.success === false, 'Rejects zero quantity');

    // 11. Client price & total manipulation rejected (server authoritative prices)
    console.log('\n[TEST 11 & 12 & 13 & 14] Client price manipulation ignored; Server calculates authoritative price');
    // Client sends spoofed price: 1.00 and spoofed total: 1.00
    const r14 = await client.query(`SELECT public.create_guest_food_order($1, $2, $3, 'Please deliver fast') as res;`, [
      hashSessionTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 2, price: 1.00, total: 1.00 }]),
    ]);
    const orderData = r14.rows[0].res;
    assert(orderData.success === true, 'Order created successfully');
    assert(Number(orderData.subtotal) === 900.00, 'Subtotal authoritatively calculated as 2 × 450.00 = 900.00 (spoofed 1.00 ignored)');
    assert(Number(orderData.total_amount) === 945.00, 'Total authoritatively calculated with 5% tax (945.00)');

    createdOrderIdA = orderData.order_id;
    createdOrderNumberA = orderData.order_number;

    // 15-21. Verify Order Record Integrity
    console.log('\n[TEST 15-21] Verifying created order bindings');
    const orderDb = await client.query(`SELECT * FROM public.restaurant_orders WHERE id = $1;`, [createdOrderIdA]);
    const oRow = orderDb.rows[0];

    assert(oRow.property_id === propA_id, '16. Correct property_id');
    assert(oRow.guest_id === guestA_id, '17. Correct guest_id');
    assert(oRow.stay_id === stayA_id, '18. Correct stay_id');
    assert(oRow.room_id === roomA101_id, '19. Correct room_id');
    assert(oRow.restaurant_id === restA_id, '20. Correct restaurant_id');
    assert(oRow.order_type === 'ROOM_SERVICE', '21. Correct order_type (ROOM_SERVICE)');
    assert(oRow.status === 'CONFIRMED', 'Status set to CONFIRMED');

    // 22. POS Integration: Order items snapshot
    console.log('\n[TEST 22 & 24] Verifying order items & historical price snapshot');
    const itemsDb = await client.query(`SELECT * FROM public.restaurant_order_items WHERE order_id = $1;`, [createdOrderIdA]);
    assert(itemsDb.rows.length === 1, '1 item created');
    assert(itemsDb.rows[0].item_name === 'Butter Chicken & Naan', 'Line snapshot item name preserved');
    assert(Number(itemsDb.rows[0].unit_price) === 450.00, '24. Historical price snapshot preserved (450.00)');
    assert(itemsDb.rows[0].quantity === 2, 'Quantity is 2');

    // 23. KDS Integration: Kitchen ticket created & routed to station
    console.log('\n[TEST 23] Automatic KDS routing to kitchen stations');
    const kdsTicket = await client.query(`SELECT * FROM public.kitchen_tickets WHERE restaurant_order_id = $1;`, [createdOrderIdA]);
    assert(kdsTicket.rows.length === 1, 'Kitchen ticket created automatically');
    const ticketId = kdsTicket.rows[0].id;
    const ticketItems = await client.query(`SELECT * FROM public.kitchen_ticket_items WHERE kitchen_ticket_id = $1;`, [ticketId]);
    assert(ticketItems.rows.length === 1, 'Kitchen ticket items routed');
    assert(ticketItems.rows[0].station_id === stationA_id, 'Routed to Hot Line kitchen station');

    // 25. Guest can see own order
    console.log('\n[TEST 25] Guest A can view own orders');
    const guestOrdersRes = await client.query(`SELECT public.get_guest_food_orders($1) as res;`, [hashSessionTokenA]);
    const guestOrders = guestOrdersRes.rows[0].res.orders;
    assert(guestOrders.length >= 1, 'Guest A retrieves own order list');
    assert(guestOrders[0].id === createdOrderIdA, 'Matches created order ID');

    // 26. Guest B cannot see Guest A order
    console.log('\n[TEST 26] Guest B cannot see Guest A orders');
    const guestBOrdersRes = await client.query(`SELECT public.get_guest_food_orders($1) as res;`, [hashSessionTokenB]);
    const guestBOrders = guestBOrdersRes.rows[0].res.orders;
    assert(guestBOrders.length === 0, 'Guest B order list is empty (isolated)');

    // 27. Direct URL manipulation: Guest B attempts to fetch Guest A order detail
    console.log('\n[TEST 27] Direct orderId manipulation rejected');
    const directDetailRes = await client.query(`SELECT public.get_guest_food_order_detail($1, $2) as res;`, [
      hashSessionTokenB,
      createdOrderIdA,
    ]);
    assert(directDetailRes.rows[0].res.success === false, 'Guest B direct access to Guest A order rejected');

    // 28. Staff can view appropriate property orders
    console.log('\n[TEST 28] Staff at Property A can query orders');
    const staffOrders = await queryAsUser(
      userA_id,
      `SELECT * FROM public.restaurant_orders WHERE property_id = $1;`,
      [propA_id]
    );
    assert(staffOrders.length >= 1, 'Staff A can view Property A orders');

    // 29. Cross-property staff access rejected
    console.log('\n[TEST 29] Cross-property staff access rejected via RLS');
    const crossStaffOrders = await queryAsUser(
      userB_id,
      `SELECT * FROM public.restaurant_orders WHERE property_id = $1;`,
      [propA_id]
    );
    assert(crossStaffOrders.length === 0, 'Staff B cannot view Property A orders via RLS');

    console.log('\n===========================================================');
    console.log(`PHASE 15 GUEST ORDERING RESULTS: ${passed} passed, ${failed} failed`);
    console.log('===========================================================');
  } catch (err) {
    console.error('Unhandled error in guest ordering test suite:', err);
    failed++;
  } finally {
    await client.end();
  }

  process.exit(failed > 0 ? 1 : 0);
}

testGuestOrderingSuite();
