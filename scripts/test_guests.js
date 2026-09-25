const { Client } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testGuestsSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 9: GUEST CRM & GUEST PROFILE TEST SUITE');
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
    await client.query(
      `SELECT set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', true);`
    );
    try {
      const result = await client.query(sql);
      await client.query('COMMIT');
      return result.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  // Helper: execute query expecting an error
  async function queryAsUserExpectError(userId, sql) {
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE authenticated;`);
    await client.query(
      `SELECT set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', true);`
    );
    try {
      await client.query(sql);
      await client.query('COMMIT');
      return null; // no error
    } catch (err) {
      await client.query('ROLLBACK');
      return err;
    }
  }

  const userA_id = '9a111111-0000-0000-0000-000000000001'; // Owner at Property A
  const userB_id = '9b222222-0000-0000-0000-000000000002'; // Owner at Property B
  const userC_id = '9c333333-0000-0000-0000-000000000003'; // Receptionist at Property A
  const userD_id = '9d444444-0000-0000-0000-000000000004'; // Unaffiliated user
  const userE_id = '9e555555-0000-0000-0000-000000000005'; // Kitchen Staff at Property A

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let typeA_id;
  let roomA1_id, roomA2_id;
  let guestA1_id, guestA2_id, guestB1_id;
  let resA1_id, stayA1_id;

  try {
    // 0. Setup mock auth users
    console.log('\n[SETUP] Creating test users & roles...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'guest-owner-a@stayhub.test', '{"full_name": "Owner A"}', now(), now()),
        ('${userB_id}', 'guest-owner-b@stayhub.test', '{"full_name": "Owner B"}', now(), now()),
        ('${userC_id}', 'guest-recep-a@stayhub.test', '{"full_name": "Recep A"}', now(), now()),
        ('${userD_id}', 'guest-unaffil@stayhub.test', '{"full_name": "Unaffiliated User"}', now(), now()),
        ('${userE_id}', 'guest-kitchen-a@stayhub.test', '{"full_name": "Kitchen Staff"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Setup organizations & properties
    console.log('[SETUP] Creating organizations, properties, rooms...');
    const orgARes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Guest Test Org A', 'guest-test-org-a', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Guest Test Org B', 'guest-test-org-b', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgA_id}', 'Grand Alpha Resort', 'grand-alpha-resort', '10 Coastal Rd', 'Goa', 'Goa', '403001', 'INR', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgB_id}', 'Beta Valley Lodge', 'beta-valley-lodge', '20 Mountain Pass', 'Manali', 'HP', '175131', 'INR', '${userB_id}')
      RETURNING id;
    `);
    propB_id = propBRes.rows[0].id;

    // Get roles
    const ownerRoleId = (
      await client.query(`SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER' LIMIT 1;`)
    ).rows[0].id;
    const recepRoleId = (
      await client.query(`SELECT id FROM public.roles WHERE code = 'RECEPTIONIST' LIMIT 1;`)
    ).rows[0].id;
    const kitchenRoleId = (
      await client.query(`SELECT id FROM public.roles WHERE code = 'KITCHEN_STAFF' LIMIT 1;`)
    ).rows[0].id;

    // Assign memberships
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES
        ('${propA_id}', '${userA_id}', '${ownerRoleId}', 'active'),
        ('${propB_id}', '${userB_id}', '${ownerRoleId}', 'active'),
        ('${propA_id}', '${userC_id}', '${recepRoleId}', 'active'),
        ('${propA_id}', '${userE_id}', '${kitchenRoleId}', 'active');
    `);

    // Room types and rooms for reservation/stay linkages
    const typeARes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, max_occupancy, base_rate, currency)
      VALUES ('${propA_id}', 'Luxury Villa', 'VIL', 2, 8000.00, 'INR')
      RETURNING id;
    `);
    typeA_id = typeARes.rows[0].id;

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

    // Pre-populate guests for testing
    console.log('[SETUP] Creating initial guests...');
    const guestA1Res = await client.query(`
      INSERT INTO public.guests (
        property_id, first_name, last_name, email, phone, nationality,
        status, preferred_language, company_name, created_by, updated_by
      )
      VALUES (
        '${propA_id}', 'Alice', 'Smith', 'alice.smith@example.com', '+91 98765 11111', 'Indian',
        'ACTIVE', 'en', 'Acme Corp', '${userA_id}', '${userA_id}'
      )
      RETURNING id;
    `);
    guestA1_id = guestA1Res.rows[0].id;

    const guestA2Res = await client.query(`
      INSERT INTO public.guests (
        property_id, first_name, last_name, email, phone, nationality,
        status, created_by, updated_by
      )
      VALUES (
        '${propA_id}', 'Bob', 'Jones', 'bob.jones@example.com', '+91 98765 22222', 'American',
        'ACTIVE', '${userA_id}', '${userA_id}'
      )
      RETURNING id;
    `);
    guestA2_id = guestA2Res.rows[0].id;

    const guestB1Res = await client.query(`
      INSERT INTO public.guests (
        property_id, first_name, last_name, email, phone, nationality,
        status, created_by, updated_by
      )
      VALUES (
        '${propB_id}', 'Charlie', 'Brown', 'charlie.b@example.com', '+91 98765 33333', 'British',
        'ACTIVE', '${userB_id}', '${userB_id}'
      )
      RETURNING id;
    `);
    guestB1_id = guestB1Res.rows[0].id;

    console.log('\n[TESTS] Executing 25 Verification Tests...\n');

    // -------------------------------------------------------------
    // Test 1: User A can read Property A guests
    // -------------------------------------------------------------
    const guestsUserA = await queryAsUser(
      userA_id,
      `SELECT * FROM public.guests WHERE property_id = '${propA_id}';`
    );
    assert(
      guestsUserA.length >= 2,
      `Test 1: User A (Owner Property A) can read Property A guests (${guestsUserA.length} found)`
    );

    // -------------------------------------------------------------
    // Test 2: User B cannot read Property A guests (RLS isolation)
    // -------------------------------------------------------------
    const guestsUserBOnA = await queryAsUser(
      userB_id,
      `SELECT * FROM public.guests WHERE property_id = '${propA_id}';`
    );
    assert(
      guestsUserBOnA.length === 0,
      'Test 2: User B (Property B) sees 0 guests from Property A via RLS isolation'
    );

    // -------------------------------------------------------------
    // Test 3: Unaffiliated user sees zero guests
    // -------------------------------------------------------------
    const guestsUserD = await queryAsUser(userD_id, `SELECT * FROM public.guests;`);
    assert(
      guestsUserD.length === 0,
      'Test 3: Unaffiliated user sees 0 guests anywhere across all properties'
    );

    // -------------------------------------------------------------
    // Test 4: Authorized receptionist can create guest
    // -------------------------------------------------------------
    const newGuestRes = await queryAsUser(
      userC_id,
      `INSERT INTO public.guests (
        property_id, first_name, last_name, email, phone, nationality, status, created_by, updated_by
      )
      VALUES (
        '${propA_id}', 'David', 'Miller', 'david.m@example.com', '+91 98765 44444', 'Canadian',
        'ACTIVE', '${userC_id}', '${userC_id}'
      )
      RETURNING id, first_name, last_name;`
    );
    assert(
      newGuestRes.length === 1 && newGuestRes[0].first_name === 'David',
      'Test 4: Receptionist User C successfully created guest in Property A'
    );
    const createdGuestId = newGuestRes[0].id;

    // -------------------------------------------------------------
    // Test 5: Unauthorized role cannot create guest (direct RLS INSERT restriction)
    // -------------------------------------------------------------
    const unaffilInsertErr = await queryAsUserExpectError(
      userD_id,
      `INSERT INTO public.guests (property_id, first_name, last_name, status)
       VALUES ('${propA_id}', 'Hacker', 'Guest', 'ACTIVE');`
    );
    assert(
      unaffilInsertErr !== null,
      'Test 5: Unauthorized unaffiliated user rejected from creating guests by RLS'
    );

    // -------------------------------------------------------------
    // Test 6: Authorized user can update guest
    // -------------------------------------------------------------
    const updateRes = await queryAsUser(
      userC_id,
      `UPDATE public.guests
       SET preferred_name = 'Dave', updated_by = '${userC_id}', updated_at = now()
       WHERE id = '${createdGuestId}' AND property_id = '${propA_id}'
       RETURNING preferred_name;`
    );
    assert(
      updateRes.length === 1 && updateRes[0].preferred_name === 'Dave',
      'Test 6: Authorized receptionist updated guest preferred_name to "Dave"'
    );

    // -------------------------------------------------------------
    // Test 7: Unauthorized user cannot update guest
    // -------------------------------------------------------------
    const updateByUnaffil = await queryAsUser(
      userD_id,
      `UPDATE public.guests SET first_name = 'Compromised' WHERE id = '${createdGuestId}' RETURNING id;`
    );
    assert(
      updateByUnaffil.length === 0,
      'Test 7: Unauthorized user update affects 0 rows under RLS'
    );

    // -------------------------------------------------------------
    // Test 8: Guest search returns only current property
    // -------------------------------------------------------------
    const searchRes = await queryAsUser(
      userA_id,
      `SELECT * FROM public.guests
       WHERE property_id = '${propA_id}'
       AND (
         first_name ILIKE '%Alice%'
         OR last_name ILIKE '%Alice%'
         OR email ILIKE '%Alice%'
       );`
    );
    assert(
      searchRes.length === 1 && searchRes[0].id === guestA1_id,
      'Test 8: Guest search returned matching guest Alice exclusively from Property A'
    );

    // -------------------------------------------------------------
    // Test 9: Cross-property guest ID cannot be accessed
    // -------------------------------------------------------------
    const crossAccess = await queryAsUser(
      userA_id,
      `SELECT * FROM public.guests WHERE id = '${guestB1_id}';`
    );
    assert(
      crossAccess.length === 0,
      'Test 9: User A querying Property B guest ID returns empty result'
    );

    // -------------------------------------------------------------
    // Test 10: Guest linked to reservation remains accessible
    // -------------------------------------------------------------
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const resRes = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children, primary_guest_id, total_amount, currency
      )
      VALUES (
        '${propA_id}', 'CONF-P9-001', 'CONFIRMED', 'DIRECT',
        '${today}', '${tomorrow}', 1, 0, '${guestA1_id}', 8000.00, 'INR'
      )
      RETURNING id;
    `);
    resA1_id = resRes.rows[0].id;

    const resRoomRes = await client.query(`
      INSERT INTO public.reservation_rooms (
        reservation_id, property_id, room_type_id, room_id,
        check_in_date, check_out_date, adults, children, nightly_rate, total_amount, currency
      )
      VALUES (
        '${resA1_id}', '${propA_id}', '${typeA_id}', '${roomA1_id}',
        '${today}', '${tomorrow}', 1, 0, 8000.00, 8000.00, 'INR'
      )
      RETURNING id;
    `);
    const resRoomA1_id = resRoomRes.rows[0].id;

    const linkedGuestQuery = await queryAsUser(
      userA_id,
      `SELECT r.confirmation_number, g.first_name, g.last_name
       FROM public.reservations r
       JOIN public.guests g ON r.primary_guest_id = g.id
       WHERE r.id = '${resA1_id}';`
    );
    assert(
      linkedGuestQuery.length === 1 && linkedGuestQuery[0].first_name === 'Alice',
      'Test 10: Guest linked to reservation is accessible via joined query'
    );

    // -------------------------------------------------------------
    // Test 11: Guest linked to stay remains accessible
    // -------------------------------------------------------------
    const stayRes = await client.query(`
      INSERT INTO public.stays (
        property_id, reservation_id, reservation_room_id, guest_id, room_id,
        status, expected_check_out_date, adults, children, actual_check_in_at
      )
      VALUES (
        '${propA_id}', '${resA1_id}', '${resRoomA1_id}', '${guestA1_id}', '${roomA1_id}',
        'CHECKED_IN', '${tomorrow}', 1, 0, now()
      )
      RETURNING id;
    `);
    stayA1_id = stayRes.rows[0].id;

    const stayGuestQuery = await queryAsUser(
      userA_id,
      `SELECT s.id, g.first_name, g.last_name, r.room_number
       FROM public.stays s
       JOIN public.guests g ON s.guest_id = g.id
       JOIN public.rooms r ON s.room_id = r.id
       WHERE s.id = '${stayA1_id}';`
    );
    assert(
      stayGuestQuery.length === 1 && stayGuestQuery[0].room_number === '101',
      'Test 11: Guest linked to stay remains accessible in Room 101'
    );

    // -------------------------------------------------------------
    // Test 12: Guest cannot be hard-deleted when historical records exist
    // -------------------------------------------------------------
    let deleteFailedAsExpected = false;
    try {
      await client.query(`DELETE FROM public.guests WHERE id = '${guestA1_id}';`);
    } catch (err) {
      deleteFailedAsExpected = err.message.includes('violates foreign key constraint');
    }
    assert(
      deleteFailedAsExpected,
      'Test 12: Engine blocked hard delete of guest with active reservation/stay (ON DELETE RESTRICT)'
    );

    // -------------------------------------------------------------
    // Test 13: Guest can be deactivated
    // -------------------------------------------------------------
    const deactRes = await queryAsUser(
      userC_id,
      `UPDATE public.guests
       SET status = 'INACTIVE', updated_by = '${userC_id}', updated_at = now()
       WHERE id = '${createdGuestId}' AND property_id = '${propA_id}'
       RETURNING status;`
    );
    assert(
      deactRes.length === 1 && deactRes[0].status === 'INACTIVE',
      'Test 13: Guest was successfully soft-deactivated (status = INACTIVE)'
    );

    // -------------------------------------------------------------
    // Test 14: Duplicate detection identifies matching email
    // -------------------------------------------------------------
    const dupEmailRes = await queryAsUser(
      userA_id,
      `SELECT id, first_name, last_name, email FROM public.guests
       WHERE property_id = '${propA_id}'
       AND LOWER(email) = LOWER('ALICE.SMITH@EXAMPLE.COM');`
    );
    assert(
      dupEmailRes.length === 1 && dupEmailRes[0].id === guestA1_id,
      'Test 14: Duplicate detection identified existing guest by case-insensitive email'
    );

    // -------------------------------------------------------------
    // Test 15: Duplicate detection identifies matching phone
    // -------------------------------------------------------------
    const dupPhoneRes = await queryAsUser(
      userA_id,
      `SELECT id, first_name, last_name, phone FROM public.guests
       WHERE property_id = '${propA_id}'
       AND phone = '+91 98765 11111';`
    );
    assert(
      dupPhoneRes.length === 1 && dupPhoneRes[0].id === guestA1_id,
      'Test 15: Duplicate detection identified existing guest by matching phone number'
    );

    // -------------------------------------------------------------
    // Test 16: Guest preferences are property-safe
    // -------------------------------------------------------------
    const prefRes = await queryAsUser(
      userC_id,
      `INSERT INTO public.guest_preferences (
        guest_id, property_id, preference_type, preference_value, notes, created_by, updated_by
      )
      VALUES (
        '${guestA1_id}', '${propA_id}', 'ROOM', 'High Floor Ocean View', 'Prefers quiet corner',
        '${userC_id}', '${userC_id}'
      )
      RETURNING id, preference_type, preference_value;`
    );
    assert(
      prefRes.length === 1 && prefRes[0].preference_type === 'ROOM',
      'Test 16: Receptionist successfully added guest preference under Property A'
    );

    const prefUserB = await queryAsUser(
      userB_id,
      `SELECT * FROM public.guest_preferences WHERE property_id = '${propA_id}';`
    );
    assert(
      prefUserB.length === 0,
      'Test 16b: User B sees 0 preferences for Property A via RLS'
    );

    // -------------------------------------------------------------
    // Test 17: Guest notes are property-safe
    // -------------------------------------------------------------
    const noteRes = await queryAsUser(
      userC_id,
      `INSERT INTO public.guest_notes (
        guest_id, property_id, note, is_pinned, created_by, updated_by
      )
      VALUES (
        '${guestA1_id}', '${propA_id}', 'VIP guest - anniversary celebration on arrival.',
        true, '${userC_id}', '${userC_id}'
      )
      RETURNING id, note;`
    );
    assert(
      noteRes.length === 1 && noteRes[0].note.includes('VIP guest'),
      'Test 17: Receptionist added internal note for Alice under Property A'
    );

    const noteUserB = await queryAsUser(
      userB_id,
      `SELECT * FROM public.guest_notes WHERE property_id = '${propA_id}';`
    );
    assert(
      noteUserB.length === 0,
      'Test 17b: User B sees 0 internal notes for Property A via RLS'
    );

    // -------------------------------------------------------------
    // Test 18: Cross-property preference/guest assignment is rejected by trigger
    // -------------------------------------------------------------
    let crossTenantPrefRejected = false;
    try {
      await client.query(`
        INSERT INTO public.guest_preferences (
          guest_id, property_id, preference_type, preference_value
        )
        VALUES ('${guestA1_id}', '${propB_id}', 'DIETARY', 'Vegan');
      `);
    } catch (err) {
      crossTenantPrefRejected = err.message.includes('Cross-tenant violation');
    }
    assert(
      crossTenantPrefRejected,
      'Test 18: Database trigger rejected guest_preference with mismatched guest/property tenant IDs'
    );

    // -------------------------------------------------------------
    // Test 19: Guest history counts match reservations/stays
    // -------------------------------------------------------------
    const statsQuery = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM public.stays WHERE guest_id = '${guestA1_id}') as stay_count,
        (SELECT COUNT(*) FROM public.reservations WHERE primary_guest_id = '${guestA1_id}') as res_count;
    `);
    const stayCount = parseInt(statsQuery.rows[0].stay_count);
    const resCount = parseInt(statsQuery.rows[0].res_count);
    assert(
      stayCount === 1 && resCount === 1,
      `Test 19: Historical metrics match reservations (${resCount}) and stays (${stayCount})`
    );

    // -------------------------------------------------------------
    // Test 20: Current stay appears correctly for in-house guest
    // -------------------------------------------------------------
    const currentStayQuery = await queryAsUser(
      userA_id,
      `SELECT s.id, s.status, r.room_number
       FROM public.stays s
       JOIN public.rooms r ON s.room_id = r.id
       WHERE s.guest_id = '${guestA1_id}'
       AND s.status = 'CHECKED_IN';`
    );
    assert(
      currentStayQuery.length === 1 && currentStayQuery[0].room_number === '101',
      'Test 20: Current in-house stay for Alice located correctly in Room 101'
    );

    // -------------------------------------------------------------
    // Test 21: Upcoming reservation appears correctly for guest
    // -------------------------------------------------------------
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
    const futureDateEnd = new Date(Date.now() + 9 * 86400000).toISOString().split('T')[0];
    await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children, primary_guest_id, total_amount, currency
      )
      VALUES (
        '${propA_id}', 'CONF-P9-FUTURE', 'CONFIRMED', 'DIRECT',
        '${futureDate}', '${futureDateEnd}', 2, 0, '${guestA1_id}', 16000.00, 'INR'
      );
    `);

    const upcomingResQuery = await queryAsUser(
      userA_id,
      `SELECT id, confirmation_number, check_in_date
       FROM public.reservations
       WHERE primary_guest_id = '${guestA1_id}'
       AND check_in_date > '${today}'
       AND status IN ('CONFIRMED', 'PENDING')
       ORDER BY check_in_date ASC
       LIMIT 1;`
    );
    assert(
      upcomingResQuery.length === 1 && upcomingResQuery[0].confirmation_number === 'CONF-P9-FUTURE',
      'Test 21: Upcoming future reservation CONF-P9-FUTURE surfaced accurately'
    );

    // -------------------------------------------------------------
    // Test 22: Property switching changes guest results
    // -------------------------------------------------------------
    const guestsInPropA = await queryAsUser(
      userA_id,
      `SELECT COUNT(*) FROM public.guests WHERE property_id = '${propA_id}';`
    );
    const guestsInPropB = await queryAsUser(
      userB_id,
      `SELECT COUNT(*) FROM public.guests WHERE property_id = '${propB_id}';`
    );
    assert(
      parseInt(guestsInPropA[0].count) >= 3 && parseInt(guestsInPropB[0].count) === 1,
      `Test 22: Property switching cleanly isolates guest datasets (Prop A: ${guestsInPropA[0].count}, Prop B: ${guestsInPropB[0].count})`
    );

    // -------------------------------------------------------------
    // Test 23: Booking flow can select existing guest
    // -------------------------------------------------------------
    const bookingWithExistingGuest = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children, primary_guest_id, total_amount, currency
      )
      VALUES (
        '${propA_id}', 'CONF-P9-EXIST', 'CONFIRMED', 'PHONE',
        '${today}', '${tomorrow}', 1, 0, '${guestA2_id}', 8000.00, 'INR'
      )
      RETURNING id, primary_guest_id;
    `);
    assert(
      bookingWithExistingGuest.rows[0].primary_guest_id === guestA2_id,
      'Test 23: Booking flow successfully links to existing guest Bob Jones'
    );

    // -------------------------------------------------------------
    // Test 24: Booking flow can create new guest
    // -------------------------------------------------------------
    const newGuestFromBooking = await client.query(`
      INSERT INTO public.guests (
        property_id, first_name, last_name, email, phone, status
      )
      VALUES (
        '${propA_id}', 'Emma', 'Watson', 'emma.w@example.com', '+91 98765 55555', 'ACTIVE'
      )
      RETURNING id;
    `);
    const newBookingWithNewGuest = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, booking_source,
        check_in_date, check_out_date, adults, children, primary_guest_id, total_amount, currency
      )
      VALUES (
        '${propA_id}', 'CONF-P9-NEWGUEST', 'CONFIRMED', 'DIRECT',
        '${today}', '${tomorrow}', 1, 0, '${newGuestFromBooking.rows[0].id}', 8000.00, 'INR'
      )
      RETURNING id, primary_guest_id;
    `);
    assert(
      newBookingWithNewGuest.rows[0].primary_guest_id === newGuestFromBooking.rows[0].id,
      'Test 24: Booking flow successfully registered new guest Emma Watson and linked reservation'
    );

    // -------------------------------------------------------------
    // Test 25: Front Desk links to correct guest profile
    // -------------------------------------------------------------
    const frontDeskCheck = await queryAsUser(
      userA_id,
      `SELECT s.id AS stay_id, s.guest_id, g.first_name, g.last_name, g.email
       FROM public.stays s
       JOIN public.guests g ON s.guest_id = g.id
       WHERE s.property_id = '${propA_id}'
       AND s.status = 'CHECKED_IN';`
    );
    assert(
      frontDeskCheck.length >= 1 && frontDeskCheck[0].guest_id === guestA1_id,
      `Test 25: Front Desk query correctly resolves active stay to Guest profile (${frontDeskCheck[0].first_name} ${frontDeskCheck[0].last_name})`
    );
  } catch (err) {
    console.error('Test suite runtime error:', err);
    failed++;
  } finally {
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
  console.log(`GUEST CRM SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testGuestsSuite().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
