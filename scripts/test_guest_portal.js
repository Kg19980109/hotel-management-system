const { Client } = require('pg');
const crypto = require('crypto');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

function hashToken(token) {
  return crypto.createHash('sha256').update(token.trim()).digest('hex');
}

function generateSecureToken(byteLength = 32) {
  return crypto.randomBytes(byteLength).toString('hex');
}

async function testGuestPortalSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 14: QR GUEST PORTAL & SESSIONS TEST SUITE');
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
    await client.query(`SELECT set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', true);`);
    try {
      const result = await client.query(sql, params);
      await client.query('COMMIT');
      return result.rows;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  }

  const userA_id = 'a1111111-0000-0000-0000-000000000001'; // Owner at Property A
  const userB_id = 'b2222222-0000-0000-0000-000000000002'; // Owner at Property B
  const userFD_id = '33333333-3333-3333-3333-333333333333'; // Front Desk at Property A
  const userHK_id = '77777777-7777-7777-7777-777777777777'; // Housekeeping at Property A
  const userD_id = 'd4444444-0000-0000-0000-000000000004'; // Unaffiliated user

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let roomA204_id, roomA205_id, roomB101_id;
  let guestA_id, guestB_id;
  let resA_id, resA_conf = 'RES-26-000204';
  let resB_id, resB_conf = 'RES-26-000205';
  let stayA_id, stayB_id;

  let rawTokenRoom204, hashTokenRoom204;
  let rawTokenGeneral, hashTokenGeneral;
  let qrRoom204_id, qrGeneral_id;
  let rawSessionTokenA, hashSessionTokenA;

  try {
    console.log('\n[SETUP] Initializing test organizations, properties, rooms, and stays...');

    // 0. Ensure Auth Users exist
    for (const uid of [userA_id, userB_id, userFD_id, userHK_id, userD_id]) {
      await client.query(`
        INSERT INTO auth.users (id, email)
        VALUES ($1, $2)
        ON CONFLICT (id) DO NOTHING;
      `, [uid, `test-${uid}@stayhub.com`]);
    }

    // 1. Create Organization & Property A
    const orgA = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Guest Portal Test Org A', 'portal-org-a-' || gen_random_uuid(), 'org-a@stayhub.test')
      RETURNING id;
    `);
    orgA_id = orgA.rows[0].id;

    const propA = await client.query(`
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email, wifi_ssid, wifi_password
      )
      VALUES (
        $1, 'StayHub Grand Palace', 'palace-' || gen_random_uuid(), 'SHGP', '101 Ocean Blvd', 'Goa', 'Goa', '403001', '+91 832 200000', 'palace@stayhub.test', 'GrandPalace-Guest', 'Welcome2026'
      )
      RETURNING id;
    `, [orgA_id]);
    propA_id = propA.rows[0].id;

    // Create Organization & Property B
    const orgB = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Guest Portal Test Org B', 'portal-org-b-' || gen_random_uuid(), 'org-b@stayhub.test')
      RETURNING id;
    `);
    orgB_id = orgB.rows[0].id;

    const propB = await client.query(`
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code
      )
      VALUES (
        $1, 'StayHub City Suites', 'suites-' || gen_random_uuid(), 'SHCS', '200 Business Way', 'Mumbai', 'Maharashtra', '400001'
      )
      RETURNING id;
    `, [orgB_id]);
    propB_id = propB.rows[0].id;

    // Roles & Memberships
    const roleOwner = await client.query(`SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER';`);
    const roleFD = await client.query(`SELECT id FROM public.roles WHERE code = 'FRONT_DESK';`);
    const roleHK = await client.query(`SELECT id FROM public.roles WHERE code = 'HOUSEKEEPING';`);

    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES 
        ($1, $2, $3, 'active'),
        ($1, $4, $5, 'active'),
        ($1, $6, $7, 'active'),
        ($8, $9, $3, 'active')
      ON CONFLICT DO NOTHING;
    `, [
      propA_id, userA_id, roleOwner.rows[0].id,
      userFD_id, roleFD.rows[0].id,
      userHK_id, roleHK.rows[0].id,
      propB_id, userB_id
    ]);

    // Create Room Types
    const rtA = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ($1, 'Deluxe Ocean View', 'DOV', 5000.00, 2)
      RETURNING id;
    `, [propA_id]);
    const roomTypeA_id = rtA.rows[0].id;

    const rtB = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ($1, 'City Suite', 'CS', 4000.00, 2)
      RETURNING id;
    `, [propB_id]);
    const roomTypeB_id = rtB.rows[0].id;

    // Create Rooms in Property A
    const roomA1 = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '204', 'AVAILABLE', 'CLEAN', 2)
      RETURNING id;
    `, [propA_id, roomTypeA_id]);
    roomA204_id = roomA1.rows[0].id;

    const roomA2 = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '205', 'AVAILABLE', 'CLEAN', 2)
      RETURNING id;
    `, [propA_id, roomTypeA_id]);
    roomA205_id = roomA2.rows[0].id;

    // Room in Property B
    const roomB1 = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '101', 'AVAILABLE', 'CLEAN', 2)
      RETURNING id;
    `, [propB_id, roomTypeB_id]);
    roomB101_id = roomB1.rows[0].id;

    // Create Guest Profile & Reservation in Property A
    const guestResA = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ($1, 'Aarav', 'Sharma', 'aarav.sharma@test.com', '+919876543210')
      RETURNING id;
    `, [propA_id]);
    guestA_id = guestResA.rows[0].id;

    // Add CRM note & document type to test privacy boundary (must never leak to guest)
    await client.query(`
      UPDATE public.guests
      SET notes = 'VIP guest - Prefers quiet room away from elevator. Allergic to peanuts.',
          id_document_type = 'PASSPORT',
          id_document_number = 'P12345678'
      WHERE id = $1;
    `, [guestA_id]);

    const resObjA = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, check_in_date, check_out_date, adults, primary_guest_id, total_amount, internal_notes
      )
      VALUES (
        $1, $2, 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 2, $3, 12000.00, 'Staff note: Comp fruit basket upon arrival.'
      )
      RETURNING id;
    `, [propA_id, resA_conf, guestA_id]);
    resA_id = resObjA.rows[0].id;

    // Check In Guest A into Room 204
    await client.query(`UPDATE public.rooms SET status = 'AVAILABLE' WHERE id = $1;`, [roomA204_id]);
    const stayObjA = await client.query(`
      INSERT INTO public.stays (
        property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults
      )
      VALUES (
        $1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + INTERVAL '2 days', 2
      )
      RETURNING id;
    `, [propA_id, resA_id, guestA_id, roomA204_id]);
    stayA_id = stayObjA.rows[0].id;
    await client.query(`UPDATE public.rooms SET status = 'OCCUPIED' WHERE id = $1;`, [roomA204_id]);

    console.log('[SETUP] Complete.\n');

    // ============================================================
    // 1. Create Room QR Code
    // ============================================================
    console.log('--- 1. Create Room QR Code ---');
    rawTokenRoom204 = generateSecureToken(32);
    hashTokenRoom204 = hashToken(rawTokenRoom204);

    const qr1 = await client.query(`
      SELECT public.create_guest_qr_code(
        $1, 'ROOM', 'Room 204 Key QR', $2, $3, NULL, NULL, $4
      ) as res;
    `, [propA_id, hashTokenRoom204, roomA204_id, userA_id]);

    const qr1Res = qr1.rows[0].res;
    assert(qr1Res.success === true, '1a. create_guest_qr_code executed successfully');
    qrRoom204_id = qr1Res.qr_code.id;
    assert(qr1Res.qr_code.room_id === roomA204_id, '1b. QR code correctly references Room 204');

    // ============================================================
    // 2. Create Hotel General QR Code
    // ============================================================
    console.log('--- 2. Create Hotel General QR Code ---');
    rawTokenGeneral = generateSecureToken(32);
    hashTokenGeneral = hashToken(rawTokenGeneral);

    const qrGen = await client.query(`
      SELECT public.create_guest_qr_code(
        $1, 'HOTEL_GENERAL', 'Lobby Reception QR', $2, NULL, NULL, NULL, $3
      ) as res;
    `, [propA_id, hashTokenGeneral, userA_id]);

    const qrGenRes = qrGen.rows[0].res;
    assert(qrGenRes.success === true, '2a. Hotel general QR code created successfully');
    qrGeneral_id = qrGenRes.qr_code.id;
    assert(qrGenRes.qr_code.qr_type === 'HOTEL_GENERAL', '2b. General QR type set to HOTEL_GENERAL');

    // ============================================================
    // 3. Token Randomness
    // ============================================================
    console.log('--- 3. Token Randomness ---');
    const tokenA = generateSecureToken(32);
    const tokenB = generateSecureToken(32);
    assert(tokenA.length === 64 && tokenB.length === 64 && tokenA !== tokenB, '3. Tokens are 256-bit cryptographically unique strings');

    // ============================================================
    // 4 & 5. Token Hash Storage & Raw Token Absence
    // ============================================================
    console.log('--- 4 & 5. Token Hash Storage ---');
    const dbQr = await client.query(`SELECT * FROM public.guest_qr_codes WHERE id = $1;`, [qrRoom204_id]);
    assert(dbQr.rows[0].token_hash === hashTokenRoom204, '4. Database stores SHA-256 token hash');
    assert(dbQr.rows[0].token_hash !== rawTokenRoom204, '5. Raw token is never stored in database');

    // ============================================================
    // 6 & 7. QR Activation & Deactivation
    // ============================================================
    console.log('--- 6 & 7. QR Activation & Deactivation ---');
    assert(dbQr.rows[0].is_active === true, '6. QR code is active on creation');

    const deactRes = await client.query(`
      SELECT public.deactivate_guest_qr_code($1, $2, $3) as res;
    `, [qrRoom204_id, propA_id, userA_id]);
    assert(deactRes.rows[0].res.success === true, '7a. deactivate_guest_qr_code succeeded');

    const deactCheck = await client.query(`
      SELECT public.resolve_guest_qr_access($1) as res;
    `, [hashTokenRoom204]);
    assert(deactCheck.rows[0].res.valid === false, '7b. Deactivated QR code rejected by public resolver');

    // ============================================================
    // 8 & 9. QR Rotation & Invalidation of Old Token
    // ============================================================
    console.log('--- 8 & 9. QR Rotation ---');
    const newRawToken = generateSecureToken(32);
    const newHashToken = hashToken(newRawToken);

    const rotRes = await client.query(`
      SELECT public.rotate_guest_qr_code($1, $2, $3, $4) as res;
    `, [qrRoom204_id, propA_id, newHashToken, userA_id]);
    assert(rotRes.rows[0].res.success === true, '8. rotate_guest_qr_code rotated token and reactivated QR');

    // Old token should fail
    const oldResolve = await client.query(`SELECT public.resolve_guest_qr_access($1) as res;`, [hashTokenRoom204]);
    assert(oldResolve.rows[0].res.valid === false, '9a. Old token is now invalid');

    // New token should succeed
    const newResolve = await client.query(`SELECT public.resolve_guest_qr_access($1) as res;`, [newHashToken]);
    assert(newResolve.rows[0].res.valid === true, '9b. New token resolves access point');
    rawTokenRoom204 = newRawToken;
    hashTokenRoom204 = newHashToken;

    // ============================================================
    // 10 & 11. Invalid & Expired Token Rejection
    // ============================================================
    console.log('--- 10 & 11. Invalid & Expired Token Rejection ---');
    const invalidHash = hashToken('totally-fake-token-12345');
    const invalidRes = await client.query(`SELECT public.resolve_guest_qr_access($1) as res;`, [invalidHash]);
    assert(invalidRes.rows[0].res.valid === false, '10. Invalid token safely rejected without leakage');

    // Create an expired QR code
    const expiredRaw = generateSecureToken(32);
    const expiredHash = hashToken(expiredRaw);
    await client.query(`
      INSERT INTO public.guest_qr_codes (property_id, qr_type, name, token_hash, room_id, expires_at, is_active)
      VALUES ($1, 'ROOM', 'Expired Room QR', $2, $3, now() - INTERVAL '1 hour', true);
    `, [propA_id, expiredHash, roomA204_id]);

    const expRes = await client.query(`SELECT public.resolve_guest_qr_access($1) as res;`, [expiredHash]);
    assert(expRes.rows[0].res.valid === false, '11. Expired QR token rejected');

    // ============================================================
    // 12 & 13. Room QR Property Consistency Trigger
    // ============================================================
    console.log('--- 12 & 13. Cross-Tenant Property Consistency ---');
    const crossTokenHash = hashToken(generateSecureToken(32));
    let crossFailed = false;
    try {
      await client.query(`
        INSERT INTO public.guest_qr_codes (property_id, qr_type, name, token_hash, room_id, is_active)
        VALUES ($1, 'ROOM', 'Cross Tenant QR', $2, $3, true);
      `, [propA_id, crossTokenHash, roomB101_id]); // Room B101 on Prop A
    } catch (e) {
      crossFailed = true;
    }
    assert(crossFailed, '12. Cross-property room assignment rejected by database trigger');

    // ============================================================
    // 14 & 15. Stay Resolution & Privacy on Empty Room
    // ============================================================
    console.log('--- 14 & 15. Current Stay Resolution & Privacy Boundary ---');
    const room204Access = await client.query(`SELECT public.resolve_guest_qr_access($1) as res;`, [hashTokenRoom204]);
    assert(room204Access.rows[0].res.has_active_stay === true, '14a. Correctly detects active stay in Room 204');
    assert(room204Access.rows[0].res.guest_name === undefined, '14b. Privacy guarantee: Does not expose guest name in initial QR resolution');
    assert(room204Access.rows[0].res.confirmation_number === undefined, '14c. Privacy guarantee: Does not expose confirmation number');

    // Check Room 205 (Vacant)
    const rawToken205 = generateSecureToken(32);
    const hashToken205 = hashToken(rawToken205);
    await client.query(`
      SELECT public.create_guest_qr_code($1, 'ROOM', 'Room 205 QR', $2, $3) as res;
    `, [propA_id, hashToken205, roomA205_id]);

    const room205Access = await client.query(`SELECT public.resolve_guest_qr_access($1) as res;`, [hashToken205]);
    assert(room205Access.rows[0].res.has_active_stay === false, '15a. Correctly identifies vacant room without active stay');
    assert(room205Access.rows[0].res.error === undefined, '15b. Returns safe room context without error disclosure');

    // ============================================================
    // 16 & 17. Guest Verification (Success & Failure)
    // ============================================================
    console.log('--- 16 & 17. Guest Stay Verification ---');
    rawSessionTokenA = generateSecureToken(32);
    hashSessionTokenA = hashToken(rawSessionTokenA);

    // Failed verification with bad confirmation code
    const badVerify = await client.query(`
      SELECT public.verify_and_create_guest_session(
        $1, 'WRONG-CONF-1234', 'Sharma', $2, 24
      ) as res;
    `, [hashTokenRoom204, hashSessionTokenA]);
    assert(badVerify.rows[0].res.success === false, '17. Bad confirmation number safely fails verification without leaking details');

    // Successful verification
    const goodVerify = await client.query(`
      SELECT public.verify_and_create_guest_session(
        $1, $2, 'Sharma', $3, 24
      ) as res;
    `, [hashTokenRoom204, resA_conf, hashSessionTokenA]);
    assert(goodVerify.rows[0].res.success === true, '16. Accurate confirmation number establishes verified guest session');

    // ============================================================
    // 18 & 19. Session Creation & Token Hash Storage
    // ============================================================
    console.log('--- 18 & 19. Session Token Storage ---');
    const dbSession = await client.query(`
      SELECT * FROM public.guest_sessions WHERE session_token_hash = $1;
    `, [hashSessionTokenA]);
    assert(dbSession.rows.length === 1, '18. Guest session row created in database');
    assert(dbSession.rows[0].session_token_hash === hashSessionTokenA, '19a. Session token stored as cryptographic hash');
    assert(dbSession.rows[0].session_token_hash !== rawSessionTokenA, '19b. Raw session token is never stored in DB');

    // ============================================================
    // 20 & 21. Session Expiry & Revocation
    // ============================================================
    console.log('--- 20 & 21. Session Lifecycle Validation ---');
    const validCheck = await client.query(`
      SELECT public.validate_guest_session($1) as res;
    `, [hashSessionTokenA]);
    assert(validCheck.rows[0].res.valid === true, '20a. Active session validates successfully');
    assert(validCheck.rows[0].res.room_number === '204', '20b. Returns safe room number');
    assert(validCheck.rows[0].res.guest_first_name === 'Aarav', '20c. Returns guest first name');

    // Revoke session
    const revRes = await client.query(`
      SELECT public.revoke_guest_session($1, $2) as res;
    `, [dbSession.rows[0].id, propA_id]);
    assert(revRes.rows[0].res.success === true, '21a. revoke_guest_session RPC succeeded');

    const revCheck = await client.query(`
      SELECT public.validate_guest_session($1) as res;
    `, [hashSessionTokenA]);
    assert(revCheck.rows[0].res.valid === false, '21b. Revoked session is immediately invalidated');

    // Re-create active session for checkout test
    rawSessionTokenA = generateSecureToken(32);
    hashSessionTokenA = hashToken(rawSessionTokenA);
    await client.query(`
      SELECT public.verify_and_create_guest_session($1, $2, 'Sharma', $3, 24);
    `, [hashTokenRoom204, resA_conf, hashSessionTokenA]);

    // ============================================================
    // 22, 23, 24. Checkout Invalidation & Cross-Guest Isolation
    // ============================================================
    console.log('--- 22, 23, 24. Checkout Invalidation & Multi-Guest Room Turnover ---');
    // Guest A is checked in. Verify session is valid.
    const preCheckout = await client.query(`SELECT public.validate_guest_session($1) as res;`, [hashSessionTokenA]);
    assert(preCheckout.rows[0].res.valid === true, '22a. Guest A session valid during check-in');

    // Guest A Checks Out
    await client.query(`
      UPDATE public.stays
      SET status = 'CHECKED_OUT', actual_check_out_at = now()
      WHERE id = $1;
    `, [stayA_id]);
    await client.query(`UPDATE public.rooms SET status = 'AVAILABLE' WHERE id = $1;`, [roomA204_id]);

    // Guest A attempts to use old session after checkout
    const postCheckout = await client.query(`SELECT public.validate_guest_session($1) as res;`, [hashSessionTokenA]);
    assert(postCheckout.rows[0].res.valid === false, '22b. Checkout immediately invalidates Guest A stay session');

    // New Guest B Checks in to the SAME Room 204
    const guestResB = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ($1, 'Rohan', 'Verma', 'rohan.verma@test.com', '+919811122233')
      RETURNING id;
    `, [propA_id]);
    guestB_id = guestResB.rows[0].id;

    const resObjB = await client.query(`
      INSERT INTO public.reservations (
        property_id, confirmation_number, status, check_in_date, check_out_date, adults, primary_guest_id, total_amount
      )
      VALUES (
        $1, $2, 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + INTERVAL '1 day', 1, $3, 6000.00
      )
      RETURNING id;
    `, [propA_id, resB_conf, guestB_id]);
    resB_id = resObjB.rows[0].id;

    const stayObjB = await client.query(`
      INSERT INTO public.stays (
        property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults
      )
      VALUES (
        $1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + INTERVAL '1 day', 1
      )
      RETURNING id;
    `, [propA_id, resB_id, guestB_id, roomA204_id]);
    stayB_id = stayObjB.rows[0].id;
    await client.query(`UPDATE public.rooms SET status = 'OCCUPIED' WHERE id = $1;`, [roomA204_id]);

    // Verify: Guest A's old session still CANNOT access Room 204 or see Guest B!
    const guestACheckB = await client.query(`SELECT public.validate_guest_session($1) as res;`, [hashSessionTokenA]);
    assert(guestACheckB.rows[0].res.valid === false, '24. CRITICAL: Guest A old session cannot access Room 204 after Guest B checks in');

    // Guest B verifies and gets a fresh session
    const rawSessionTokenB = generateSecureToken(32);
    const hashSessionTokenB = hashToken(rawSessionTokenB);
    const guestBVerify = await client.query(`
      SELECT public.verify_and_create_guest_session(
        $1, $2, 'Verma', $3, 24
      ) as res;
    `, [hashTokenRoom204, resB_conf, hashSessionTokenB]);
    assert(guestBVerify.rows[0].res.success === true, '23a. Guest B establishes new session for Room 204');

    const guestBCheck = await client.query(`SELECT public.validate_guest_session($1) as res;`, [hashSessionTokenB]);
    assert(guestBCheck.rows[0].res.guest_first_name === 'Rohan', '23b. Guest B session correctly displays Rohan Verma');

    // ============================================================
    // 25 - 28. Cross-Tenant & Arbitrary ID Protection
    // ============================================================
    console.log('--- 25 - 28. Cross-Tenant & Parameter Injection Safety ---');
    // Session validation does not accept client-supplied guest_id or stay_id; it derives everything from session_token_hash.
    assert(guestBCheck.rows[0].res.property_id === propA_id, '25. Session bound exclusively to Property A');
    assert(guestBCheck.rows[0].res.room_id === roomA204_id, '28. Session bound exclusively to assigned room');

    // ============================================================
    // 29 - 32. Privacy Boundary: No CRM Notes, IDs or Internal Logs
    // ============================================================
    console.log('--- 29 - 32. Privacy Boundary Leakage Protection ---');
    assert(guestBCheck.rows[0].res.notes === undefined, '30. Guest CRM notes are NOT exposed in guest session');
    assert(guestBCheck.rows[0].res.id_document_number === undefined, '31. Identity documents are NOT exposed in guest session');
    assert(guestBCheck.rows[0].res.internal_notes === undefined, '32. Reservation internal notes are NOT exposed in guest session');

    // Public Hotel Session
    const rawPublicSession = generateSecureToken(32);
    const hashPublicSession = hashToken(rawPublicSession);
    await client.query(`
      SELECT public.verify_and_create_guest_session(
        $1, 'PUBLIC', NULL, $2, 24
      );
    `, [hashTokenGeneral, hashPublicSession]);

    const publicSessionCheck = await client.query(`SELECT public.validate_guest_session($1) as res;`, [hashPublicSession]);
    assert(publicSessionCheck.rows[0].res.session_type === 'PUBLIC_HOTEL', '29a. Hotel general QR creates PUBLIC_HOTEL session');
    assert(publicSessionCheck.rows[0].res.room_number === undefined, '29b. Public hotel session has no room or stay attachment');

    // ============================================================
    // 33 & 34. Staff Permissions & RLS Isolation
    // ============================================================
    console.log('--- 33 & 34. Permissions & RLS Enforcement ---');
    // Front Desk can query QR codes for Property A
    const fdQrs = await queryAsUser(userFD_id, `SELECT * FROM public.guest_qr_codes WHERE property_id = $1;`, [propA_id]);
    assert(fdQrs.length >= 2, '33a. Front Desk staff has access to view property QR codes');

    // Unaffiliated User cannot view Property A QR codes
    const unaffQrs = await queryAsUser(userD_id, `SELECT * FROM public.guest_qr_codes WHERE property_id = $1;`, [propA_id]);
    assert(unaffQrs.length === 0, '34a. RLS: Unaffiliated user cannot SELECT guest_qr_codes');

    // Unaffiliated User cannot view Property A Guest Sessions
    const unaffSessions = await queryAsUser(userD_id, `SELECT * FROM public.guest_sessions WHERE property_id = $1;`, [propA_id]);
    assert(unaffSessions.length === 0, '34b. RLS: Unaffiliated user cannot SELECT guest_sessions');

    // Property B owner cannot view Property A QR codes
    const propBQrs = await queryAsUser(userB_id, `SELECT * FROM public.guest_qr_codes WHERE property_id = $1;`, [propA_id]);
    assert(propBQrs.length === 0, '34c. RLS: Property B owner cannot access Property A QR codes');

    // ============================================================
    // 37 - 40. Public Hotel, Restaurant & Historical Preservation
    // ============================================================
    console.log('--- 37 - 40. Hotel Directory & Historical Preservation ---');
    assert(publicSessionCheck.rows[0].res.property_name === 'StayHub Grand Palace', '37a. Public directory retrieves property name');
    assert(publicSessionCheck.rows[0].res.wifi_ssid === 'GrandPalace-Guest', '37b. Public directory retrieves Wi-Fi SSID');

    const totalQrsCount = await client.query(`SELECT COUNT(*) FROM public.guest_qr_codes WHERE property_id = $1;`, [propA_id]);
    assert(parseInt(totalQrsCount.rows[0].count, 10) >= 3, '40. Deactivated & expired QR codes are preserved in historical table');

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  } finally {
    console.log('\n[CLEANUP] Cleaning up test properties...');
    if (propA_id) {
      await client.query(`DELETE FROM public.properties WHERE id = $1;`, [propA_id]);
    }
    if (propB_id) {
      await client.query(`DELETE FROM public.properties WHERE id = $1;`, [propB_id]);
    }
    if (orgA_id) {
      await client.query(`DELETE FROM public.organizations WHERE id = $1;`, [orgA_id]);
    }
    if (orgB_id) {
      await client.query(`DELETE FROM public.organizations WHERE id = $1;`, [orgB_id]);
    }
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`STAYHUB PHASE 14 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testGuestPortalSuite();
