const { Client } = require('pg');
const crypto = require('crypto');

const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      connectionString = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

async function runPhase7E2ETestSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 7: FOOD ORDERING & KDS E2E PRODUCTION SUITE');
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

  const userA_id = 'e7000000-0000-0000-0000-000000000001';
  const userB_id = 'e7000000-0000-0000-0000-000000000002';

  let orgA_id, propA_id, propB_id;
  let roomA_id, roomB_id;
  let guestA_id, guestB_id;
  let stayA_id, stayB_id;
  let restA_id, restB_id;
  let tableA_id;
  let stationHot_id, stationCold_id;
  let catA_id;
  let itemA1_id, itemA2_id;
  let rawTokenA, hashTokenA;
  let rawTokenB, hashTokenB;

  try {
    console.log('\n[SETUP] Initializing Phase 7 test environment...');

    // 0. Ensure auth users
    for (const uid of [userA_id, userB_id]) {
      await client.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`,
        [uid, `phase7-${uid}@stayhub.test`]
      );
    }

    // 1. Organization & Properties
    const orgRes = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Phase 7 Luxury Hospitality', 'phase7-org-' || gen_random_uuid(), 'phase7@stayhub.test')
      RETURNING id;
    `);
    orgA_id = orgRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email)
      VALUES ($1, 'StayHub Grand Resort A', 'grand-resort-a-' || gen_random_uuid(), 'SGRA', 'Palm Beach Road', 'Goa', 'Goa', '403001', '+91 832 999991', 'resort-a@stayhub.test')
      RETURNING id;
    `, [orgA_id]);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email)
      VALUES ($1, 'StayHub City Boutique B', 'city-boutique-b-' || gen_random_uuid(), 'SCBB', 'MG Road', 'Mumbai', 'Maharashtra', '400001', '+91 22 999992', 'resort-b@stayhub.test')
      RETURNING id;
    `, [orgA_id]);
    propB_id = propBRes.rows[0].id;

    // 2. Room Types & Rooms
    const rtRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ($1, 'Presidential Villa', 'PV7', 15000.00, 4) RETURNING id;
    `, [propA_id]);
    const roomType_id = rtRes.rows[0].id;

    const rARes = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '701', 'AVAILABLE', 'CLEAN', 4) RETURNING id;
    `, [propA_id, roomType_id]);
    roomA_id = rARes.rows[0].id;

    const rBRes = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '702', 'AVAILABLE', 'CLEAN', 4) RETURNING id;
    `, [propA_id, roomType_id]);
    roomB_id = rBRes.rows[0].id;

    // 3. Guests
    const gARes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ($1, 'Sophia', 'Vanderbilt', 'sophia.v@guest.test', '+1 555 777 0001') RETURNING id;
    `, [propA_id]);
    guestA_id = gARes.rows[0].id;

    const gBRes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ($1, 'Alexander', 'Sterling', 'alex.s@guest.test', '+1 555 777 0002') RETURNING id;
    `, [propA_id]);
    guestB_id = gBRes.rows[0].id;

    // 3b. Reservations
    const resARes = await client.query(`
      INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
      VALUES ($1, $2, 'CONF-701-A-' || gen_random_uuid(), 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 2, 0) RETURNING id;
    `, [propA_id, guestA_id]);
    const reservationA_id = resARes.rows[0].id;

    const resBRes = await client.query(`
      INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
      VALUES ($1, $2, 'CONF-702-B-' || gen_random_uuid(), 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 1, 0) RETURNING id;
    `, [propA_id, guestB_id]);
    const reservationB_id = resBRes.rows[0].id;

    // 4. Stays (Checked in)
    const stARes = await client.query(`
      INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
      VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 2, 0) RETURNING id;
    `, [propA_id, reservationA_id, guestA_id, roomA_id]);
    stayA_id = stARes.rows[0].id;

    const stBRes = await client.query(`
      INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
      VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 1, 0) RETURNING id;
    `, [propA_id, reservationB_id, guestB_id, roomB_id]);
    stayB_id = stBRes.rows[0].id;

    // 5. Restaurants
    const restARes = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, is_active, currency)
      VALUES ($1, 'The Palm Court & Grill', 'REST-P7A', true, 'INR') RETURNING id;
    `, [propA_id]);
    restA_id = restARes.rows[0].id;

    const restBRes = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, is_active, currency)
      VALUES ($1, 'Boutique Terrace Bar', 'REST-P7B', true, 'INR') RETURNING id;
    `, [propB_id]);
    restB_id = restBRes.rows[0].id;

    // 6. Table in Restaurant A
    const tblRes = await client.query(`
      INSERT INTO public.restaurant_tables (restaurant_id, table_number, capacity, is_active, status)
      VALUES ($1, 'T-12', 4, true, 'AVAILABLE') RETURNING id;
    `, [restA_id]);
    tableA_id = tblRes.rows[0].id;

    // 7. Kitchen Stations
    const stHotRes = await client.query(`
      INSERT INTO public.kitchen_stations (restaurant_id, name, code, is_active)
      VALUES ($1, 'Hot Grill & Saute', 'HOT_GRILL', true) RETURNING id;
    `, [restA_id]);
    stationHot_id = stHotRes.rows[0].id;

    const stColdRes = await client.query(`
      INSERT INTO public.kitchen_stations (restaurant_id, name, code, is_active)
      VALUES ($1, 'Pantry & Desserts', 'PANTRY', true) RETURNING id;
    `, [restA_id]);
    stationCold_id = stColdRes.rows[0].id;

    // 8. Menu Categories & Items
    const catRes = await client.query(`
      INSERT INTO public.menu_categories (restaurant_id, name, is_active, display_order)
      VALUES ($1, 'Signature Entrees', true, 1) RETURNING id;
    `, [restA_id]);
    catA_id = catRes.rows[0].id;

    const item1Res = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, currency, is_available, is_active)
      VALUES ($1, $2, 'Pan-Seared Sea Bass', 'Citrus emulsion and truffle glaze', 850.00, 'INR', true, true)
      RETURNING id;
    `, [restA_id, catA_id]);
    itemA1_id = item1Res.rows[0].id;

    // Route item 1 to Hot Grill
    await client.query(`
      INSERT INTO public.menu_item_kitchen_stations (menu_item_id, kitchen_station_id, is_primary)
      VALUES ($1, $2, true);
    `, [itemA1_id, stationHot_id]);

    const item2Res = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, description, price, currency, is_available, is_active)
      VALUES ($1, $2, 'Wagyu Beef Medallions', 'Rosemary roasted with garlic mash', 1400.00, 'INR', true, true)
      RETURNING id;
    `, [restA_id, catA_id]);
    itemA2_id = item2Res.rows[0].id;

    // 9. Verified Guest Sessions
    rawTokenA = generateSecureToken(32);
    hashTokenA = hashToken(rawTokenA);
    await client.query(`
      INSERT INTO public.guest_sessions (property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at)
      VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '8 hours');
    `, [propA_id, roomA_id, guestA_id, stayA_id, hashTokenA]);

    rawTokenB = generateSecureToken(32);
    hashTokenB = hashToken(rawTokenB);
    await client.query(`
      INSERT INTO public.guest_sessions (property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at)
      VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '8 hours');
    `, [propA_id, roomB_id, guestB_id, stayB_id, hashTokenB]);

    console.log('[SETUP] Phase 7 environment ready.\n');

    // ============================================================
    // TEST 1: Menu -> Customer Availability
    // ============================================================
    console.log('[TEST 1] Menu items available and visible to verified guest');
    const menuQuery = await client.query(`
      SELECT id, name, price, is_available
      FROM public.menu_items
      WHERE restaurant_id = $1 AND is_active = true;
    `, [restA_id]);
    assert(menuQuery.rows.length === 2, 'Customer sees all 2 active menu items');
    assert(menuQuery.rows.every(r => r.is_available === true), 'All items are currently available');

    // ============================================================
    // TEST 2: Sold-Out Protection
    // ============================================================
    console.log('\n[TEST 2] Sold-out protection prevents ordering unavailable dishes');
    // Mark Item 2 as SOLD OUT
    await client.query(`UPDATE public.menu_items SET is_available = false WHERE id = $1;`, [itemA2_id]);

    const soldOutOrder = await client.query(`
      SELECT public.create_guest_food_order($1, $2, $3, 'Deliver hot') as res;
    `, [
      hashTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA2_id, quantity: 1 }])
    ]);
    assert(soldOutOrder.rows[0].res.success === false, 'Rejects order for sold-out item');
    assert(soldOutOrder.rows[0].res.error.includes('out of stock'), 'Returns clear out of stock message');

    // Restore Item 2 availability
    await client.query(`UPDATE public.menu_items SET is_available = true WHERE id = $1;`, [itemA2_id]);

    // ============================================================
    // TEST 3: Authoritative Price Recalculation
    // ============================================================
    console.log('\n[TEST 3] Server computes authoritative price (ignores client tampering)');
    // Sea Bass ($850) x 2 = $1700 + 5% tax ($85) = $1785.00
    const testIdempKey = 'idemp-test-order-001-' + Date.now();
    const orderRes = await client.query(`
      SELECT public.create_guest_food_order($1, $2, $3, 'Extra lemon', $4) as res;
    `, [
      hashTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 2 }]),
      testIdempKey
    ]);

    const createdOrder = orderRes.rows[0].res;
    assert(createdOrder.success === true, 'Order created successfully');
    assert(Number(createdOrder.subtotal) === 1700.00, 'Authoritative subtotal is 1700.00');
    assert(Number(createdOrder.tax_amount) === 85.00, 'Authoritative tax is 85.00 (5%)');
    assert(Number(createdOrder.total_amount) === 1785.00, 'Authoritative total is 1785.00');
    const orderA_id = createdOrder.order_id;

    // ============================================================
    // TEST 4: Duplicate Order Protection (Idempotency)
    // ============================================================
    console.log('\n[TEST 4] Duplicate submission with same idempotency key returns existing order');
    const duplicateRes = await client.query(`
      SELECT public.create_guest_food_order($1, $2, $3, 'Extra lemon', $4) as res;
    `, [
      hashTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 2 }]),
      testIdempKey
    ]);

    const dupOrder = duplicateRes.rows[0].res;
    assert(dupOrder.success === true, 'Duplicate call succeeds idempotently');
    assert(dupOrder.is_duplicate === true, 'Flags response as duplicate');
    assert(dupOrder.order_id === orderA_id, 'Returns exact same order ID');

    // Verify in DB that only 1 order exists
    const countCheck = await client.query(`
      SELECT count(*) as count FROM public.restaurant_orders WHERE idempotency_key = $1;
    `, [testIdempKey]);
    assert(parseInt(countCheck.rows[0].count) === 1, 'Exactly one order record exists in database');

    // ============================================================
    // TEST 5: Automatic KDS Ticket Creation
    // ============================================================
    console.log('\n[TEST 5] Order automatically fires KDS ticket with QUEUED status');
    const ticketQuery = await client.query(`
      SELECT id, ticket_number, status, priority
      FROM public.kitchen_tickets
      WHERE restaurant_order_id = $1;
    `, [orderA_id]);

    assert(ticketQuery.rows.length === 1, 'KDS ticket exists for the restaurant order');
    assert(ticketQuery.rows[0].status === 'QUEUED', 'Initial ticket status is QUEUED');
    const ticketA_id = ticketQuery.rows[0].id;

    // ============================================================
    // TEST 6: Kitchen Station Routing
    // ============================================================
    console.log('\n[TEST 6] Ticket items routed to configured kitchen station');
    const ticketItemsQuery = await client.query(`
      SELECT id, item_name, quantity, station_id, status
      FROM public.kitchen_ticket_items
      WHERE kitchen_ticket_id = $1;
    `, [ticketA_id]);

    assert(ticketItemsQuery.rows.length === 1, 'Ticket item exists');
    assert(ticketItemsQuery.rows[0].item_name === 'Pan-Seared Sea Bass', 'Item name preserved');
    assert(ticketItemsQuery.rows[0].quantity === 2, 'Quantity matches order');
    assert(ticketItemsQuery.rows[0].station_id === stationHot_id, 'Item correctly routed to Hot Grill & Saute');
    const ticketItemA_id = ticketItemsQuery.rows[0].id;

    // ============================================================
    // TEST 7: KDS Status Sync -> PREPARING
    // ============================================================
    console.log('\n[TEST 7] KDS starts item: Ticket -> IN_PROGRESS, Order -> PREPARING');
    // Chef taps "Start Item"
    await client.query(`
      SELECT public.start_kitchen_ticket_item($1, $2);
    `, [ticketItemA_id, propA_id]);

    const orderPrepQuery = await client.query(`
      SELECT status FROM public.restaurant_orders WHERE id = $1;
    `, [orderA_id]);
    const ticketPrepQuery = await client.query(`
      SELECT status FROM public.kitchen_tickets WHERE id = $1;
    `, [ticketA_id]);

    assert(ticketPrepQuery.rows[0].status === 'IN_PROGRESS', 'KDS ticket updated to IN_PROGRESS');
    assert(orderPrepQuery.rows[0].status === 'PREPARING', 'Restaurant order automatically synchronized to PREPARING');

    // ============================================================
    // TEST 8: KDS Status Sync -> READY
    // ============================================================
    console.log('\n[TEST 8] KDS readies item: Ticket -> READY, Order -> READY');
    // Chef taps "Ready"
    await client.query(`
      SELECT public.ready_kitchen_ticket_item($1, $2);
    `, [ticketItemA_id, propA_id]);

    const orderReadyQuery = await client.query(`
      SELECT status FROM public.restaurant_orders WHERE id = $1;
    `, [orderA_id]);
    const ticketReadyQuery = await client.query(`
      SELECT status FROM public.kitchen_tickets WHERE id = $1;
    `, [ticketA_id]);

    assert(ticketReadyQuery.rows[0].status === 'READY', 'KDS ticket updated to READY');
    assert(orderReadyQuery.rows[0].status === 'READY', 'Restaurant order automatically synchronized to READY');

    // ============================================================
    // TEST 9: KDS Status Sync -> COMPLETED / DELIVERED
    // ============================================================
    console.log('\n[TEST 9] KDS completes item: Ticket -> COMPLETED, Order -> COMPLETED');
    // Chef taps "Complete / Served"
    await client.query(`
      SELECT public.complete_kitchen_ticket_item($1, $2);
    `, [ticketItemA_id, propA_id]);

    const orderDoneQuery = await client.query(`
      SELECT status, completed_at FROM public.restaurant_orders WHERE id = $1;
    `, [orderA_id]);
    const ticketDoneQuery = await client.query(`
      SELECT status, completed_at FROM public.kitchen_tickets WHERE id = $1;
    `, [ticketA_id]);

    assert(ticketDoneQuery.rows[0].status === 'COMPLETED', 'KDS ticket updated to COMPLETED');
    assert(orderDoneQuery.rows[0].status === 'COMPLETED', 'Restaurant order automatically synchronized to COMPLETED');
    assert(orderDoneQuery.rows[0].completed_at !== null, 'Order completed_at timestamp recorded');

    // ============================================================
    // TEST 10: Cross-Guest Isolation
    // ============================================================
    console.log('\n[TEST 10] Cross-guest isolation: Guest B cannot access Guest A order');
    const guestBDetailQuery = await client.query(`
      SELECT public.get_guest_food_order_detail($1, $2) as res;
    `, [hashTokenB, orderA_id]);
    assert(guestBDetailQuery.rows[0].res.success === false, 'Guest B access denied for Guest A order');

    const guestADetailQuery = await client.query(`
      SELECT public.get_guest_food_order_detail($1, $2) as res;
    `, [hashTokenA, orderA_id]);
    assert(guestADetailQuery.rows[0].res.success === true, 'Guest A successfully accesses own order detail');
    assert(guestADetailQuery.rows[0].res.order.id === orderA_id, 'Order ID matches');

    // ============================================================
    // TEST 11: Cross-Property Isolation
    // ============================================================
    console.log('\n[TEST 11] Cross-property isolation: Guest A cannot order from Property B restaurant');
    const crossPropOrder = await client.query(`
      SELECT public.create_guest_food_order($1, $2, $3) as res;
    `, [
      hashTokenA,
      restB_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 1 }])
    ]);
    assert(crossPropOrder.rows[0].res.success === false, 'Rejects cross-property restaurant order');

    // ============================================================
    // TEST 12: Room Service Destination Association
    // ============================================================
    console.log('\n[TEST 12] Room Service delivery destination automatically set to guest room');
    const roomCheck = await client.query(`
      SELECT room_id, table_id, order_type FROM public.restaurant_orders WHERE id = $1;
    `, [orderA_id]);
    assert(roomCheck.rows[0].room_id === roomA_id, 'Delivery room locked to guest verified room');
    assert(roomCheck.rows[0].table_id === null, 'Room service has null table_id');
    assert(roomCheck.rows[0].order_type === 'ROOM_SERVICE', 'Order type is ROOM_SERVICE');

    // ============================================================
    // TEST 13: Dine-In Table Ordering
    // ============================================================
    console.log('\n[TEST 13] Dine-In table ordering sets table_id and TBL- prefix');
    const tblIdempKey = 'idemp-table-order-001-' + Date.now();
    const tableOrderRes = await client.query(`
      SELECT public.create_guest_food_order($1, $2, $3, 'Table order', $4, 'DINE_IN', $5) as res;
    `, [
      hashTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 1 }]),
      tblIdempKey,
      tableA_id
    ]);

    const tblOrder = tableOrderRes.rows[0].res;
    assert(tblOrder.success === true, 'Dine-In table order created');
    assert(tblOrder.order_number.startsWith('TBL-'), 'Table order has TBL- prefix');

    const tblDbCheck = await client.query(`
      SELECT room_id, table_id, order_type FROM public.restaurant_orders WHERE id = $1;
    `, [tblOrder.order_id]);
    assert(tblDbCheck.rows[0].table_id === tableA_id, 'Order linked to Table T-12');
    assert(tblDbCheck.rows[0].room_id === null, 'Table order room_id is null');
    assert(tblDbCheck.rows[0].order_type === 'DINE_IN', 'Order type is DINE_IN');

    // ============================================================
    // TEST 14: Invalid Table Rejection
    // ============================================================
    console.log('\n[TEST 14] Invalid table rejected');
    const fakeTableId = '99999999-0000-0000-0000-000000000099';
    const badTblRes = await client.query(`
      SELECT public.create_guest_food_order($1, $2, $3, 'Table order', null, 'DINE_IN', $4) as res;
    `, [
      hashTokenA,
      restA_id,
      JSON.stringify([{ menu_item_id: itemA1_id, quantity: 1 }]),
      fakeTableId
    ]);
    assert(badTblRes.rows[0].res.success === false, 'Rejects non-existent table');

    // ============================================================
    // TEST 15: Cancellation Synchronization
    // ============================================================
    console.log('\n[TEST 15] Order cancellation synchronizes KDS ticket to CANCELLED');
    const cancelOrderRes = await client.query(`
      SELECT public.cancel_restaurant_order($1, $2, 'Guest changed mind') as res;
    `, [tblOrder.order_id, propA_id]);
    assert(cancelOrderRes.rows[0].res.success === true, 'Restaurant order cancelled');

    const cancelTicketCheck = await client.query(`
      SELECT status FROM public.kitchen_tickets WHERE restaurant_order_id = $1;
    `, [tblOrder.order_id]);
    assert(cancelTicketCheck.rows[0].status === 'CANCELLED', 'Kitchen ticket synchronized to CANCELLED');

    // ============================================================
    // CLEANUP
    // ============================================================
    console.log('\n[CLEANUP] Cleaning up Phase 7 test artifacts...');
    await client.query(`DELETE FROM public.properties WHERE id IN ($1, $2);`, [propA_id, propB_id]);
    await client.query(`DELETE FROM public.organizations WHERE id = $1;`, [orgA_id]);
    console.log('✓ Cleanup completed.');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`PHASE 7 E2E SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7E2ETestSuite();
