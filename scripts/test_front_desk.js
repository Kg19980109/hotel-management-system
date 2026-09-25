const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testFrontDeskSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 8: FRONT DESK & STAY LIFECYCLE TEST SUITE');
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
  const userC_id = 'c3333333-0000-0000-0000-000000000003'; // Receptionist at Property A
  const userD_id = 'd4444444-0000-0000-0000-000000000004'; // Unaffiliated user
  const userE_id = 'e5555555-0000-0000-0000-000000000005'; // Kitchen Staff at Property A

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let typeA_id, typeB_id;
  let roomA1_id, roomA2_id, roomA3_id, roomB1_id;
  let guestA1_id, guestA2_id, guestB1_id;
  let resA1_id, resA1_room_id;
  let resA2_id, resA2_room1_id, resA2_room2_id;
  let resA3_id, resA3_room_id; // Early check-in test
  let resA4_id, resA4_room_id; // Cancelled reservation test
  let resA5_id, resA5_room_id; // No-show test
  let stay1_id;

  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfterTomorrowStr = new Date(Date.now() + 172800000).toISOString().split('T')[0];
  const threeDaysLaterStr = new Date(Date.now() + 259200000).toISOString().split('T')[0];

  try {
    // 0. Setup mock auth users
    console.log('\n[SETUP] Creating test users & roles...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'owner-a@stayhub.test', '{"full_name": "Owner A"}', now(), now()),
        ('${userB_id}', 'owner-b@stayhub.test', '{"full_name": "Owner B"}', now(), now()),
        ('${userC_id}', 'recep-a@stayhub.test', '{"full_name": "Recep A"}', now(), now()),
        ('${userD_id}', 'unaffil@stayhub.test', '{"full_name": "Unaffiliated User"}', now(), now()),
        ('${userE_id}', 'kitchen-a@stayhub.test', '{"full_name": "Kitchen Staff"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Setup organizations & properties
    console.log('[SETUP] Creating organizations, properties, room types, and rooms...');
    const orgARes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('FrontDesk Test Org A', 'fd-org-a', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('FrontDesk Test Org B', 'fd-org-b', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgA_id}', 'Grand Horizon Front Desk', 'horizon-fd', '10 Marine Drive', 'Mumbai', 'Maharashtra', '400020', 'INR', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgB_id}', 'Beta Valley Retreat', 'beta-valley-fd', '40 Pine Crest', 'Shimla', 'HP', '171001', 'INR', '${userB_id}')
      RETURNING id;
    `);
    propB_id = propBRes.rows[0].id;

    // Get roles
    const ownerRoleId = (await client.query(`SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER' LIMIT 1;`)).rows[0].id;
    const recepRoleId = (await client.query(`SELECT id FROM public.roles WHERE code = 'RECEPTIONIST' LIMIT 1;`)).rows[0].id;
    const kitchenRoleId = (await client.query(`SELECT id FROM public.roles WHERE code = 'KITCHEN_STAFF' LIMIT 1;`)).rows[0].id;

    // Assign memberships
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES
        ('${propA_id}', '${userA_id}', '${ownerRoleId}', 'active'),
        ('${propB_id}', '${userB_id}', '${ownerRoleId}', 'active'),
        ('${propA_id}', '${userC_id}', '${recepRoleId}', 'active'),
        ('${propA_id}', '${userE_id}', '${kitchenRoleId}', 'active');
    `);

    // Create room types
    const typeARes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, max_occupancy, base_rate, currency)
      VALUES ('${propA_id}', 'Executive King', 'EXK', 2, 7500.00, 'INR')
      RETURNING id;
    `);
    typeA_id = typeARes.rows[0].id;

    const typeBRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, max_occupancy, base_rate, currency)
      VALUES ('${propB_id}', 'Mountain Chalet', 'MCH', 4, 9000.00, 'INR')
      RETURNING id;
    `);
    typeB_id = typeBRes.rows[0].id;

    // Create physical rooms at Property A (3 sellable rooms)
    const roomA1Res = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, is_active)
      VALUES ('${propA_id}', '${typeA_id}', '101', 'AVAILABLE', true)
      RETURNING id;
    `);
    roomA1_id = roomA1Res.rows[0].id;

    const roomA2Res = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, is_active)
      VALUES ('${propA_id}', '${typeA_id}', '102', 'AVAILABLE', true)
      RETURNING id;
    `);
    roomA2_id = roomA2Res.rows[0].id;

    const roomA3Res = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, is_active)
      VALUES ('${propA_id}', '${typeA_id}', '103', 'AVAILABLE', true)
      RETURNING id;
    `);
    roomA3_id = roomA3Res.rows[0].id;

    const roomA4Res = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, is_active)
      VALUES ('${propA_id}', '${typeA_id}', '104', 'AVAILABLE', true)
      RETURNING id;
    `);
    roomA4_id = roomA4Res.rows[0].id;

    // Create physical room at Property B
    const roomB1Res = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, is_active)
      VALUES ('${propB_id}', '${typeB_id}', 'B201', 'AVAILABLE', true)
      RETURNING id;
    `);
    roomB1_id = roomB1Res.rows[0].id;

    // Create guests
    const guestA1Res = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propA_id}', 'Aarav', 'Sharma', 'aarav.sharma@example.com', '+919876543210')
      RETURNING id;
    `);
    guestA1_id = guestA1Res.rows[0].id;

    const guestA2Res = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propA_id}', 'Pooja', 'Verma', 'pooja.verma@example.com', '+919876543211')
      RETURNING id;
    `);
    guestA2_id = guestA2Res.rows[0].id;

    const guestB1Res = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propB_id}', 'Rohan', 'Mehta', 'rohan.mehta@example.com', '+919876543212')
      RETURNING id;
    `);
    guestB1_id = guestB1Res.rows[0].id;

    // Create standard single-room reservation for Today
    const resA1Res = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, primary_guest_id, status, booking_source,
        check_in_date, check_out_date, adults, children, total_amount, currency, created_by
      )
      VALUES (
        '${propA_id}', 'FD-26-000001', '${guestA1_id}', 'CONFIRMED', 'DIRECT',
        '${todayStr}', '${tomorrowStr}', 2, 0, 7500.00, 'INR', '${userA_id}'
      )
      RETURNING id;
    `);
    resA1_id = resA1Res.rows[0].id;

    const resA1RoomRes = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA1_id}', '${propA_id}', '${typeA_id}', '${roomA1_id}',
        '${todayStr}', '${tomorrowStr}', 2, 0, 7500.00, 7500.00, 'INR'
      )
      RETURNING id;
    `);
    resA1_room_id = resA1RoomRes.rows[0].id;

    // Create multi-room reservation (2 rooms) for Today
    const resA2Res = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, primary_guest_id, status, booking_source,
        check_in_date, check_out_date, adults, children, total_amount, currency, created_by
      )
      VALUES (
        '${propA_id}', 'FD-26-000002', '${guestA2_id}', 'CONFIRMED', 'WEBSITE',
        '${todayStr}', '${dayAfterTomorrowStr}', 4, 0, 30000.00, 'INR', '${userA_id}'
      )
      RETURNING id;
    `);
    resA2_id = resA2Res.rows[0].id;

    const resA2Room1Res = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA2_id}', '${propA_id}', '${typeA_id}', '${roomA2_id}',
        '${todayStr}', '${dayAfterTomorrowStr}', 2, 0, 7500.00, 15000.00, 'INR'
      )
      RETURNING id;
    `);
    resA2_room1_id = resA2Room1Res.rows[0].id;

    const resA2Room2Res = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA2_id}', '${propA_id}', '${typeA_id}', '${roomA3_id}',
        '${todayStr}', '${dayAfterTomorrowStr}', 2, 0, 7500.00, 15000.00, 'INR'
      )
      RETURNING id;
    `);
    resA2_room2_id = resA2Room2Res.rows[0].id;

    // Create future reservation for Tomorrow (for Early Check-in test)
    const resA3Res = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, primary_guest_id, status, booking_source,
        check_in_date, check_out_date, adults, children, total_amount, currency, created_by
      )
      VALUES (
        '${propA_id}', 'FD-26-000003', '${guestA1_id}', 'CONFIRMED', 'DIRECT',
        '${tomorrowStr}', '${threeDaysLaterStr}', 1, 0, 15000.00, 'INR', '${userA_id}'
      )
      RETURNING id;
    `);
    resA3_id = resA3Res.rows[0].id;

    const resA3RoomRes = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA3_id}', '${propA_id}', '${typeA_id}', NULL,
        '${tomorrowStr}', '${threeDaysLaterStr}', 1, 0, 7500.00, 15000.00, 'INR'
      )
      RETURNING id;
    `);
    resA3_room_id = resA3RoomRes.rows[0].id;

    // Create cancelled reservation
    const resA4Res = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, primary_guest_id, status, booking_source,
        check_in_date, check_out_date, adults, children, total_amount, currency, created_by
      )
      VALUES (
        '${propA_id}', 'FD-26-000004', '${guestA1_id}', 'CANCELLED', 'DIRECT',
        '${todayStr}', '${tomorrowStr}', 1, 0, 7500.00, 'INR', '${userA_id}'
      )
      RETURNING id;
    `);
    resA4_id = resA4Res.rows[0].id;

    const resA4RoomRes = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id, is_cancelled,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA4_id}', '${propA_id}', '${typeA_id}', NULL, true,
        '${todayStr}', '${tomorrowStr}', 1, 0, 7500.00, 7500.00, 'INR'
      )
      RETURNING id;
    `);
    resA4_room_id = resA4RoomRes.rows[0].id;

    // Create reservation for No-Show test
    const resA5Res = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, primary_guest_id, status, booking_source,
        check_in_date, check_out_date, adults, children, total_amount, currency, created_by
      )
      VALUES (
        '${propA_id}', 'FD-26-000005', '${guestA2_id}', 'CONFIRMED', 'DIRECT',
        '${todayStr}', '${tomorrowStr}', 1, 0, 7500.00, 'INR', '${userA_id}'
      )
      RETURNING id;
    `);
    resA5_id = resA5Res.rows[0].id;

    const resA5RoomRes = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA5_id}', '${propA_id}', '${typeA_id}', NULL,
        '${todayStr}', '${tomorrowStr}', 1, 0, 7500.00, 7500.00, 'INR'
      )
      RETURNING id;
    `);
    resA5_room_id = resA5RoomRes.rows[0].id;

    console.log('\n[TEST SUITE EXECUTION STARTING]');

    // -------------------------------------------------------------
    // Test 1: User A can view Property A front desk data
    // -------------------------------------------------------------
    const userAArrivals = await queryAsUser(userA_id, `
      SELECT rr.id, r.confirmation_number 
      FROM public.reservation_rooms rr
      JOIN public.reservations r ON r.id = rr.reservation_id
      WHERE rr.property_id = '${propA_id}' AND rr.check_in_date = '${todayStr}' AND rr.is_cancelled = false;
    `);
    assert(userAArrivals.length >= 2,
      'Test 1: User A can view Property A front desk arrivals data');

    // -------------------------------------------------------------
    // Test 2: User B cannot see Property A stays / arrivals (RLS isolation)
    // -------------------------------------------------------------
    const userBStaysOnA = await queryAsUser(userB_id, `
      SELECT * FROM public.stays WHERE property_id = '${propA_id}';
    `);
    assert(userBStaysOnA.length === 0,
      'Test 2: User B cannot see Property A stays (RLS isolation)');

    // -------------------------------------------------------------
    // Test 3: Unaffiliated user sees zero stays
    // -------------------------------------------------------------
    const unaffilStays = await queryAsUser(userD_id, `
      SELECT * FROM public.stays;
    `);
    assert(unaffilStays.length === 0,
      'Test 3: Unaffiliated user sees zero stays across all properties');

    // -------------------------------------------------------------
    // Test 4: Authorized receptionist can check in
    // -------------------------------------------------------------
    let checkIn1Success = false;
    try {
      const checkIn1Res = await queryAsUser(userC_id, `
        SELECT (public.check_in_reservation_room(
          '${resA1_room_id}',
          '${roomA1_id}',
          '${propA_id}',
          2,
          0,
          'Test check-in by receptionist',
          false
        ))->>'id' AS stay_id;
      `);
      stay1_id = checkIn1Res[0].stay_id;
      checkIn1Success = Boolean(stay1_id);
    } catch (err) {
      console.error('Check-in 1 error:', err);
    }
    assert(checkIn1Success,
      'Test 4: Authorized receptionist (User C) can execute atomic check-in');

    // -------------------------------------------------------------
    // Test 5: Unauthorized kitchen staff cannot check in
    // -------------------------------------------------------------
    let kitchenCheckInBlocked = false;
    try {
      await queryAsUser(userE_id, `
        SELECT public.check_in_reservation_room(
          '${resA2_room1_id}',
          '${roomA2_id}',
          '${propA_id}',
          2,
          0,
          'Kitchen staff trying check-in',
          false
        );
      `);
    } catch (err) {
      kitchenCheckInBlocked = err.message.includes('permission') || err.message.includes('Unauthorized') || err.message.includes('Access denied');
    }
    assert(kitchenCheckInBlocked,
      'Test 5: Unauthorized kitchen staff cannot check in (role authorization enforced)');

    // -------------------------------------------------------------
    // Test 6: Check-in creates exactly one active stay
    // -------------------------------------------------------------
    const stay1Rows = await queryAsUser(userA_id, `
      SELECT * FROM public.stays WHERE id = '${stay1_id}';
    `);
    assert(
      stay1Rows.length === 1 &&
      stay1Rows[0].status === 'CHECKED_IN' &&
      stay1Rows[0].actual_check_in_at !== null,
      'Test 6: Check-in creates exactly one active stay record with status CHECKED_IN and timestamp'
    );

    // -------------------------------------------------------------
    // Test 7: Check-in changes room to OCCUPIED
    // -------------------------------------------------------------
    const roomA1Row = (await client.query(`SELECT status FROM public.rooms WHERE id = '${roomA1_id}';`)).rows[0];
    assert(roomA1Row.status === 'OCCUPIED',
      'Test 7: Check-in atomically updates physical room status to OCCUPIED');

    // -------------------------------------------------------------
    // Test 8: Duplicate check-in on same reservation room is rejected
    // -------------------------------------------------------------
    let dupCheckInRejected = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.check_in_reservation_room(
          '${resA1_room_id}',
          '${roomA1_id}',
          '${propA_id}',
          2,
          0,
          'Duplicate check-in attempt',
          false
        );
      `);
    } catch (err) {
      dupCheckInRejected = true;
    }
    assert(dupCheckInRejected,
      'Test 8: Duplicate check-in on the same reservation room item is rejected');

    // -------------------------------------------------------------
    // Test 9: Another stay cannot occupy the same room
    // -------------------------------------------------------------
    let sameRoomOccupiedRejected = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.check_in_reservation_room(
          '${resA2_room1_id}',
          '${roomA1_id}', -- Already occupied by stay 1!
          '${propA_id}',
          2,
          0,
          'Trying to check into already occupied room',
          false
        );
      `);
    } catch (err) {
      sameRoomOccupiedRejected = true;
    }
    assert(sameRoomOccupiedRejected,
      'Test 9: Another stay cannot occupy the same room (one active stay per room invariant)');

    // -------------------------------------------------------------
    // Test 10: Cross-property room assignment is rejected
    // -------------------------------------------------------------
    let crossRoomRejected = false;
    try {
      await client.query(`
        INSERT INTO public.stays (
          property_id, reservation_id, reservation_room_id, guest_id, room_id, status, expected_check_out_date
        ) VALUES (
          '${propA_id}', '${resA1_id}', '${resA1_room_id}', '${guestA1_id}', '${roomB1_id}', 'EXPECTED', '${tomorrowStr}'
        );
      `);
    } catch (err) {
      crossRoomRejected = err.message.includes('Cross-tenant violation') || err.message.includes('room_id does not belong');
    }
    assert(crossRoomRejected,
      'Test 10: Cross-property room assignment is rejected by database consistency trigger');

    // -------------------------------------------------------------
    // Test 11: Cross-property reservation assignment is rejected
    // -------------------------------------------------------------
    let crossResRejected = false;
    try {
      await client.query(`
        INSERT INTO public.stays (
          property_id, reservation_id, reservation_room_id, guest_id, room_id, status, expected_check_out_date
        ) VALUES (
          '${propB_id}', '${resA1_id}', '${resA1_room_id}', '${guestB1_id}', '${roomB1_id}', 'EXPECTED', '${tomorrowStr}'
        );
      `);
    } catch (err) {
      crossResRejected = err.message.includes('Cross-tenant violation') || err.message.includes('reservation_id');
    }
    assert(crossResRejected,
      'Test 11: Cross-property reservation assignment is rejected by database consistency trigger');

    // -------------------------------------------------------------
    // Test 12: Early check-in works with explicit authorization
    // -------------------------------------------------------------
    // First, verify early check-in fails WITHOUT override flag
    let earlyWithoutFlagFailed = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.check_in_reservation_room(
          '${resA3_room_id}',
          '${roomA4_id}',
          '${propA_id}',
          1,
          0,
          'Early arrival attempt without override',
          false
        );
      `);
    } catch (err) {
      earlyWithoutFlagFailed = err.message.includes('Early check-in not authorized') || err.message.includes('requires explicit authorization');
    }

    // Now, execute with explicit authorization flag
    let earlyWithFlagSuccess = false;
    let stayEarly_id;
    try {
      const earlyRes = await queryAsUser(userC_id, `
        SELECT (public.check_in_reservation_room(
          '${resA3_room_id}',
          '${roomA4_id}',
          '${propA_id}',
          1,
          0,
          'Early arrival authorized by front desk manager',
          true
        ))->>'id' AS stay_id;
      `);
      stayEarly_id = earlyRes[0].stay_id;
      earlyWithFlagSuccess = Boolean(stayEarly_id);
    } catch (err) {
      console.error('Early check-in with flag error:', err);
    }
    assert(earlyWithoutFlagFailed && earlyWithFlagSuccess,
      'Test 12: Early check-in requires explicit authorization flag and succeeds when granted');

    // -------------------------------------------------------------
    // Test 13: Checkout creates actual_check_out_at
    // -------------------------------------------------------------
    let checkOutSuccess = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.check_out_stay(
          '${stay1_id}',
          '${propA_id}'
        );
      `);
      checkOutSuccess = true;
    } catch (err) {
      console.error('Checkout error:', err);
    }

    const stay1AfterCheckout = (await client.query(`
      SELECT * FROM public.stays WHERE id = '${stay1_id}';
    `)).rows[0];
    assert(
      checkOutSuccess && stay1AfterCheckout.actual_check_out_at !== null,
      'Test 13: Checkout creates actual_check_out_at timestamp'
    );

    // -------------------------------------------------------------
    // Test 14: Checkout changes stay to CHECKED_OUT
    // -------------------------------------------------------------
    assert(stay1AfterCheckout.status === 'CHECKED_OUT',
      'Test 14: Checkout transitions stay status to CHECKED_OUT');

    // -------------------------------------------------------------
    // Test 15: Checkout changes room to DIRTY
    // -------------------------------------------------------------
    const roomA1AfterCheckout = (await client.query(`
      SELECT status FROM public.rooms WHERE id = '${roomA1_id}';
    `)).rows[0];
    assert(roomA1AfterCheckout.status === 'DIRTY',
      'Test 15: Checkout transitions room status to DIRTY (never directly AVAILABLE)');

    // -------------------------------------------------------------
    // Test 16: Duplicate checkout is rejected
    // -------------------------------------------------------------
    let dupCheckoutRejected = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.check_out_stay(
          '${stay1_id}',
          '${propA_id}'
        );
      `);
    } catch (err) {
      dupCheckoutRejected = true;
    }
    assert(dupCheckoutRejected,
      'Test 16: Duplicate checkout on already checked-out stay is rejected');

    // -------------------------------------------------------------
    // Test 17: No-show works
    // -------------------------------------------------------------
    let noShowSuccess = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.mark_reservation_no_show(
          '${resA5_id}',
          '${propA_id}',
          'Guest failed to arrive by midnight cutoff'
        );
      `);
      noShowSuccess = true;
    } catch (err) {
      console.error('No-show error:', err);
    }

    const resA5Row = (await client.query(`SELECT status FROM public.reservations WHERE id = '${resA5_id}';`)).rows[0];
    const resA5RoomRow = (await client.query(`SELECT is_cancelled FROM public.reservation_rooms WHERE id = '${resA5_room_id}';`)).rows[0];
    assert(
      noShowSuccess && resA5Row.status === 'NO_SHOW' && resA5RoomRow.is_cancelled === true,
      'Test 17: No-show transitions reservation to NO_SHOW and cancels reservation room releasing inventory'
    );

    // -------------------------------------------------------------
    // Test 18: Cancelled reservation cannot be checked in
    // -------------------------------------------------------------
    let cancelledCheckInRejected = false;
    try {
      await queryAsUser(userC_id, `
        SELECT public.check_in_reservation_room(
          '${resA4_room_id}',
          '${roomA1_id}',
          '${propA_id}',
          1,
          0,
          'Trying to check in cancelled reservation',
          false
        );
      `);
    } catch (err) {
      cancelledCheckInRejected = err.message.toLowerCase().includes('cancelled') || err.message.includes('CONFIRMED');
    }
    assert(cancelledCheckInRejected,
      'Test 18: Cancelled reservation cannot be checked in');

    // -------------------------------------------------------------
    // Test 19: Dashboard in-house count reflects active stays
    // -------------------------------------------------------------
    // Currently, stayEarly (Room A4) is in-house (CHECKED_IN). Stay 1 was checked out.
    const inHouseCountRes = await queryAsUser(userA_id, `
      SELECT COUNT(*)::int AS count 
      FROM public.stays 
      WHERE property_id = '${propA_id}' AND status = 'CHECKED_IN';
    `);
    const inHouseCount = inHouseCountRes[0].count;
    assert(inHouseCount === 1,
      `Test 19: Dashboard in-house count reflects active stays (expected 1, got ${inHouseCount})`);

    // -------------------------------------------------------------
    // Test 20: Dashboard occupied rooms reflect active stays
    // -------------------------------------------------------------
    const occupiedRoomsRes = await queryAsUser(userA_id, `
      SELECT COUNT(*)::int AS count 
      FROM public.rooms 
      WHERE property_id = '${propA_id}' AND status = 'OCCUPIED' AND is_active = true;
    `);
    const occupiedCount = occupiedRoomsRes[0].count;
    assert(occupiedCount === 1,
      `Test 20: Dashboard occupied rooms reflect active stays (expected 1, got ${occupiedCount})`);

    // -------------------------------------------------------------
    // Test 21: Dashboard occupancy percentage is correct
    // -------------------------------------------------------------
    // Property A has 4 active rooms (101 is DIRTY, 102 is AVAILABLE, 103 is AVAILABLE, 104 is OCCUPIED).
    // Total sellable = 4. Occupied = 1. Occupancy % = (1 / 4) * 100 = 25%
    const totalSellableRes = await queryAsUser(userA_id, `
      SELECT COUNT(*)::int AS count 
      FROM public.rooms 
      WHERE property_id = '${propA_id}' AND is_active = true AND status NOT IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE');
    `);
    const totalSellable = totalSellableRes[0].count;
    const occupancyPercent = totalSellable > 0 ? (occupiedCount / totalSellable) * 100 : 0;
    assert(totalSellable === 4 && Math.round(occupancyPercent) === 25,
      `Test 21: Dashboard occupancy percentage is calculated correctly (${occupiedCount}/${totalSellable} = 25%)`);

    // -------------------------------------------------------------
    // Test 22: Property switching changes front desk data
    // -------------------------------------------------------------
    const propBStays = await queryAsUser(userB_id, `
      SELECT COUNT(*)::int AS count 
      FROM public.stays 
      WHERE property_id = '${propB_id}';
    `);
    assert(propBStays[0].count === 0,
      'Test 22: Property switching isolates data (Property B has independent 0 stays)');

    // -------------------------------------------------------------
    // Test 23: RLS blocks direct cross-property stay access
    // -------------------------------------------------------------
    const directCrossSelect = await queryAsUser(userB_id, `
      SELECT * FROM public.stays WHERE id = '${stayEarly_id}';
    `);
    assert(directCrossSelect.length === 0,
      'Test 23: RLS blocks direct cross-property SELECT on specific stay ID');

    // -------------------------------------------------------------
    // Test 24: Multi-room reservation supports partial check-in
    // -------------------------------------------------------------
    // ResA2 has room1 (roomA2_id is occupied by stayEarly, so let's check in room2 on roomA3)
    let multiRoomPartialSuccess = false;
    let stayMulti2_id;
    try {
      const multiRes = await queryAsUser(userC_id, `
        SELECT (public.check_in_reservation_room(
          '${resA2_room2_id}',
          '${roomA3_id}',
          '${propA_id}',
          2,
          0,
          'Checking in room 2 of 2 in multi-room booking',
          false
        ))->>'id' AS stay_id;
      `);
      stayMulti2_id = multiRes[0].stay_id;
      multiRoomPartialSuccess = Boolean(stayMulti2_id);
    } catch (err) {
      console.error('Multi-room partial check-in error:', err);
    }

    const multiStays = await queryAsUser(userA_id, `
      SELECT id, reservation_room_id, status FROM public.stays WHERE reservation_id = '${resA2_id}';
    `);
    assert(
      multiRoomPartialSuccess && multiStays.length === 1 && multiStays[0].reservation_room_id === resA2_room2_id,
      'Test 24: Multi-room reservation supports partial check-in (1 room checked in, other room pending)'
    );

    // -------------------------------------------------------------
    // Test 25: Reservation remains active while another room item is in-house
    // -------------------------------------------------------------
    // Check out the newly checked-in room 2
    await queryAsUser(userC_id, `
      SELECT public.check_out_stay('${stayMulti2_id}', '${propA_id}');
    `);

    // Verify parent reservation is NOT completed because room 1 is still uncompleted
    const resA2AfterPartialCheckout = (await client.query(`
      SELECT status FROM public.reservations WHERE id = '${resA2_id}';
    `)).rows[0];
    assert(resA2AfterPartialCheckout.status === 'CONFIRMED',
      'Test 25: Multi-room reservation remains CONFIRMED while another reservation room remains uncompleted');

  } catch (err) {
    console.error('Test suite runtime error:', err);
    failed++;
  } finally {
    // Cleanup test fixtures
    console.log('\n--- Cleaning up test records ---');
    try {
      if (propA_id) {
        await client.query(`DELETE FROM public.properties WHERE id = '${propA_id}';`);
      }
      if (propB_id) {
        await client.query(`DELETE FROM public.properties WHERE id = '${propB_id}';`);
      }
      if (orgA_id) {
        await client.query(`DELETE FROM public.organizations WHERE id = '${orgA_id}';`);
      }
      if (orgB_id) {
        await client.query(`DELETE FROM public.organizations WHERE id = '${orgB_id}';`);
      }
      await client.query(`
        DELETE FROM auth.users 
        WHERE id IN ('${userA_id}', '${userB_id}', '${userC_id}', '${userD_id}', '${userE_id}');
      `);
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }

    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`FRONT DESK SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testFrontDeskSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
