const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testRoomsSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 6: ROOM MANAGEMENT & ROOM INVENTORY TEST SUITE');
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

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let floorA_id, floorB_id;
  let typeA_id, typeB_id;
  let roomA1_id, roomA2_id;

  try {
    // 0. Setup mock auth users
    console.log('\n[SETUP] Creating test users...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'owner-a@stayhub.test', '{"full_name": "Owner A"}', now(), now()),
        ('${userB_id}', 'owner-b@stayhub.test', '{"full_name": "Owner B"}', now(), now()),
        ('${userC_id}', 'recep-a@stayhub.test', '{"full_name": "Recep A"}', now(), now()),
        ('${userD_id}', 'unaffil@stayhub.test', '{"full_name": "Unaffiliated User"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Setup organizations & properties
    console.log('[SETUP] Creating organizations and properties...');
    const orgARes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Room Test Org A', 'room-test-org-a', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Room Test Org B', 'room-test-org-b', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, created_by)
      VALUES ('${orgA_id}', 'Hotel Alpha Paradise', 'alpha-paradise', '1 Seaside St', 'Goa', 'Goa', '403001', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, created_by)
      VALUES ('${orgB_id}', 'Hotel Beta Peaks', 'beta-peaks', '2 Mountain Rd', 'Manali', 'HP', '175131', '${userB_id}')
      RETURNING id;
    `);
    propB_id = propBRes.rows[0].id;

    // Get role IDs
    const ownerRoleRes = await client.query(`SELECT id FROM public.roles WHERE code = 'HOTEL_OWNER' LIMIT 1;`);
    const ownerRoleId = ownerRoleRes.rows[0].id;

    const recepRoleRes = await client.query(`SELECT id FROM public.roles WHERE code = 'RECEPTIONIST' LIMIT 1;`);
    const recepRoleId = recepRoleRes.rows[0].id;

    // Memberships: User A is Owner of Prop A; User B is Owner of Prop B; User C is Receptionist of Prop A
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES 
        ('${propA_id}', '${userA_id}', '${ownerRoleId}', 'active'),
        ('${propB_id}', '${userB_id}', '${ownerRoleId}', 'active'),
        ('${propA_id}', '${userC_id}', '${recepRoleId}', 'active');
    `);

    // Create Floors
    const floorARes = await client.query(`
      INSERT INTO public.floors (property_id, name, floor_number, sort_order)
      VALUES ('${propA_id}', '1st Floor', 1, 1)
      RETURNING id;
    `);
    floorA_id = floorARes.rows[0].id;

    const floorBRes = await client.query(`
      INSERT INTO public.floors (property_id, name, floor_number, sort_order)
      VALUES ('${propB_id}', 'Ground Floor', 0, 1)
      RETURNING id;
    `);
    floorB_id = floorBRes.rows[0].id;

    // Create Room Types
    const typeARes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, max_occupancy, base_rate, currency)
      VALUES ('${propA_id}', 'Deluxe King', 'DLX-K', 2, 5500.00, 'INR')
      RETURNING id;
    `);
    typeA_id = typeARes.rows[0].id;

    const typeBRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, max_occupancy, base_rate, currency)
      VALUES ('${propB_id}', 'Standard Twin', 'STD-TWN', 2, 4000.00, 'INR')
      RETURNING id;
    `);
    typeB_id = typeBRes.rows[0].id;

    // Create initial Room in Prop A
    const roomA1Res = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA_id}', '${typeA_id}', '101', 'AVAILABLE', 'CLEAN')
      RETURNING id;
    `);
    roomA1_id = roomA1Res.rows[0].id;

    // --- TEST 1: Property A user can read its rooms ---
    console.log('\n--- Running Test Cases ---');
    const propARooms = await queryAsUser(userA_id, `SELECT id, room_number FROM public.rooms WHERE property_id = '${propA_id}';`);
    assert(propARooms.length === 1 && propARooms[0].room_number === '101', 'Test 1: User A can read Property A rooms');

    // --- TEST 2: Property B user cannot read Property A rooms ---
    const crossRead = await queryAsUser(userB_id, `SELECT id FROM public.rooms WHERE property_id = '${propA_id}';`);
    assert(crossRead.length === 0, 'Test 2: Property B user cannot read Property A rooms (RLS Tenant Boundary)');

    // --- TEST 3: User without membership sees zero rooms ---
    const unaffilRead = await queryAsUser(userD_id, `SELECT id FROM public.rooms;`);
    assert(unaffilRead.length === 0, 'Test 3: Unaffiliated user sees 0 rooms across all properties');

    // --- TEST 4: Authorized user can create room ---
    const createRoomRes = await queryAsUser(userA_id, `
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status)
      VALUES ('${propA_id}', '${floorA_id}', '${typeA_id}', '102', 'AVAILABLE')
      RETURNING id;
    `);
    roomA2_id = createRoomRes[0].id;
    assert(roomA2_id !== undefined, 'Test 4: Authorized Owner can create room (102 created)');

    // --- TEST 5: Unauthorized role (Receptionist) cannot create room ---
    let createBlocked = false;
    try {
      await queryAsUser(userC_id, `
        INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status)
        VALUES ('${propA_id}', '${floorA_id}', '${typeA_id}', '103', 'AVAILABLE');
      `);
    } catch {
      createBlocked = true;
    }
    assert(createBlocked, 'Test 5: Receptionist role is blocked from inserting new rooms by RLS');

    // --- TEST 6: Duplicate room number in same property is rejected ---
    let dupBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number)
        VALUES ('${propA_id}', '${floorA_id}', '${typeA_id}', '101');
      `);
    } catch {
      dupBlocked = true;
    }
    assert(dupBlocked, 'Test 6: Duplicate room number (101) within Property A is rejected by constraint');

    // --- TEST 7: Cross-tenant room type violation is rejected by trigger ---
    let crossTypeBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number)
        VALUES ('${propA_id}', '${floorA_id}', '${typeB_id}', '104');
      `);
    } catch {
      crossTypeBlocked = true;
    }
    assert(crossTypeBlocked, 'Test 7: Cross-tenant room_type_id (from Hotel B into Hotel A) rejected by consistency trigger');

    // --- TEST 8: Cross-tenant floor violation is rejected by trigger ---
    let crossFloorBlocked = false;
    try {
      await client.query(`
        INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number)
        VALUES ('${propA_id}', '${floorB_id}', '${typeA_id}', '105');
      `);
    } catch {
      crossFloorBlocked = true;
    }
    assert(crossFloorBlocked, 'Test 8: Cross-tenant floor_id (from Hotel B into Hotel A) rejected by consistency trigger');

    // --- TEST 9 & 10: Authorized role (Receptionist) can update operational status ---
    const statusUpdateRes = await queryAsUser(userC_id, `
      UPDATE public.rooms 
      SET status = 'DIRTY', housekeeping_status = 'DIRTY'
      WHERE id = '${roomA1_id}'
      RETURNING id, status, housekeeping_status;
    `);
    assert(statusUpdateRes.length === 1 && statusUpdateRes[0].status === 'DIRTY', 
      'Test 10: Authorized role (Receptionist) can update operational status (to DIRTY)');

    // --- TEST 11: Soft deactivation behaves correctly ---
    await client.query(`
      UPDATE public.rooms SET is_active = false WHERE id = '${roomA2_id}';
    `);
    const activeRooms = await client.query(`
      SELECT count(*) FROM public.rooms WHERE property_id = '${propA_id}' AND is_active = true;
    `);
    assert(parseInt(activeRooms.rows[0].count) === 1, 'Test 11: Deactivated room is excluded from active inventory count (1 active remains)');

    // --- TEST 12: Real room statistics match database counts ---
    const statsRes = await client.query(`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE status = 'AVAILABLE' AND is_active = true) as available,
        count(*) FILTER (WHERE status = 'DIRTY' AND is_active = true) as dirty,
        count(*) FILTER (WHERE is_active = false) as inactive
      FROM public.rooms
      WHERE property_id = '${propA_id}';
    `);
    const stats = statsRes.rows[0];
    assert(parseInt(stats.total) === 2 && parseInt(stats.dirty) === 1 && parseInt(stats.inactive) === 1,
      'Test 12: Room statistics accurately reflect real database records (Total: 2, Dirty: 1, Inactive: 1)');

    // --- TEST 13: Property switching isolates inventory ---
    const propBRooms = await client.query(`
      SELECT count(*) FROM public.rooms WHERE property_id = '${propB_id}';
    `);
    assert(parseInt(propBRooms.rows[0].count) === 0, 'Test 13: Property B has independent room inventory (0 rooms)');

    // --- TEST 14: RLS blocks cross-tenant update ---
    let crossUpdateBlocked = false;
    const crossUpdate = await queryAsUser(userB_id, `
      UPDATE public.rooms SET status = 'AVAILABLE' WHERE id = '${roomA1_id}' RETURNING id;
    `);
    assert(crossUpdate.length === 0, 'Test 14: User B cannot modify Hotel Alpha room status (0 rows updated by RLS)');

  } finally {
    console.log('\n--- Cleaning up test records ---');
    if (propA_id) await client.query(`DELETE FROM public.properties WHERE id = '${propA_id}';`);
    if (propB_id) await client.query(`DELETE FROM public.properties WHERE id = '${propB_id}';`);
    if (orgA_id) await client.query(`DELETE FROM public.organizations WHERE id = '${orgA_id}';`);
    if (orgB_id) await client.query(`DELETE FROM public.organizations WHERE id = '${orgB_id}';`);
    await client.query(`DELETE FROM auth.users WHERE id IN ('${userA_id}', '${userB_id}', '${userC_id}', '${userD_id}');`);
  }

  await client.end();

  console.log('\n===========================================================');
  console.log(`ROOM SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testRoomsSuite().catch((err) => {
  console.error('Room test suite failed:', err);
  process.exit(1);
});
