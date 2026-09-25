const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testMaintenanceSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 11: MAINTENANCE MANAGEMENT INTEGRATION SUITE');
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
  const userM_id = '99999999-9999-9999-9999-999999999999'; // Maintenance Tech at Property A
  const userD_id = 'd4444444-0000-0000-0000-000000000004'; // Unaffiliated user
  const userK_id = 'e5555555-0000-0000-0000-000000000005'; // Kitchen staff at Property A

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let floorA1_id, floorB1_id;
  let typeA_id, typeB_id;
  let roomA1_id, roomA2_id, roomA3_id, roomA4_id, roomB1_id;
  let assetA1_id, assetB1_id;
  let guestA1_id;
  let resA1_id, resA1_room_id;
  let stayA1_id;

  try {
    // 0. Setup Mock Users
    console.log('\n[SETUP] Creating test users & memberships...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'owner-a@stayhub.test', '{"full_name": "Owner A"}', now(), now()),
        ('${userB_id}', 'owner-b@stayhub.test', '{"full_name": "Owner B"}', now(), now()),
        ('${userM_id}', 'tech-a@stayhub.test', '{"full_name": "Tech Mike"}', now(), now()),
        ('${userD_id}', 'unaffil@stayhub.test', '{"full_name": "Unaffiliated User"}', now(), now()),
        ('${userK_id}', 'kitchen-a@stayhub.test', '{"full_name": "Kitchen Staff"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    const timestamp = Date.now();

    // Clean up any residual test data for test users
    await client.query(`DELETE FROM public.properties WHERE slug LIKE 'horizon-maint%' OR slug LIKE 'seaside-maint%';`);
    await client.query(`DELETE FROM public.organizations WHERE slug LIKE 'maint-org-%';`);

    // Setup Organizations & Properties
    const orgARes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Maintenance Test Org A', 'maint-org-a-${timestamp}', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Maintenance Test Org B', 'maint-org-b-${timestamp}', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgA_id}', 'Grand Horizon Maintenance', 'horizon-maint-${timestamp}', '10 Marine Drive', 'Mumbai', 'Maharashtra', '400020', 'INR', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgB_id}', 'Seaside Inn Maintenance', 'seaside-maint-${timestamp}', '50 Beach Road', 'Goa', 'Goa', '403001', 'INR', '${userB_id}')
      RETURNING id;
    `);
    propB_id = propBRes.rows[0].id;

    // Roles and Property Memberships
    const rolesRes = await client.query(`SELECT id, code FROM public.roles;`);
    const rolesMap = {};
    for (const r of rolesRes.rows) {
      rolesMap[r.code] = r.id;
    }

    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES
        ('${propA_id}', '${userA_id}', '${rolesMap['HOTEL_OWNER']}', 'active'),
        ('${propA_id}', '${userM_id}', '${rolesMap['MAINTENANCE']}', 'active'),
        ('${propA_id}', '${userK_id}', '${rolesMap['KITCHEN_STAFF']}', 'active'),
        ('${propB_id}', '${userB_id}', '${rolesMap['HOTEL_OWNER']}', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // Floors, Room Types, Rooms
    const floorARes = await client.query(`
      INSERT INTO public.floors (property_id, floor_number, name)
      VALUES ('${propA_id}', 1, 'Floor 1')
      RETURNING id;
    `);
    floorA1_id = floorARes.rows[0].id;

    const floorBRes = await client.query(`
      INSERT INTO public.floors (property_id, floor_number, name)
      VALUES ('${propB_id}', 1, 'Floor 1')
      RETURNING id;
    `);
    floorB1_id = floorBRes.rows[0].id;

    const typeARes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ('${propA_id}', 'Deluxe King', 'DLX', 4500, 2)
      RETURNING id;
    `);
    typeA_id = typeARes.rows[0].id;

    const typeBRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ('${propB_id}', 'Standard Queen', 'STD', 3000, 2)
      RETURNING id;
    `);
    typeB_id = typeBRes.rows[0].id;

    // Create Rooms in Property A
    const r1 = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '301', 'AVAILABLE', 'CLEAN')
      RETURNING id;
    `);
    roomA1_id = r1.rows[0].id;

    const r2 = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '302', 'AVAILABLE', 'CLEAN')
      RETURNING id;
    `);
    roomA2_id = r2.rows[0].id;

    const r3 = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '303', 'OUT_OF_ORDER', 'CLEAN')
      RETURNING id;
    `);
    roomA3_id = r3.rows[0].id;

    const r4 = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '304', 'OUT_OF_SERVICE', 'CLEAN')
      RETURNING id;
    `);
    roomA4_id = r4.rows[0].id;

    // Room in Property B
    const rb1 = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propB_id}', '${floorB1_id}', '${typeB_id}', '301', 'AVAILABLE', 'CLEAN')
      RETURNING id;
    `);
    roomB1_id = rb1.rows[0].id;

    // Setup Assets in Property A and Property B
    const assetARes = await client.query(`
      INSERT INTO public.maintenance_assets (property_id, name, asset_type, room_id, status)
      VALUES ('${propA_id}', 'Daikin Inverter AC 1.5T', 'HVAC', '${roomA1_id}', 'OPERATIONAL')
      RETURNING id;
    `);
    assetA1_id = assetARes.rows[0].id;

    const assetBRes = await client.query(`
      INSERT INTO public.maintenance_assets (property_id, name, asset_type, room_id, status)
      VALUES ('${propB_id}', 'Carrier AC 1.0T', 'HVAC', '${roomB1_id}', 'OPERATIONAL')
      RETURNING id;
    `);
    assetB1_id = assetBRes.rows[0].id;

    // Setup In-House Stay in Room 302 for occupancy invariant testing
    const gRes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propA_id}', 'Vikram', 'Malhotra', 'vikram@stayhub.test', '+919876543210')
      RETURNING id;
    `);
    guestA1_id = gRes.rows[0].id;

    const resRes = await client.query(`
      INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, check_in_date, check_out_date, status, total_amount)
      VALUES ('${propA_id}', '${guestA1_id}', 'STH-MAINT-${timestamp}', CURRENT_DATE, CURRENT_DATE + 3, 'CONFIRMED', 13500)
      RETURNING id;
    `);
    resA1_id = resRes.rows[0].id;

    const rrRes = await client.query(`
      INSERT INTO public.reservation_rooms (property_id, reservation_id, room_id, room_type_id, check_in_date, check_out_date, nightly_rate, total_amount)
      VALUES ('${propA_id}', '${resA1_id}', '${roomA2_id}', '${typeA_id}', CURRENT_DATE, CURRENT_DATE + 3, 4500, 13500)
      RETURNING id;
    `);
    resA1_room_id = rrRes.rows[0].id;

    const sRes = await client.query(`
      INSERT INTO public.stays (property_id, reservation_id, reservation_room_id, room_id, guest_id, actual_check_in_at, expected_check_out_date, status)
      VALUES ('${propA_id}', '${resA1_id}', '${resA1_room_id}', '${roomA2_id}', '${guestA1_id}', now(), CURRENT_DATE + 3, 'CHECKED_IN')
      RETURNING id;
    `);
    stayA1_id = sRes.rows[0].id;

    // Mark Room 302 OCCUPIED
    await client.query(`UPDATE public.rooms SET status = 'OCCUPIED' WHERE id = '${roomA2_id}';`);

    console.log('[SETUP] Test fixtures initialized successfully.\n');

    // =========================================================================
    // TEST 1: Create Work Order
    // =========================================================================
    console.log('[TEST 1] Create Maintenance Work Order');
    const rpcCreateRes = await client.query(`
      SELECT public.create_maintenance_work_order(
        '${propA_id}',
        'AC not cooling and making loud rattling noise',
        'Guest reported that cooling stopped working at 2 PM',
        'HVAC',
        'HIGH',
        '${roomA1_id}',
        '${assetA1_id}',
        NULL,
        now() + interval '2 hours',
        '${userA_id}'
      ) as result;
    `);
    const wo1_id = rpcCreateRes.rows[0].result.work_order_id;
    assert(wo1_id !== undefined, 'Work order created successfully via RPC');

    const wo1Check = await client.query(`SELECT status, priority, category FROM public.maintenance_work_orders WHERE id = '${wo1_id}';`);
    assert(wo1Check.rows[0].status === 'OPEN' && wo1Check.rows[0].priority === 'HIGH' && wo1Check.rows[0].category === 'HVAC', 'Work order stored with correct initial OPEN status');

    // =========================================================================
    // TEST 2: Property Isolation & RLS Read
    // =========================================================================
    console.log('\n[TEST 2] Property Isolation & RLS Read');
    const propAOrders = await queryAsUser(userA_id, `SELECT * FROM public.maintenance_work_orders WHERE property_id = '${propA_id}';`);
    assert(propAOrders.length >= 1, `User A can read Property A work orders (${propAOrders.length} found)`);

    // =========================================================================
    // TEST 3: Cross-Property Read Denied
    // =========================================================================
    console.log('\n[TEST 3] Cross-Property Read Denied via RLS');
    const crossRead = await queryAsUser(userB_id, `SELECT * FROM public.maintenance_work_orders WHERE property_id = '${propA_id}';`);
    assert(crossRead.length === 0, 'User B querying Property A sees 0 rows under RLS');

    const unaffilRead = await queryAsUser(userD_id, `SELECT * FROM public.maintenance_work_orders;`);
    assert(unaffilRead.length === 0, 'Unaffiliated user sees 0 maintenance records across all properties');

    // =========================================================================
    // TEST 4: Cross-Property Room Assignment Denied by Database Trigger
    // =========================================================================
    console.log('\n[TEST 4] Cross-Property Room Assignment Denied');
    let crossRoomError = false;
    try {
      await client.query(`
        INSERT INTO public.maintenance_work_orders (property_id, room_id, title, category)
        VALUES ('${propA_id}', '${roomB1_id}', 'Invalid cross-property room order', 'PLUMBING');
      `);
    } catch (err) {
      crossRoomError = true;
    }
    assert(crossRoomError, 'Consistency trigger rejected work order referencing Room from Property B');

    // =========================================================================
    // TEST 5: Cross-Property Asset Assignment Denied by Database Trigger
    // =========================================================================
    console.log('\n[TEST 5] Cross-Property Asset Assignment Denied');
    let crossAssetError = false;
    try {
      await client.query(`
        INSERT INTO public.maintenance_work_orders (property_id, asset_id, title, category)
        VALUES ('${propA_id}', '${assetB1_id}', 'Invalid cross-property asset order', 'HVAC');
      `);
    } catch (err) {
      crossAssetError = true;
    }
    assert(crossAssetError, 'Consistency trigger rejected work order referencing Asset from Property B');

    // =========================================================================
    // TEST 6: Same-Property Technician Assignment
    // =========================================================================
    console.log('\n[TEST 6] Valid Same-Property Technician Assignment');
    const assignRes = await client.query(`
      SELECT public.assign_maintenance_work_order(
        '${wo1_id}',
        '${userM_id}',
        now() + interval '1 hour',
        'Please check refrigerant pressure first',
        '${userA_id}'
      ) as result;
    `);
    assert(assignRes.rows[0].result.status === 'ASSIGNED', 'assign_maintenance_work_order transitioned status to ASSIGNED');

    const wo1Assigned = await client.query(`SELECT assigned_to, status FROM public.maintenance_work_orders WHERE id = '${wo1_id}';`);
    assert(wo1Assigned.rows[0].assigned_to === userM_id && wo1Assigned.rows[0].status === 'ASSIGNED', 'Assigned technician and status persisted correctly');

    // =========================================================================
    // TEST 7: Cross-Property Technician Assignment Denied
    // =========================================================================
    console.log('\n[TEST 7] Cross-Property Technician Assignment Denied');
    let crossTechError = false;
    try {
      await client.query(`
        SELECT public.assign_maintenance_work_order(
          '${wo1_id}',
          '${userB_id}',
          now(),
          'Invalid cross-tenant assignment',
          '${userA_id}'
        );
      `);
    } catch (err) {
      crossTechError = true;
    }
    assert(crossTechError, 'Database rejected assigning technician from Property B to Property A work order');

    // =========================================================================
    // TEST 8: Start Maintenance Work (ASSIGNED -> IN_PROGRESS)
    // =========================================================================
    console.log('\n[TEST 8] Start Maintenance Work Order');
    const startRes = await client.query(`
      SELECT public.start_maintenance_work_order(
        '${wo1_id}',
        'Technician began inspection of evaporator unit',
        '${userM_id}'
      ) as result;
    `);
    assert(startRes.rows[0].result.status === 'IN_PROGRESS', 'start_maintenance_work_order transitioned status to IN_PROGRESS');

    const wo1Started = await client.query(`SELECT started_at, status FROM public.maintenance_work_orders WHERE id = '${wo1_id}';`);
    assert(wo1Started.rows[0].started_at !== null && wo1Started.rows[0].status === 'IN_PROGRESS', 'started_at timestamp recorded');

    // =========================================================================
    // TEST 9: Put On Hold (IN_PROGRESS -> ON_HOLD) with Reason
    // =========================================================================
    console.log('\n[TEST 9] Put Work Order On Hold');
    const holdRes = await client.query(`
      SELECT public.hold_maintenance_work_order(
        '${wo1_id}',
        'Waiting for replacement fan motor from warehouse',
        '${userM_id}'
      ) as result;
    `);
    assert(holdRes.rows[0].result.status === 'ON_HOLD', 'hold_maintenance_work_order transitioned status to ON_HOLD');

    // Reject holding without reason
    let emptyHoldError = false;
    try {
      await client.query(`
        SELECT public.hold_maintenance_work_order('${wo1_id}', '', '${userM_id}');
      `);
    } catch {
      emptyHoldError = true;
    }
    assert(emptyHoldError, 'Empty hold reason is rejected');

    // =========================================================================
    // TEST 10: Resume Work Order (ON_HOLD -> IN_PROGRESS)
    // =========================================================================
    console.log('\n[TEST 10] Resume Work Order');
    const resumeRes = await client.query(`
      SELECT public.resume_maintenance_work_order(
        '${wo1_id}',
        'Fan motor arrived, resuming replacement',
        '${userM_id}'
      ) as result;
    `);
    assert(resumeRes.rows[0].result.status === 'IN_PROGRESS', 'resume_maintenance_work_order transitioned status back to IN_PROGRESS');

    // =========================================================================
    // TEST 11: Resolve Work Order (requires resolution notes)
    // =========================================================================
    console.log('\n[TEST 11] Resolve Work Order');
    let emptyResolveError = false;
    try {
      await client.query(`
        SELECT public.resolve_maintenance_work_order('${wo1_id}', '', '${userM_id}');
      `);
    } catch {
      emptyResolveError = true;
    }
    assert(emptyResolveError, 'Resolve without resolution notes is rejected');

    const resolveRes = await client.query(`
      SELECT public.resolve_maintenance_work_order(
        '${wo1_id}',
        'Replaced fan motor, recharged R32 refrigerant, tested cooling to 19C with normal noise level',
        '${userM_id}'
      ) as result;
    `);
    assert(resolveRes.rows[0].result.status === 'RESOLVED', 'resolve_maintenance_work_order successfully marked work order RESOLVED');

    const wo1Resolved = await client.query(`SELECT status, resolved_at, resolution_notes FROM public.maintenance_work_orders WHERE id = '${wo1_id}';`);
    assert(wo1Resolved.rows[0].resolved_at !== null && wo1Resolved.rows[0].resolution_notes.includes('Replaced fan motor'), 'Resolution timestamp and notes saved in database');

    // =========================================================================
    // TEST 12: Close Work Order Administratively (RESOLVED -> CLOSED)
    // =========================================================================
    console.log('\n[TEST 12] Close Work Order Administratively');
    const closeRes = await client.query(`
      SELECT public.close_maintenance_work_order(
        '${wo1_id}',
        'Manager verified repair and closed ticket',
        '${userA_id}'
      ) as result;
    `);
    assert(closeRes.rows[0].result.status === 'CLOSED', 'close_maintenance_work_order transitioned status to CLOSED');

    const wo1Closed = await client.query(`SELECT status, closed_at FROM public.maintenance_work_orders WHERE id = '${wo1_id}';`);
    assert(wo1Closed.rows[0].closed_at !== null && wo1Closed.rows[0].status === 'CLOSED', 'closed_at timestamp recorded');

    // =========================================================================
    // TEST 13: Reopen Closed Work Order
    // =========================================================================
    console.log('\n[TEST 13] Reopen Closed Work Order');
    const reopenRes = await client.query(`
      SELECT public.reopen_maintenance_work_order(
        '${wo1_id}',
        'Thermostat temperature sensor fluctuating again',
        '${userA_id}'
      ) as result;
    `);
    assert(reopenRes.rows[0].result.status === 'OPEN', 'reopen_maintenance_work_order transitioned status back to OPEN');

    // =========================================================================
    // TEST 14: Cancel Work Order
    // =========================================================================
    console.log('\n[TEST 14] Cancel Work Order');
    const cancelRes = await client.query(`
      SELECT public.cancel_maintenance_work_order(
        '${wo1_id}',
        'Duplicate report created by front desk',
        '${userA_id}'
      ) as result;
    `);
    assert(cancelRes.rows[0].result.status === 'CANCELLED', 'cancel_maintenance_work_order transitioned status to CANCELLED');

    // =========================================================================
    // TEST 15: Timeline / Audit Events History
    // =========================================================================
    console.log('\n[TEST 15] Timeline / Audit Events Verification');
    const events = await client.query(`
      SELECT event_type, from_status, to_status, notes 
      FROM public.maintenance_work_order_events 
      WHERE work_order_id = '${wo1_id}' 
      ORDER BY created_at ASC;
    `);
    assert(events.rows.length >= 7, `Audit events captured full state machine history (${events.rows.length} events found)`);
    const eventTypes = events.rows.map(e => e.event_type);
    assert(
      eventTypes.includes('CREATED') &&
      eventTypes.includes('ASSIGNED') &&
      eventTypes.includes('STARTED') &&
      eventTypes.includes('PUT_ON_HOLD') &&
      eventTypes.includes('RESUMED') &&
      eventTypes.includes('RESOLVED') &&
      eventTypes.includes('CLOSED') &&
      eventTypes.includes('REOPENED') &&
      eventTypes.includes('CANCELLED'),
      'All lifecycle transitions recorded in audit event stream'
    );

    // =========================================================================
    // TEST 16: Maintenance Resolution Invariant (Does NOT override Occupied Room)
    // =========================================================================
    console.log('\n[TEST 16] Occupied Room Invariant: Maintenance Resolution NEVER forces AVAILABLE');
    // Create work order for OCCUPIED Room 302
    const occWoRes = await client.query(`
      SELECT public.create_maintenance_work_order(
        '${propA_id}',
        'Lamp bulb replacement in Room 302',
        'In-house guest requested bulb replacement',
        'LIGHTING',
        'NORMAL',
        '${roomA2_id}',
        NULL,
        '${userM_id}',
        now(),
        '${userA_id}'
      ) as result;
    `);
    const occWoId = occWoRes.rows[0].result.work_order_id;

    await client.query(`
      SELECT public.resolve_maintenance_work_order(
        '${occWoId}',
        'Replaced with 12W LED warm bulb',
        '${userM_id}'
      );
    `);

    const occRoom = await client.query(`SELECT status FROM public.rooms WHERE id = '${roomA2_id}';`);
    assert(occRoom.rows[0].status === 'OCCUPIED', 'Occupied room remained OCCUPIED after maintenance resolved (never overwritten to AVAILABLE)');

    // =========================================================================
    // TEST 17: Out-of-Order / Out-of-Service Management Authorization
    // =========================================================================
    console.log('\n[TEST 17] Management Room Status Override Authorization');
    // Hotel Owner can take Room 301 Out of Order
    const oooRes = await client.query(`
      SELECT public.set_room_maintenance_status(
        '${propA_id}',
        '${roomA1_id}',
        'OUT_OF_ORDER',
        'Ceiling tile replacement and painting',
        '${userA_id}'
      ) as result;
    `);
    assert(oooRes.rows[0].result.status === 'OUT_OF_ORDER', 'Authorized Manager set room to OUT_OF_ORDER');

    // Unauthorized staff (Kitchen staff) is blocked
    let unauthOooError = false;
    try {
      await client.query(`
        SELECT public.set_room_maintenance_status(
          '${propA_id}',
          '${roomA1_id}',
          'AVAILABLE',
          'Unauthorized attempt',
          '${userK_id}'
        );
      `);
    } catch {
      unauthOooError = true;
    }
    assert(unauthOooError, 'Unauthorized role (Kitchen staff) blocked from modifying room maintenance status');

    // Restore Room 301 back to DIRTY (requiring housekeeping clean before available)
    const restoreRes = await client.query(`
      SELECT public.set_room_maintenance_status(
        '${propA_id}',
        '${roomA1_id}',
        'DIRTY',
        'Painting finished, needs housekeeping cleaning',
        '${userA_id}'
      ) as result;
    `);
    assert(restoreRes.rows[0].result.status === 'DIRTY', 'Manager safely returned Out of Order room to DIRTY for cleaning workflow');

    // =========================================================================
    // TEST 18: Overdue Calculation
    // =========================================================================
    console.log('\n[TEST 18] Overdue Calculation');
    const overdueWoRes = await client.query(`
      SELECT public.create_maintenance_work_order(
        '${propA_id}',
        'Overdue HVAC filter replacement',
        'Regular filter cleaning',
        'HVAC',
        'LOW',
        '${roomA1_id}',
        NULL,
        NULL,
        now() - interval '2 days',
        '${userA_id}'
      ) as result;
    `);
    const overdueWoId = overdueWoRes.rows[0].result.work_order_id;

    const overdueCheck = await client.query(`
      SELECT scheduled_for < now() as is_overdue 
      FROM public.maintenance_work_orders 
      WHERE id = '${overdueWoId}' AND status NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED');
    `);
    assert(overdueCheck.rows[0].is_overdue === true, 'Past scheduled_for timestamp accurately detected as overdue');

    // =========================================================================
    // TEST 19: Priority Update & Internal Note
    // =========================================================================
    console.log('\n[TEST 19] Priority Update & Internal Note');
    await client.query(`
      SELECT public.update_maintenance_work_order_priority(
        '${overdueWoId}',
        'URGENT',
        'Escalated due to overdue status',
        '${userA_id}'
      );
    `);
    const prioCheck = await client.query(`SELECT priority FROM public.maintenance_work_orders WHERE id = '${overdueWoId}';`);
    assert(prioCheck.rows[0].priority === 'URGENT', 'Priority updated to URGENT');

    await client.query(`
      SELECT public.add_maintenance_work_order_note(
        '${overdueWoId}',
        'Supplier notified for urgent delivery',
        '${userA_id}'
      );
    `);
    const noteEvent = await client.query(`
      SELECT notes FROM public.maintenance_work_order_events 
      WHERE work_order_id = '${overdueWoId}' AND event_type = 'NOTE_ADDED';
    `);
    assert(noteEvent.rows.length >= 1 && noteEvent.rows[0].notes.includes('Supplier notified'), 'Internal note logged into timeline');

    // =========================================================================
    // TEST 20: Preventive Maintenance Schedules
    // =========================================================================
    console.log('\n[TEST 20] Preventive Maintenance Schedule Creation & Query');
    const schedRes = await client.query(`
      INSERT INTO public.maintenance_schedules (
        property_id,
        asset_id,
        room_id,
        title,
        description,
        frequency,
        next_due_at,
        created_by
      ) VALUES (
        '${propA_id}',
        '${assetA1_id}',
        '${roomA1_id}',
        'Monthly AC Deep Clean & Coil Rinse',
        'Perform chemical coil wash and filter replacement',
        'MONTHLY',
        now() + interval '30 days',
        '${userA_id}'
      ) RETURNING id, frequency;
    `);
    assert(schedRes.rows.length === 1 && schedRes.rows[0].frequency === 'MONTHLY', 'Preventive maintenance schedule created with MONTHLY frequency');

    // =========================================================================
    // TEST 21: RLS Insert, Update, Delete Protection
    // =========================================================================
    console.log('\n[TEST 21] RLS Insert, Update, Delete Protection');
    // User B cannot insert into Property A
    let rlsInsertBlocked = false;
    try {
      await queryAsUser(userB_id, `
        INSERT INTO public.maintenance_work_orders (property_id, title, category)
        VALUES ('${propA_id}', 'Illegal Cross Property Order', 'ELECTRICAL');
      `);
    } catch {
      rlsInsertBlocked = true;
    }
    assert(rlsInsertBlocked, 'RLS blocked User B from inserting work order into Property A');

    // User B cannot update Property A work orders
    const rlsUpdate = await queryAsUser(userB_id, `
      UPDATE public.maintenance_work_orders SET description = 'Hacked' WHERE property_id = '${propA_id}' RETURNING id;
    `);
    assert(rlsUpdate.length === 0, 'RLS update returned 0 rows for unauthorized cross-property modification');

    // User B cannot delete Property A work orders
    const rlsDelete = await queryAsUser(userB_id, `
      DELETE FROM public.maintenance_work_orders WHERE property_id = '${propA_id}' RETURNING id;
    `);
    assert(rlsDelete.length === 0, 'RLS delete returned 0 rows for unauthorized cross-property deletion');

    // =========================================================================
    // TEST 22: Clean Separation between Housekeeping & Maintenance
    // =========================================================================
    console.log('\n[TEST 22] Domain Separation: Housekeeping & Maintenance Co-existence');
    // Create housekeeping task for Room 301
    const hkTaskRes = await client.query(`
      SELECT public.create_housekeeping_task(
        '${propA_id}',
        '${roomA1_id}',
        'CLEANING',
        'NORMAL',
        '${userA_id}'
      ) as result;
    `);
    assert(hkTaskRes.rows[0].result.task_id !== undefined, 'Housekeeping task created for Room 301');

    // Room has both a housekeeping task and a maintenance work order
    const hkCheck = await client.query(`SELECT count(*) as count FROM public.housekeeping_tasks WHERE room_id = '${roomA1_id}';`);
    const maintCheck = await client.query(`SELECT count(*) as count FROM public.maintenance_work_orders WHERE room_id = '${roomA1_id}';`);
    assert(parseInt(hkCheck.rows[0].count) >= 1 && parseInt(maintCheck.rows[0].count) >= 1, 'Room 301 maintains distinct housekeeping task and maintenance work order records');

    console.log('\n[CLEANUP] Cleaning up test fixtures...');
    await client.query(`DELETE FROM public.properties WHERE id IN ('${propA_id}', '${propB_id}');`);
    await client.query(`DELETE FROM public.organizations WHERE id IN ('${orgA_id}', '${orgB_id}');`);
    await client.query(`DELETE FROM auth.users WHERE id IN ('${userA_id}', '${userB_id}', '${userM_id}', '${userD_id}', '${userK_id}');`);
    console.log('[CLEANUP] Done.');

  } catch (err) {
    console.error('\n[UNEXPECTED ERROR]:', err);
    failed++;
  } finally {
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`MAINTENANCE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testMaintenanceSuite();
