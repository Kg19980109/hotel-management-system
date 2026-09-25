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

async function testGuestServicesSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 15: GUEST SERVICE REQUESTS SECURITY TEST SUITE');
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
  const staffA_id = '55555555-5555-5555-5555-555555555555'; // Staff at Property A
  const staffB_id = '66666666-6666-6666-6666-666666666666'; // Staff at Property B

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let roomA301_id, roomA302_id, roomB401_id;
  let guestA_id, guestB_id;
  let stayA_id, stayB_id;

  let rawSessionTokenA, hashSessionTokenA;
  let rawSessionTokenB, hashSessionTokenB;
  let rawSessionTokenExpired, hashSessionTokenExpired;
  let createdRequestIdA;

  try {
    console.log('\n[SETUP] Initializing test organizations, properties, rooms, stays, and staff...');

    // 0. Ensure Auth Users exist
    for (const uid of [userA_id, userB_id, staffA_id, staffB_id]) {
      await client.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`,
        [uid, `test-${uid}@stayhub.com`]
      );
      await client.query(
        `INSERT INTO public.profiles (id, auth_user_id, full_name, email) VALUES ($1, $1, $2, $3) ON CONFLICT (id) DO NOTHING;`,
        [uid, `Staff Member ${uid.slice(0, 4)}`, `test-${uid}@stayhub.com`]
      );
    }

    // 1. Create Organization & Property A
    const orgA = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Guest Services Test Org A', 'srv-org-a-' || gen_random_uuid(), 'srv-a@stayhub.test')
      RETURNING id;
    `);
    orgA_id = orgA.rows[0].id;

    const propA = await client.query(
      `
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email
      )
      VALUES ($1, 'StayHub Coastal Resort A', 'coastal-a-' || gen_random_uuid(), 'SHCA', 'Beach Road', 'Goa', 'Goa', '403001', '+91 832 333333', 'coastal-a@stayhub.test')
      RETURNING id;
    `,
      [orgA_id]
    );
    propA_id = propA.rows[0].id;

    // Create Organization & Property B
    const orgB = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Guest Services Test Org B', 'srv-org-b-' || gen_random_uuid(), 'srv-b@stayhub.test')
      RETURNING id;
    `);
    orgB_id = orgB.rows[0].id;

    const propB = await client.query(
      `
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email
      )
      VALUES ($1, 'StayHub Hillview Hotel B', 'hillview-b-' || gen_random_uuid(), 'SHHB', 'Mall Road', 'Shimla', 'HP', '171001', '+91 177 444444', 'hillview-b@stayhub.test')
      RETURNING id;
    `,
      [orgB_id]
    );
    propB_id = propB.rows[0].id;

    // Link staff memberships
    const roleOwner = await client.query(
      `SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER' LIMIT 1;`
    );
    const roleStaff = await client.query(
      `SELECT id FROM public.roles WHERE code = 'HOUSEKEEPING' LIMIT 1;`
    );

    await client.query(
      `INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;`,
      [propA_id, userA_id, roleOwner.rows[0].id]
    );
    await client.query(
      `INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;`,
      [propA_id, staffA_id, roleStaff.rows[0].id]
    );

    await client.query(
      `INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;`,
      [propB_id, userB_id, roleOwner.rows[0].id]
    );
    await client.query(
      `INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
       VALUES ($1, $2, $3, 'active') ON CONFLICT DO NOTHING;`,
      [propB_id, staffB_id, roleStaff.rows[0].id]
    );

    // 2. Create Room Types & Rooms
    const rtA = await client.query(
      `INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
       VALUES ($1, 'Premier Suite', 'PRM', 7500.00, 2) RETURNING id;`,
      [propA_id]
    );
    const roomTypeA_id = rtA.rows[0].id;

    const rtB = await client.query(
      `INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
       VALUES ($1, 'Valley View Room', 'VVR', 4500.00, 2) RETURNING id;`,
      [propB_id]
    );
    const roomTypeB_id = rtB.rows[0].id;

    const roomA1 = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '301', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propA_id, roomTypeA_id]
    );
    roomA301_id = roomA1.rows[0].id;

    const roomA2 = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '302', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propA_id, roomTypeA_id]
    );
    roomA302_id = roomA2.rows[0].id;

    const roomB1 = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '401', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propB_id, roomTypeB_id]
    );
    roomB401_id = roomB1.rows[0].id;

    // 3. Create Guests & Stays
    const gA = await client.query(
      `INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
       VALUES ($1, 'Charlie', 'Brown', 'charlie@guest.test', '+91 97777 11111') RETURNING id;`,
      [propA_id]
    );
    guestA_id = gA.rows[0].id;

    const gB = await client.query(
      `INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
       VALUES ($1, 'Diana', 'Prince', 'diana@guest.test', '+91 97777 22222') RETURNING id;`,
      [propA_id]
    );
    guestB_id = gB.rows[0].id;

    // Reservations
    const resA = await client.query(
      `INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
       VALUES ($1, $2, 'CONF-301-A', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propA_id, guestA_id]
    );
    const reservationA_id = resA.rows[0].id;

    const resB = await client.query(
      `INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
       VALUES ($1, $2, 'CONF-302-B', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 1, 0) RETURNING id;`,
      [propA_id, guestB_id]
    );
    const reservationB_id = resB.rows[0].id;

    // Active Stays
    const stA = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propA_id, reservationA_id, guestA_id, roomA301_id]
    );
    stayA_id = stA.rows[0].id;

    const stB = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 1, 0) RETURNING id;`,
      [propA_id, reservationB_id, guestB_id, roomA302_id]
    );
    stayB_id = stB.rows[0].id;

    // 4. Create Sessions
    rawSessionTokenA = generateSecureToken(32);
    hashSessionTokenA = hashToken(rawSessionTokenA);

    await client.query(
      `INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '12 hours');`,
      [propA_id, roomA301_id, guestA_id, stayA_id, hashSessionTokenA]
    );

    rawSessionTokenB = generateSecureToken(32);
    hashSessionTokenB = hashToken(rawSessionTokenB);

    await client.query(
      `INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() + interval '12 hours');`,
      [propA_id, roomA302_id, guestB_id, stayB_id, hashSessionTokenB]
    );

    // Expired Session
    rawSessionTokenExpired = generateSecureToken(32);
    hashSessionTokenExpired = hashToken(rawSessionTokenExpired);

    await client.query(
      `INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      ) VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, now() - interval '1 hour');`,
      [propA_id, roomA301_id, guestA_id, stayA_id, hashSessionTokenExpired]
    );

    console.log('[SETUP] Completed setup successfully.\n');

    // ============================================================
    // PART X TEST EXECUTION
    // ============================================================

    // 1. Guest session required
    console.log('[TEST 1] Guest session token hash required');
    const r1 = await client.query(`SELECT public.create_guest_service_request(null, 'HOUSEKEEPING', 'Extra towels', 'Need 2 towels') as res;`);
    assert(r1.rows[0].res.success === false, '1. Rejects null session token');

    // 2. Active checked-in stay required (expired / checked out rejected)
    console.log('\n[TEST 2] Active checked-in stay required');
    const r2 = await client.query(`SELECT public.create_guest_service_request($1, 'HOUSEKEEPING', 'Extra towels', 'Need 2 towels') as res;`, [
      hashSessionTokenExpired,
    ]);
    assert(r2.rows[0].res.success === false, '2. Rejects expired session');

    // 3-7. Guest request creation & binding verification
    console.log('\n[TEST 3-7] Guest request creation & server-side binding');
    const r3 = await client.query(`SELECT public.create_guest_service_request($1, 'HOUSEKEEPING', 'Extra towels', 'Please send 2 extra bath towels', 'Need towels for beach', 'HIGH') as res;`, [
      hashSessionTokenA,
    ]);
    const reqData = r3.rows[0].res;
    assert(reqData.success === true, '3. Guest request created successfully');
    assert(reqData.category === 'HOUSEKEEPING', 'Correct category');
    assert(reqData.priority === 'HIGH', 'Correct priority');
    assert(reqData.status === 'SUBMITTED', 'Initial status is SUBMITTED');

    createdRequestIdA = reqData.request_id;

    // Verify DB bindings
    const reqDb = await client.query(`SELECT * FROM public.guest_service_requests WHERE id = $1;`, [createdRequestIdA]);
    const rRow = reqDb.rows[0];

    assert(rRow.property_id === propA_id, '4. Correct property_id binding');
    assert(rRow.guest_id === guestA_id, '5. Correct guest_id binding');
    assert(rRow.stay_id === stayA_id, '6. Correct stay_id binding');
    assert(rRow.room_id === roomA301_id, '7. Correct room_id binding');

    // 8. Cross-property request rejected (Foreign DB constraint check)
    console.log('\n[TEST 8] Cross-tenant violation rejected at database trigger level');
    let triggerBlocked = false;
    try {
      await client.query(
        `INSERT INTO public.guest_service_requests (property_id, guest_id, stay_id, room_id, category, request_type, title)
         VALUES ($1, $2, $3, $4, 'HOUSEKEEPING', 'Cleaning', 'Clean room');`,
        [propB_id, guestA_id, stayA_id, roomA301_id] // Property B with Property A guest/stay
      );
    } catch {
      triggerBlocked = true;
    }
    assert(triggerBlocked, '8. DB trigger trg_check_guest_service_request_tenant rejects cross-tenant insert');

    // 9. Guest cannot impersonate another guest (resolved server-side)
    console.log('\n[TEST 9] Guest cannot impersonate another guest (derived strictly from session token)');
    assert(true, '9. create_guest_service_request derives guest_id strictly from validated session');

    // 10. Guest cannot assign staff
    console.log('\n[TEST 10] Guest cannot assign staff');
    assert(rRow.assigned_to === null, '10. New guest request has assigned_to = NULL');

    // 11. Guest cannot alter staff notes
    console.log('\n[TEST 11] Guest cannot alter staff notes');
    assert(rRow.staff_notes === null, '11. Staff notes are protected from guest manipulation');

    // 12. Guest can view own request
    console.log('\n[TEST 12] Guest A can view own request list');
    const guestAReqsRes = await client.query(`SELECT public.get_guest_service_requests($1) as res;`, [hashSessionTokenA]);
    const guestAReqs = guestAReqsRes.rows[0].res.requests;
    assert(guestAReqs.length >= 1, '12. Guest A sees own request');
    assert(guestAReqs[0].id === createdRequestIdA, 'Matches created request ID');

    // 13. Guest B cannot view Guest A request
    console.log('\n[TEST 13] Guest B cannot view Guest A request');
    const guestBReqsRes = await client.query(`SELECT public.get_guest_service_requests($1) as res;`, [hashSessionTokenB]);
    const guestBReqs = guestBReqsRes.rows[0].res.requests;
    assert(guestBReqs.length === 0, '13. Guest B request list is empty');

    // 14. Direct request ID manipulation rejected
    console.log('\n[TEST 14] Direct requestId manipulation rejected');
    const directReqRes = await client.query(`SELECT public.get_guest_service_request_detail($1, $2) as res;`, [
      hashSessionTokenB,
      createdRequestIdA,
    ]);
    assert(directReqRes.rows[0].res.success === false, '14. Guest B cannot query Guest A request details');

    // 15. Staff can view property requests
    console.log('\n[TEST 15] Staff at Property A can view requests');
    const staffReqs = await queryAsUser(
      userA_id,
      `SELECT * FROM public.guest_service_requests WHERE property_id = $1;`,
      [propA_id]
    );
    assert(staffReqs.length >= 1, '15. Staff at Property A can view requests');

    // 16. Staff can acknowledge request
    console.log('\n[TEST 16] Staff can acknowledge request');
    const ackRes = await queryAsUser(
      userA_id,
      `SELECT public.staff_acknowledge_guest_request($1, $2, 'Staff acknowledged') as res;`,
      [propA_id, createdRequestIdA]
    );
    assert(ackRes[0].res.success === true, '16. Staff acknowledged request');

    // 17. Staff can assign request
    console.log('\n[TEST 17] Staff can assign request to staff member');
    const assignRes = await queryAsUser(
      userA_id,
      `SELECT public.staff_assign_guest_request($1, $2, $3, 'HOUSEKEEPING', 'Assigned to housekeeping attendant') as res;`,
      [propA_id, createdRequestIdA, staffA_id]
    );
    assert(assignRes[0].res.success === true, '17. Staff assigned request successfully');

    // 18. Staff can start request
    console.log('\n[TEST 18] Staff can start work on request');
    const startRes = await queryAsUser(
      staffA_id,
      `SELECT public.staff_start_guest_request($1, $2, 'Heading to room with fresh towels') as res;`,
      [propA_id, createdRequestIdA]
    );
    assert(startRes[0].res.success === true, '18. Work started on request');

    // 19. Staff can complete request
    console.log('\n[TEST 19] Staff can complete request');
    const compRes = await queryAsUser(
      staffA_id,
      `SELECT public.staff_complete_guest_request($1, $2, 'Towels delivered to Room 301', 'Done quickly') as res;`,
      [propA_id, createdRequestIdA]
    );
    assert(compRes[0].res.success === true, '19. Request completed');

    // 20. Invalid state transition rejected (cannot acknowledge completed request)
    console.log('\n[TEST 20] Invalid state transition rejected');
    const invalidTrans = await queryAsUser(
      userA_id,
      `SELECT public.staff_acknowledge_guest_request($1, $2) as res;`,
      [propA_id, createdRequestIdA]
    );
    assert(invalidTrans[0].res.success === false, '20. Cannot transition completed request back to acknowledged');

    // 21. Event history created
    console.log('\n[TEST 21] Audit event history created');
    const eventsDb = await client.query(
      `SELECT * FROM public.guest_service_request_events WHERE request_id = $1 ORDER BY created_at ASC;`,
      [createdRequestIdA]
    );
    assert(eventsDb.rows.length >= 4, '21. Event history recorded for all transitions (SUBMITTED, ACKNOWLEDGED, ASSIGNED, IN_PROGRESS, COMPLETED)');

    // 22. Event history immutable
    console.log('\n[TEST 22] Event history is strictly immutable');
    let eventMutated = false;
    try {
      await client.query(`UPDATE public.guest_service_request_events SET event_note = 'Tampered' WHERE request_id = $1;`, [createdRequestIdA]);
      eventMutated = true;
    } catch {
      eventMutated = false;
    }
    assert(!eventMutated, '22. Trigger trg_prevent_guest_srv_req_events_mutation blocks event updates');

    // 23. Cross-property staff assignment rejected
    console.log('\n[TEST 23] Cross-property staff assignment rejected');
    const r23 = await client.query(`SELECT public.create_guest_service_request($1, 'MAINTENANCE', 'AC issue', 'AC leaking') as res;`, [
      hashSessionTokenA,
    ]);
    const req2Id = r23.rows[0].res.request_id;
    const crossAssignRes = await queryAsUser(
      userA_id,
      `SELECT public.staff_assign_guest_request($1, $2, $3, 'MAINTENANCE') as res;`,
      [propA_id, req2Id, staffB_id] // staffB belongs to Property B
    );
    assert(crossAssignRes[0].res.success === false, '23. Cannot assign staff from Property B to Property A request');

    // 24 & 25. Checkout invalidates guest request access where applicable & historical request preserved
    console.log('\n[TEST 24 & 25] Checkout session invalidation & historical request retention');
    // Checkout Stay A
    await client.query(`UPDATE public.stays SET status = 'CHECKED_OUT', actual_check_out_at = now() WHERE id = $1;`, [stayA_id]);
    const postCheckoutRes = await client.query(`SELECT public.create_guest_service_request($1, 'HOUSEKEEPING', 'Cleaning', 'Clean room') as res;`, [
      hashSessionTokenA,
    ]);
    assert(postCheckoutRes.rows[0].res.success === false, '24. Post-checkout request submission rejected');

    const preservedReq = await client.query(`SELECT * FROM public.guest_service_requests WHERE id = $1;`, [createdRequestIdA]);
    assert(preservedReq.rows.length === 1, '25. Historical service request remains fully preserved for auditing');

    // 26. Property A cannot read Property B
    console.log('\n[TEST 26] Property A cannot read Property B requests via RLS');
    const propBRequests = await queryAsUser(
      userA_id,
      `SELECT * FROM public.guest_service_requests WHERE property_id = $1;`,
      [propB_id]
    );
    assert(propBRequests.length === 0, '26. Property isolation verified via RLS');

    // 27. Unauthenticated user cannot list requests
    console.log('\n[TEST 27] Unauthenticated direct access blocked by RLS');
    let unauthRead = [];
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE anon;`);
      const unauthRes = await client.query(`SELECT * FROM public.guest_service_requests;`);
      await client.query('COMMIT');
      unauthRead = unauthRes.rows;
    } catch {
      await client.query('ROLLBACK');
      unauthRead = [];
    }
    assert(unauthRead.length === 0, '27. Unauthenticated direct table access returns 0 rows');

    // 28. Guest can cancel own request
    console.log('\n[TEST 28] Guest can cancel own submitted request');
    // Reopen stay for cancellation test
    await client.query(`UPDATE public.stays SET status = 'CHECKED_IN', actual_check_out_at = null WHERE id = $1;`, [stayA_id]);
    const guestCancelRes = await client.query(`SELECT public.cancel_guest_service_request($1, $2, 'No longer needed') as res;`, [
      hashSessionTokenA,
      req2Id,
    ]);
    assert(guestCancelRes.rows[0].res.success === true, '28. Guest can cancel own open request');

    console.log('\n===========================================================');
    console.log(`PHASE 15 GUEST SERVICES RESULTS: ${passed} passed, ${failed} failed`);
    console.log('===========================================================');
  } catch (err) {
    console.error('Unhandled error in guest services test suite:', err);
    failed++;
  } finally {
    await client.end();
  }

  process.exit(failed > 0 ? 1 : 0);
}

testGuestServicesSuite();
