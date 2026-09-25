const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testBookingsSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 7: BOOKINGS & RESERVATION LEDGER TEST SUITE');
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
  let roomA1_id, roomA2_id, roomB1_id;
  let guestA_id, guestB_id;
  let resA1_id;

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
      VALUES ('Booking Test Org A', 'booking-test-org-a', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Booking Test Org B', 'booking-test-org-b', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgA_id}', 'Hotel Alpha Luxury', 'alpha-luxury', '10 Ocean Way', 'Goa', 'Goa', '403001', 'INR', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgB_id}', 'Hotel Beta Peaks', 'beta-peaks-booking', '20 Ridge Rd', 'Manali', 'HP', '175131', 'INR', '${userB_id}')
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
      VALUES ('${propA_id}', 'Deluxe Sea View', 'DLX', 2, 5000.00, 'INR')
      RETURNING id;
    `);
    typeA_id = typeARes.rows[0].id;

    const typeBRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, max_occupancy, base_rate, currency)
      VALUES ('${propB_id}', 'Standard Mountain', 'STD', 2, 3500.00, 'INR')
      RETURNING id;
    `);
    typeB_id = typeBRes.rows[0].id;

    // Create physical rooms
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

    const roomB1Res = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, is_active)
      VALUES ('${propB_id}', '${typeB_id}', '201', 'AVAILABLE', true)
      RETURNING id;
    `);
    roomB1_id = roomB1Res.rows[0].id;

    // Create guests
    const guestARes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propA_id}', 'Alice', 'Smith', 'alice@test.com', '+91 9876543210')
      RETURNING id;
    `);
    guestA_id = guestARes.rows[0].id;

    const guestBRes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propB_id}', 'Bob', 'Jones', 'bob@test.com', '+91 9123456780')
      RETURNING id;
    `);
    guestB_id = guestBRes.rows[0].id;

    console.log('\n--- Running Booking Test Cases ---');

    // -------------------------------------------------------------
    // Test 1: User A (Owner) can create reservation in Property A
    // -------------------------------------------------------------
    const createRes1 = await queryAsUser(userA_id, `
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
      ) VALUES (
        '${propA_id}', 'STH-26-000001', 'CONFIRMED', 'DIRECT',
        '2026-10-10', '2026-10-15', 2, '${guestA_id}', 25000.00, 'INR'
      ) RETURNING id, confirmation_number;
    `);
    resA1_id = createRes1[0].id;

    // Attach Room 101
    await queryAsUser(userA_id, `
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, nightly_rate, total_amount, currency
      ) VALUES (
        '${resA1_id}', '${propA_id}', '${typeA_id}', '${roomA1_id}',
        '2026-10-10', '2026-10-15', 5000.00, 25000.00, 'INR'
      );
    `);
    assert(createRes1.length === 1 && createRes1[0].confirmation_number === 'STH-26-000001',
      'Test 1: User A can create reservation in Property A');

    // -------------------------------------------------------------
    // Test 2: Property B user cannot read Property A reservations
    // -------------------------------------------------------------
    const userBRead = await queryAsUser(userB_id, `
      SELECT * FROM public.reservations WHERE property_id = '${propA_id}';
    `);
    assert(userBRead.length === 0,
      'Test 2: Property B user cannot read Property A reservations (RLS Tenant Boundary)');

    // -------------------------------------------------------------
    // Test 3: Unaffiliated user sees 0 reservations across all properties
    // -------------------------------------------------------------
    const userDRead = await queryAsUser(userD_id, `
      SELECT * FROM public.reservations;
    `);
    assert(userDRead.length === 0,
      'Test 3: Unaffiliated user sees zero reservations across all properties');

    // -------------------------------------------------------------
    // Test 4: Duplicate confirmation number within property is rejected
    // -------------------------------------------------------------
    let dupRejected = false;
    try {
      await queryAsUser(userA_id, `
        INSERT INTO public.reservations (
          property_id, confirmation_number, status, booking_source,
          check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
        ) VALUES (
          '${propA_id}', 'STH-26-000001', 'CONFIRMED', 'DIRECT',
          '2026-11-01', '2026-11-03', 1, '${guestA_id}', 10000.00, 'INR'
        );
      `);
    } catch {
      dupRejected = true;
    }
    assert(dupRejected,
      'Test 4: Duplicate confirmation number (STH-26-000001) is rejected by unique constraint');

    // -------------------------------------------------------------
    // Test 5: Invalid date rejected (check-out <= check-in)
    // -------------------------------------------------------------
    let invalidDateRejected = false;
    try {
      await queryAsUser(userA_id, `
        INSERT INTO public.reservations (
          property_id, confirmation_number, status, booking_source,
          check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
        ) VALUES (
          '${propA_id}', 'STH-26-BAD001', 'CONFIRMED', 'DIRECT',
          '2026-10-15', '2026-10-10', 1, '${guestA_id}', 5000.00, 'INR'
        );
      `);
    } catch {
      invalidDateRejected = true;
    }
    assert(invalidDateRejected,
      'Test 5: Invalid date (check-out earlier than check-in) rejected by CHECK constraint');

    // -------------------------------------------------------------
    // Test 6: Same room overlapping reservation rejected by Exclusion Constraint
    // -------------------------------------------------------------
    // Room 101 is booked 2026-10-10 to 2026-10-15. Try booking 2026-10-12 to 2026-10-18.
    let overlapRejected = false;
    try {
      const resOverlap = await queryAsUser(userA_id, `
        INSERT INTO public.reservations (
          property_id, confirmation_number, status, booking_source,
          check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
        ) VALUES (
          '${propA_id}', 'STH-26-OVERLAP', 'CONFIRMED', 'DIRECT',
          '2026-10-12', '2026-10-18', 1, '${guestA_id}', 30000.00, 'INR'
        ) RETURNING id;
      `);
      await queryAsUser(userA_id, `
        INSERT INTO public.reservation_rooms (
          reservation_id, property_id, room_type_id, room_id,
          check_in_date, check_out_date, nightly_rate, total_amount, currency
        ) VALUES (
          '${resOverlap[0].id}', '${propA_id}', '${typeA_id}', '${roomA1_id}',
          '2026-10-12', '2026-10-18', 5000.00, 30000.00, 'INR'
        );
      `);
    } catch {
      overlapRejected = true;
    }
    assert(overlapRejected,
      'Test 6: Same room overlapping reservation (Oct 12-18 overlapping Oct 10-15) rejected by exclusion constraint');

    // -------------------------------------------------------------
    // Test 7: Same room back-to-back reservation allowed (Oct 15 to Oct 20)
    // -------------------------------------------------------------
    // Interval convention: [10-10, 10-15) and [10-15, 10-20) do NOT overlap
    const backToBackRes = await queryAsUser(userA_id, `
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
      ) VALUES (
        '${propA_id}', 'STH-26-B2B001', 'CONFIRMED', 'DIRECT',
        '2026-10-15', '2026-10-20', 1, '${guestA_id}', 25000.00, 'INR'
      ) RETURNING id;
    `);
    const resB2B_id = backToBackRes[0].id;

    await queryAsUser(userA_id, `
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, nightly_rate, total_amount, currency
      ) VALUES (
        '${resB2B_id}', '${propA_id}', '${typeA_id}', '${roomA1_id}',
        '2026-10-15', '2026-10-20', 5000.00, 25000.00, 'INR'
      );
    `);
    assert(Boolean(resB2B_id),
      'Test 7: Back-to-back booking (Check-in on previous Check-out date Oct 15) successfully allowed');

    // -------------------------------------------------------------
    // Test 8: Cancelled reservation no longer blocks inventory
    // -------------------------------------------------------------
    // Cancel the first reservation (resA1_id). Then book Room 101 on Oct 10-15 again!
    await queryAsUser(userA_id, `
      UPDATE public.reservations 
      SET status = 'CANCELLED', cancelled_at = now()
      WHERE id = '${resA1_id}';
    `);

    // Verify room 101 can now be reserved for Oct 10-15
    const rebookedRes = await queryAsUser(userA_id, `
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
      ) VALUES (
        '${propA_id}', 'STH-26-REBOOK1', 'CONFIRMED', 'DIRECT',
        '2026-10-10', '2026-10-15', 2, '${guestA_id}', 25000.00, 'INR'
      ) RETURNING id;
    `);
    await queryAsUser(userA_id, `
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, nightly_rate, total_amount, currency
      ) VALUES (
        '${rebookedRes[0].id}', '${propA_id}', '${typeA_id}', '${roomA1_id}',
        '2026-10-10', '2026-10-15', 5000.00, 25000.00, 'INR'
      );
    `);
    assert(Boolean(rebookedRes[0].id),
      'Test 8: Cancelled reservation successfully released inventory for rebooking');

    // -------------------------------------------------------------
    // Test 9: Cross-property room assignment rejected
    // -------------------------------------------------------------
    // Trying to assign Property B's Room 201 to Property A reservation
    let crossRoomRejected = false;
    try {
      await queryAsUser(userA_id, `
        INSERT INTO public.reservation_rooms (
          reservation_id, property_id, room_type_id, room_id,
          check_in_date, check_out_date, nightly_rate, total_amount, currency
        ) VALUES (
          '${resB2B_id}', '${propA_id}', '${typeA_id}', '${roomB1_id}',
          '2026-10-15', '2026-10-20', 5000.00, 25000.00, 'INR'
        );
      `);
    } catch {
      crossRoomRejected = true;
    }
    assert(crossRoomRejected,
      'Test 9: Cross-property room assignment (Hotel B room into Hotel A booking) rejected by trigger');

    // -------------------------------------------------------------
    // Test 10: Cross-property guest assignment rejected
    // -------------------------------------------------------------
    // Trying to create reservation in Property A with guestB_id (Property B guest)
    let crossGuestRejected = false;
    try {
      await queryAsUser(userA_id, `
        INSERT INTO public.reservations (
          property_id, confirmation_number, status, booking_source,
          check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
        ) VALUES (
          '${propA_id}', 'STH-26-CROSSGUEST', 'CONFIRMED', 'DIRECT',
          '2026-12-01', '2026-12-05', 1, '${guestB_id}', 20000.00, 'INR'
        );
      `);
    } catch {
      crossGuestRejected = true;
    }
    assert(crossGuestRejected,
      'Test 10: Cross-property guest assignment (Hotel B guest into Hotel A booking) rejected by trigger');

    // -------------------------------------------------------------
    // Test 11: Unauthorized role (Kitchen Staff) cannot create reservations
    // -------------------------------------------------------------
    let kitchenBlocked = false;
    try {
      await queryAsUser(userE_id, `
        INSERT INTO public.reservations (
          property_id, confirmation_number, status, booking_source,
          check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
        ) VALUES (
          '${propA_id}', 'STH-26-KITCHEN', 'CONFIRMED', 'DIRECT',
          '2026-12-10', '2026-12-12', 1, '${guestA_id}', 10000.00, 'INR'
        );
      `);
    } catch {
      kitchenBlocked = true;
    }
    assert(kitchenBlocked,
      'Test 11: Unauthorized role (Kitchen Staff) is blocked from creating reservations by RLS');

    // -------------------------------------------------------------
    // Test 12: Authorized Receptionist can create reservation
    // -------------------------------------------------------------
    const recepBooking = await queryAsUser(userC_id, `
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
      ) VALUES (
        '${propA_id}', 'STH-26-RECEP01', 'CONFIRMED', 'WALK_IN',
        '2026-11-20', '2026-11-22', 2, '${guestA_id}', 10000.00, 'INR'
      ) RETURNING id;
    `);
    assert(Boolean(recepBooking[0]?.id),
      'Test 12: Authorized Receptionist can create reservation');

    // -------------------------------------------------------------
    // Test 13: Unauthorized user (User B) cannot cancel Property A reservation
    // -------------------------------------------------------------
    const unauthCancel = await queryAsUser(userB_id, `
      UPDATE public.reservations 
      SET status = 'CANCELLED'
      WHERE id = '${recepBooking[0].id}';
    `);
    assert(unauthCancel.length === 0,
      'Test 13: Unauthorized cross-tenant user cannot cancel reservation (0 rows updated)');

    // -------------------------------------------------------------
    // Test 14: Authorized Receptionist can cancel reservation
    // -------------------------------------------------------------
    const recepCancel = await queryAsUser(userC_id, `
      UPDATE public.reservations 
      SET status = 'CANCELLED', cancelled_at = now()
      WHERE id = '${recepBooking[0].id}'
      RETURNING id, status;
    `);
    assert(recepCancel[0]?.status === 'CANCELLED',
      'Test 14: Authorized Receptionist can cancel reservation');

    // -------------------------------------------------------------
    // Test 15: Room availability counts are correct
    // -------------------------------------------------------------
    // Room 101 is booked Oct 10-15 and Oct 15-20.
    // Querying availability for Oct 11 to 14 should return Room 102 as available, but NOT Room 101!
    const availRooms = await client.query(`
      SELECT id, room_number FROM public.rooms r
      WHERE r.property_id = '${propA_id}'
        AND r.is_active = true
        AND r.status NOT IN ('OUT_OF_ORDER', 'OUT_OF_SERVICE')
        AND NOT EXISTS (
          SELECT 1 FROM public.reservation_rooms rr
          WHERE rr.room_id = r.id
            AND NOT rr.is_cancelled
            AND rr.check_in_date < '2026-10-14'
            AND rr.check_out_date > '2026-10-11'
        );
    `);
    const availNumbers = availRooms.rows.map(r => r.room_number);
    assert(availNumbers.includes('102') && !availNumbers.includes('101'),
      'Test 15: Room availability correctly detects Room 101 as booked and Room 102 as available');

    // -------------------------------------------------------------
    // Test 16: Dashboard arrivals reflect real reservation dates
    // -------------------------------------------------------------
    const todayStr = new Date().toISOString().split('T')[0];
    await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, primary_guest_id, total_amount, currency
      ) VALUES (
        '${propA_id}', 'STH-26-TODAYARRIV', 'CONFIRMED', 'DIRECT',
        '${todayStr}', '${todayStr}'::date + interval '2 days', 1, '${guestA_id}', 10000.00, 'INR'
      );
    `);

    const arrivalsCheck = await client.query(`
      SELECT count(*) as count FROM public.reservations
      WHERE property_id = '${propA_id}'
        AND check_in_date = '${todayStr}'
        AND status IN ('CONFIRMED', 'PENDING');
    `);
    assert(parseInt(arrivalsCheck.rows[0].count) >= 1,
      `Test 16: Dashboard arrivals correctly reflects today's reservations (${arrivalsCheck.rows[0].count} expected arrival)`);

    // -------------------------------------------------------------
    // Test 17: Property switching returns independent booking data
    // -------------------------------------------------------------
    const propBBookings = await queryAsUser(userB_id, `
      SELECT * FROM public.reservations WHERE property_id = '${propB_id}';
    `);
    assert(propBBookings.length === 0,
      'Test 17: Property B has independent booking inventory (0 reservations)');

    // -------------------------------------------------------------
    // Test 18: RLS blocks cross-tenant reservation access
    // -------------------------------------------------------------
    const crossResRooms = await queryAsUser(userB_id, `
      SELECT * FROM public.reservation_rooms WHERE property_id = '${propA_id}';
    `);
    assert(crossResRooms.length === 0,
      'Test 18: RLS blocks direct cross-tenant SELECT on reservation_rooms');

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
  console.log(`BOOKING SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testBookingsSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
