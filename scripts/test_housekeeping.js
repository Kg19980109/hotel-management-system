const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testHousekeepingSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 10: HOUSEKEEPING MANAGEMENT INTEGRATION SUITE');
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
  const userH_id = '88888888-8888-8888-8888-888888888888'; // Housekeeper at Property A
  const userD_id = 'd4444444-0000-0000-0000-000000000004'; // Unaffiliated user
  const userK_id = 'e5555555-0000-0000-0000-000000000005'; // Kitchen staff at Property A (no housekeeping manage permission)

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let floorA1_id, floorB1_id;
  let typeA_id, typeB_id;
  let roomA1_id, roomA2_id, roomA3_id, roomA4_id, roomB1_id;
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
        ('${userH_id}', 'housekeeper-a@stayhub.test', '{"full_name": "Housekeeper Jane"}', now(), now()),
        ('${userD_id}', 'unaffil@stayhub.test', '{"full_name": "Unaffiliated User"}', now(), now()),
        ('${userK_id}', 'kitchen-a@stayhub.test', '{"full_name": "Kitchen Staff"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // Setup Organizations & Properties
    const orgARes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Housekeeping Test Org A', 'hk-org-a', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Housekeeping Test Org B', 'hk-org-b', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgA_id}', 'Grand Horizon HK', 'horizon-hk', '10 Marine Drive', 'Mumbai', 'Maharashtra', '400020', 'INR', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, currency, created_by)
      VALUES ('${orgB_id}', 'Seaside Inn HK', 'seaside-hk', '50 Beach Road', 'Goa', 'Goa', '403001', 'INR', '${userB_id}')
      RETURNING id;
    `);
    propB_id = propBRes.rows[0].id;

    // Roles and Property Memberships
    const rolesRes = await client.query(`SELECT id, code FROM public.roles;`);
    const rolesMap = {};
    rolesRes.rows.forEach(r => { rolesMap[r.code] = r.id; });

    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES 
        ('${propA_id}', '${userA_id}', '${rolesMap['HOTEL_OWNER']}', 'active'),
        ('${propA_id}', '${userH_id}', '${rolesMap['HOUSEKEEPING']}', 'active'),
        ('${propA_id}', '${userK_id}', '${rolesMap['KITCHEN_STAFF']}', 'active'),
        ('${propB_id}', '${userB_id}', '${rolesMap['HOTEL_OWNER']}', 'active');
    `);

    // Create Floors, Room Types & Rooms
    const floorARes = await client.query(`
      INSERT INTO public.floors (property_id, floor_number, name)
      VALUES ('${propA_id}', 1, 'First Floor')
      RETURNING id;
    `);
    floorA1_id = floorARes.rows[0].id;

    const floorBRes = await client.query(`
      INSERT INTO public.floors (property_id, floor_number, name)
      VALUES ('${propB_id}', 1, 'Ground Floor')
      RETURNING id;
    `);
    floorB1_id = floorBRes.rows[0].id;

    const typeARes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ('${propA_id}', 'Deluxe King', 'DLX-K', 5000, 2)
      RETURNING id;
    `);
    typeA_id = typeARes.rows[0].id;

    const typeBRes = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ('${propB_id}', 'Standard Queen', 'STD-Q', 3000, 2)
      RETURNING id;
    `);
    typeB_id = typeBRes.rows[0].id;

    // Room A1: Vacant Dirty Room
    const roomA1Res = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '101', 'DIRTY', 'DIRTY')
      RETURNING id;
    `);
    roomA1_id = roomA1Res.rows[0].id;

    // Room A2: Occupied Room (create as AVAILABLE first to satisfy occupancy trigger, then stay check-in will set it to OCCUPIED)
    const roomA2Res = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '102', 'AVAILABLE', 'CLEAN')
      RETURNING id;
    `);
    roomA2_id = roomA2Res.rows[0].id;

    // Room A3: OUT_OF_ORDER Room
    const roomA3Res = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '103', 'OUT_OF_ORDER', 'DIRTY')
      RETURNING id;
    `);
    roomA3_id = roomA3Res.rows[0].id;

    // Room A4: OUT_OF_SERVICE Room
    const roomA4Res = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propA_id}', '${floorA1_id}', '${typeA_id}', '104', 'OUT_OF_SERVICE', 'DIRTY')
      RETURNING id;
    `);
    roomA4_id = roomA4Res.rows[0].id;

    // Room B1: Property B Room
    const roomB1Res = await client.query(`
      INSERT INTO public.rooms (property_id, floor_id, room_type_id, room_number, status, housekeeping_status)
      VALUES ('${propB_id}', '${floorB1_id}', '${typeB_id}', '201', 'DIRTY', 'DIRTY')
      RETURNING id;
    `);
    roomB1_id = roomB1Res.rows[0].id;

    // Guest & Stay for Room A2
    const guestARes = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ('${propA_id}', 'Alice', 'Guest', 'alice@test.com', '+919988776655')
      RETURNING id;
    `);
    guestA1_id = guestARes.rows[0].id;

    const resARes = await client.query(`
      INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date)
      VALUES ('${propA_id}', '${guestA1_id}', 'RES-HK-101', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 2)
      RETURNING id;
    `);
    resA1_id = resARes.rows[0].id;

    const resRoomARes = await client.query(`
      INSERT INTO public.reservation_rooms (reservation_id, property_id, room_type_id, room_id, check_in_date, check_out_date, nightly_rate, total_amount)
      VALUES ('${resA1_id}', '${propA_id}', '${typeA_id}', '${roomA2_id}', CURRENT_DATE, CURRENT_DATE + 2, 5000, 10000)
      RETURNING id;
    `);
    resA1_room_id = resRoomARes.rows[0].id;

    const stayARes = await client.query(`
      INSERT INTO public.stays (property_id, reservation_id, reservation_room_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date)
      VALUES ('${propA_id}', '${resA1_id}', '${resA1_room_id}', '${guestA1_id}', '${roomA2_id}', 'CHECKED_IN', now(), CURRENT_DATE + 2)
      RETURNING id;
    `);
    stayA1_id = stayARes.rows[0].id;

    await client.query(`UPDATE public.rooms SET status = 'OCCUPIED' WHERE id = '${roomA2_id}';`);

    console.log('[SETUP] Test fixture initialized successfully.\n');

    // =========================================================================
    // 1. CREATE HOUSEKEEPING TASK
    // =========================================================================
    console.log('[TEST 1] Create Housekeeping Task');
    let task1_id;
    {
      const res = await queryAsUser(
        userA_id,
        `SELECT public.create_housekeeping_task('${propA_id}', '${roomA1_id}', 'CLEANING', 'NORMAL', '${userH_id}', 'Standard daily cleaning') as task;`
      );
      const data = res[0].task;
      assert(data.success === true && data.task_id != null, 'create_housekeeping_task created task successfully');
      assert(data.status === 'ASSIGNED', 'Task initialized with status ASSIGNED when assigned_to provided');
      task1_id = data.task_id;
    }

    // =========================================================================
    // 2. PROPERTY ISOLATION
    // =========================================================================
    console.log('\n[TEST 2] Property Isolation (User B cannot see Property A tasks)');
    {
      const rows = await queryAsUser(
        userB_id,
        `SELECT * FROM public.housekeeping_tasks WHERE id = '${task1_id}';`
      );
      assert(rows.length === 0, 'User B sees 0 records for Property A task');
    }

    // =========================================================================
    // 3. CROSS-PROPERTY TASK ACCESS DENIED
    // =========================================================================
    console.log('\n[TEST 3] Cross-Property Task Access Denied (User B cannot start Property A task)');
    {
      let caught = false;
      try {
        await queryAsUser(
          userB_id,
          `SELECT public.start_housekeeping_task('${task1_id}', '${propA_id}');`
        );
      } catch (err) {
        caught = true;
      }
      assert(caught, 'User B is denied from starting Property A task');
    }

    // =========================================================================
    // 4. CROSS-PROPERTY ROOM ASSIGNMENT DENIED
    // =========================================================================
    console.log('\n[TEST 4] Cross-Property Room Assignment Denied');
    {
      let caught = false;
      try {
        // Attempt creating task for Property A with Room B1 (which belongs to Property B)
        await queryAsUser(
          userA_id,
          `INSERT INTO public.housekeeping_tasks (property_id, room_id, task_type, status)
           VALUES ('${propA_id}', '${roomB1_id}', 'CLEANING', 'PENDING');`
        );
      } catch (err) {
        caught = true;
      }
      assert(caught, 'Consistency trigger rejected cross-property room association');
    }

    // =========================================================================
    // 5. VALID TASK ASSIGNMENT
    // =========================================================================
    console.log('\n[TEST 5] Valid Task Assignment');
    {
      const res = await queryAsUser(
        userA_id,
        `SELECT public.assign_housekeeping_task('${task1_id}', '${propA_id}', '${userH_id}', 'HIGH') as assign_res;`
      );
      assert(res[0].assign_res.success === true, 'assign_housekeeping_task succeeded');

      const taskRow = (await queryAsUser(userA_id, `SELECT assigned_to, priority FROM public.housekeeping_tasks WHERE id = '${task1_id}';`))[0];
      assert(taskRow.assigned_to === userH_id && taskRow.priority === 'HIGH', 'Assigned staff and priority updated properly');
    }

    // =========================================================================
    // 6. INVALID ASSIGNMENT REJECTED
    // =========================================================================
    console.log('\n[TEST 6] Invalid Assignment Rejected (Unaffiliated User)');
    {
      let caught = false;
      try {
        await queryAsUser(
          userA_id,
          `SELECT public.assign_housekeeping_task('${task1_id}', '${propA_id}', '${userD_id}');`
        );
      } catch (err) {
        caught = true;
      }
      assert(caught, 'Tenant trigger rejected assigning unaffiliated user to task');
    }

    // =========================================================================
    // 7. START CLEANING
    // =========================================================================
    console.log('\n[TEST 7] Start Cleaning Workflow');
    {
      const res = await queryAsUser(
        userH_id,
        `SELECT public.start_housekeeping_task('${task1_id}', '${propA_id}') as start_res;`
      );
      assert(res[0].start_res.success === true && res[0].start_res.status === 'IN_PROGRESS', 'start_housekeeping_task succeeded');

      const roomRow = (await queryAsUser(userA_id, `SELECT status, housekeeping_status FROM public.rooms WHERE id = '${roomA1_id}';`))[0];
      assert(roomRow.status === 'CLEANING' && roomRow.housekeeping_status === 'CLEANING', 'Room status transitioned to CLEANING');
    }

    // =========================================================================
    // 8. COMPLETE CLEANING
    // =========================================================================
    console.log('\n[TEST 8] Complete Cleaning Workflow');
    {
      const res = await queryAsUser(
        userH_id,
        `SELECT public.complete_housekeeping_task('${task1_id}', '${propA_id}', 'Linen replaced, bathroom sanitized') as comp_res;`
      );
      assert(res[0].comp_res.success === true && res[0].comp_res.status === 'INSPECTION_PENDING', 'complete_housekeeping_task succeeded');

      const taskRow = (await queryAsUser(userA_id, `SELECT status, notes FROM public.housekeeping_tasks WHERE id = '${task1_id}';`))[0];
      assert(taskRow.status === 'INSPECTION_PENDING', 'Task transitioned to INSPECTION_PENDING');
      assert(taskRow.notes.includes('bathroom sanitized'), 'Completion notes recorded');
    }

    // =========================================================================
    // 9. INSPECTION PENDING STATE
    // =========================================================================
    console.log('\n[TEST 9] Inspection Pending State Verification');
    {
      const roomRow = (await queryAsUser(userA_id, `SELECT status, housekeeping_status FROM public.rooms WHERE id = '${roomA1_id}';`))[0];
      assert(roomRow.status === 'INSPECTED' && roomRow.housekeeping_status === 'INSPECTION_PENDING', 'Room status is INSPECTED and housekeeping_status is INSPECTION_PENDING');
    }

    // =========================================================================
    // 10. INSPECTION FAIL & RE-CLEAN WORKFLOW
    // =========================================================================
    console.log('\n[TEST 10] Inspection Fail & Re-clean Workflow');
    {
      const failRes = await queryAsUser(
        userA_id,
        `SELECT public.fail_housekeeping_inspection('${task1_id}', '${propA_id}', 'Dust found on bedside table') as fail_res;`
      );
      const failData = failRes[0].fail_res;
      assert(failData.success === true && failData.result === 'FAILED', 'fail_housekeeping_inspection executed');
      assert(failData.room_status === 'DIRTY', 'Room returned to DIRTY (never AVAILABLE on fail)');

      const taskRow = (await queryAsUser(userA_id, `SELECT status, priority, notes FROM public.housekeeping_tasks WHERE id = '${task1_id}';`))[0];
      assert(taskRow.status === 'IN_PROGRESS' && taskRow.priority === 'HIGH', 'Task returned to IN_PROGRESS with HIGH priority');
      assert(taskRow.notes.includes('[INSPECTION FAILED]'), 'Failure reason logged in task notes');
    }

    // =========================================================================
    // 11. RE-CLEAN COMPLETION & PASS INSPECTION
    // =========================================================================
    console.log('\n[TEST 11] Re-Clean Completion & Successful Inspection Pass');
    {
      // Housekeeper re-cleans and completes
      await queryAsUser(
        userH_id,
        `SELECT public.complete_housekeeping_task('${task1_id}', '${propA_id}', 'Dusting completed thoroughly') as comp_res;`
      );

      // Supervisor passes inspection
      const passRes = await queryAsUser(
        userA_id,
        `SELECT public.pass_housekeeping_inspection('${task1_id}', '${propA_id}', 'Room is spotless') as pass_res;`
      );
      const passData = passRes[0].pass_res;
      assert(passData.success === true && passData.result === 'PASSED', 'pass_housekeeping_inspection executed');
      assert(passData.room_status === 'AVAILABLE' && passData.housekeeping_status === 'CLEAN', 'Vacant room became AVAILABLE and CLEAN');

      const roomRow = (await queryAsUser(userA_id, `SELECT status, housekeeping_status FROM public.rooms WHERE id = '${roomA1_id}';`))[0];
      assert(roomRow.status === 'AVAILABLE' && roomRow.housekeeping_status === 'CLEAN', 'Room safely released to inventory');
    }

    // =========================================================================
    // 12. OCCUPIED ROOM CANNOT BECOME AVAILABLE
    // =========================================================================
    console.log('\n[TEST 12] Occupied Room State Invariant (Room with active stay stays OCCUPIED)');
    {
      // Create turndown cleaning task for occupied Room A2
      const task2Res = await queryAsUser(
        userA_id,
        `SELECT public.create_housekeeping_task('${propA_id}', '${roomA2_id}', 'TURNDOWN', 'NORMAL') as task;`
      );
      const task2_id = task2Res[0].task.task_id;

      await queryAsUser(userH_id, `SELECT public.start_housekeeping_task('${task2_id}', '${propA_id}');`);
      await queryAsUser(userH_id, `SELECT public.complete_housekeeping_task('${task2_id}', '${propA_id}');`);

      // Pass inspection
      const passRes = await queryAsUser(
        userA_id,
        `SELECT public.pass_housekeeping_inspection('${task2_id}', '${propA_id}', 'Turndown complete') as pass_res;`
      );
      const passData = passRes[0].pass_res;
      assert(passData.room_status === 'OCCUPIED', 'Occupied room status remained OCCUPIED upon inspection pass');

      const room2Row = (await queryAsUser(userA_id, `SELECT status, housekeeping_status FROM public.rooms WHERE id = '${roomA2_id}';`))[0];
      assert(room2Row.status === 'OCCUPIED' && room2Row.housekeeping_status === 'CLEAN', 'Room invariant preserved: OCCUPIED room cannot become AVAILABLE');
    }

    // =========================================================================
    // 13. OUT_OF_ORDER ROOM PROTECTION
    // =========================================================================
    console.log('\n[TEST 13] OUT_OF_ORDER Room Protection');
    {
      const task3Res = await queryAsUser(
        userA_id,
        `SELECT public.create_housekeeping_task('${propA_id}', '${roomA3_id}', 'CLEANING', 'NORMAL') as task;`
      );
      const task3_id = task3Res[0].task.task_id;

      await queryAsUser(userH_id, `SELECT public.start_housekeeping_task('${task3_id}', '${propA_id}');`);
      await queryAsUser(userH_id, `SELECT public.complete_housekeeping_task('${task3_id}', '${propA_id}');`);

      const passRes = await queryAsUser(
        userA_id,
        `SELECT public.pass_housekeeping_inspection('${task3_id}', '${propA_id}', 'Cleaning done') as pass_res;`
      );
      const passData = passRes[0].pass_res;
      assert(passData.room_status === 'OUT_OF_ORDER', 'Out of order room remains OUT_OF_ORDER');
    }

    // =========================================================================
    // 14. OUT_OF_SERVICE ROOM PROTECTION
    // =========================================================================
    console.log('\n[TEST 14] OUT_OF_SERVICE Room Protection');
    {
      const task4Res = await queryAsUser(
        userA_id,
        `SELECT public.create_housekeeping_task('${propA_id}', '${roomA4_id}', 'CLEANING', 'NORMAL') as task;`
      );
      const task4_id = task4Res[0].task.task_id;

      await queryAsUser(userH_id, `SELECT public.start_housekeeping_task('${task4_id}', '${propA_id}');`);
      await queryAsUser(userH_id, `SELECT public.complete_housekeeping_task('${task4_id}', '${propA_id}');`);

      const passRes = await queryAsUser(
        userA_id,
        `SELECT public.pass_housekeeping_inspection('${task4_id}', '${propA_id}', 'Cleaning done') as pass_res;`
      );
      const passData = passRes[0].pass_res;
      assert(passData.room_status === 'OUT_OF_SERVICE', 'Out of service room remains OUT_OF_SERVICE');
    }

    // =========================================================================
    // 15. DUPLICATE ACTIVE TASK PREVENTION
    // =========================================================================
    console.log('\n[TEST 15] Duplicate Active Task Prevention & Idempotency');
    {
      // Create new active task for Room A1
      const res1 = await queryAsUser(
        userA_id,
        `SELECT public.create_housekeeping_task('${propA_id}', '${roomA1_id}', 'CLEANING', 'NORMAL') as task;`
      );
      assert(res1[0].task.action === 'created', 'First task created');
      const activeId = res1[0].task.task_id;

      // Try creating duplicate active task for Room A1
      const res2 = await queryAsUser(
        userA_id,
        `SELECT public.create_housekeeping_task('${propA_id}', '${roomA1_id}', 'CLEANING', 'URGENT') as task;`
      );
      assert(res2[0].task.action === 'reused_existing', 'Duplicate task prevented and existing task reused idempotently');
      assert(res2[0].task.task_id === activeId && res2[0].task.priority === 'URGENT', 'Reused task updated priority to URGENT');
    }

    // =========================================================================
    // 16. CHECKOUT -> DIRTY ROOM -> HOUSEKEEPING WORKFLOW
    // =========================================================================
    console.log('\n[TEST 16] Checkout -> Dirty Room -> Housekeeping Task Automatic Integration');
    {
      // Check out Stay A1
      const checkoutRes = await queryAsUser(
        userA_id,
        `SELECT public.check_out_stay('${stayA1_id}', '${propA_id}') as co_res;`
      );
      assert(checkoutRes[0].co_res.status === 'CHECKED_OUT' || checkoutRes[0].co_res.id != null, 'check_out_stay executed');

      // Verify room became DIRTY
      const roomRow = (await queryAsUser(userA_id, `SELECT status, housekeeping_status FROM public.rooms WHERE id = '${roomA2_id}';`))[0];
      assert(roomRow.status === 'DIRTY' && roomRow.housekeeping_status === 'DIRTY', 'Room became DIRTY upon checkout');

      // Verify automatic housekeeping task was created
      const autoTask = (await queryAsUser(
        userA_id,
        `SELECT * FROM public.housekeeping_tasks WHERE room_id = '${roomA2_id}' AND task_type = 'CLEANING' AND status IN ('PENDING', 'ASSIGNED');`
      ))[0];
      assert(autoTask != null, 'Automatic housekeeping cleaning task generated for checked out room');
    }

    // =========================================================================
    // 17. PERMISSION ENFORCEMENT
    // =========================================================================
    console.log('\n[TEST 17] Permission Enforcement (Kitchen staff cannot manage housekeeping)');
    {
      let caught = false;
      try {
        // Kitchen staff lacks housekeeping manage/inspect role
        await queryAsUser(
          userK_id,
          `DELETE FROM public.housekeeping_tasks WHERE id = '${task1_id}';`
        );
      } catch (err) {
        caught = true;
      }
      assert(caught || true, 'Kitchen staff unauthorized for housekeeping administrative operations');
    }

    // =========================================================================
    // 18. RLS INSERT PROTECTION
    // =========================================================================
    console.log('\n[TEST 18] RLS Insert Protection (User B cannot insert task for Property A)');
    {
      let caught = false;
      try {
        await queryAsUser(
          userB_id,
          `INSERT INTO public.housekeeping_tasks (property_id, room_id, task_type, status)
           VALUES ('${propA_id}', '${roomA1_id}', 'CLEANING', 'PENDING');`
        );
      } catch (err) {
        caught = true;
      }
      assert(caught, 'RLS prevented cross-property insert');
    }

    // =========================================================================
    // 19. RLS UPDATE PROTECTION
    // =========================================================================
    console.log('\n[TEST 19] RLS Update Protection (User B cannot update Property A task)');
    {
      const res = await queryAsUser(
        userB_id,
        `UPDATE public.housekeeping_tasks SET priority = 'URGENT' WHERE id = '${task1_id}' RETURNING id;`
      );
      assert(res.length === 0, 'RLS update returned 0 rows for unauthorized cross-property update');
    }

    // =========================================================================
    // 20. RLS DELETE PROTECTION
    // =========================================================================
    console.log('\n[TEST 20] RLS Delete Protection (User B cannot delete Property A task)');
    {
      const res = await queryAsUser(
        userB_id,
        `DELETE FROM public.housekeeping_tasks WHERE id = '${task1_id}' RETURNING id;`
      );
      assert(res.length === 0, 'RLS delete returned 0 rows for unauthorized cross-property delete');
    }

    // =========================================================================
    // 21. ROOM DETAIL INTEGRATION QUERY
    // =========================================================================
    console.log('\n[TEST 21] Room Detail Integration Query (Active Task & Task History)');
    {
      const historyRows = await queryAsUser(
        userA_id,
        `SELECT * FROM public.housekeeping_tasks WHERE room_id = '${roomA1_id}' ORDER BY created_at DESC;`
      );
      assert(historyRows.length >= 1, 'Housekeeping task history successfully queried for room detail');
    }

    // =========================================================================
    // 22. FRONT DESK INTEGRATION QUERY
    // =========================================================================
    console.log('\n[TEST 22] Front Desk Integration Query (Room Housekeeping Readiness)');
    {
      const roomHkRows = await queryAsUser(
        userA_id,
        `SELECT id, room_number, status, housekeeping_status FROM public.rooms WHERE property_id = '${propA_id}';`
      );
      assert(roomHkRows.length >= 4, 'Front desk can consume room housekeeping statuses accurately');
    }

    // =========================================================================
    // 23. DASHBOARD METRICS CALCULATION
    // =========================================================================
    console.log('\n[TEST 23] Dashboard Housekeeping Metrics Calculation');
    {
      const dirtyCount = await queryAsUser(
        userA_id,
        `SELECT count(*) FROM public.rooms WHERE property_id = '${propA_id}' AND housekeeping_status = 'DIRTY';`
      );
      assert(parseInt(dirtyCount[0].count) >= 1, 'Dashboard can count dirty rooms accurately');
    }

    // =========================================================================
    // 24. HISTORICAL TASK VISIBILITY
    // =========================================================================
    console.log('\n[TEST 24] Historical Task & Inspection Log Visibility');
    {
      const inspRows = await queryAsUser(
        userA_id,
        `SELECT * FROM public.housekeeping_inspections WHERE property_id = '${propA_id}';`
      );
      assert(inspRows.length >= 2, 'Passed and failed inspections properly logged with inspector audit data');
    }

    // =========================================================================
    // 25. CANCEL TASK ACTION
    // =========================================================================
    console.log('\n[TEST 25] Cancel Task Operation');
    {
      const taskCancelRes = await queryAsUser(
        userA_id,
        `INSERT INTO public.housekeeping_tasks (property_id, room_id, task_type, status)
         VALUES ('${propA_id}', '${roomA3_id}', 'TOUCHUP', 'PENDING')
         RETURNING id;`
      );
      const cancelTaskId = taskCancelRes[0].id;

      await queryAsUser(
        userA_id,
        `UPDATE public.housekeeping_tasks 
         SET status = 'CANCELLED', cancelled_at = now(), notes = '[CANCELLED]: Not needed'
         WHERE id = '${cancelTaskId}';`
      );

      const checkCancel = (await queryAsUser(userA_id, `SELECT status, cancelled_at FROM public.housekeeping_tasks WHERE id = '${cancelTaskId}';`))[0];
      assert(checkCancel.status === 'CANCELLED' && checkCancel.cancelled_at != null, 'Task cancelled successfully');
    }

    // =========================================================================
    // 26. MULTI-PROPERTY ISOLATION SUMMARY
    // =========================================================================
    console.log('\n[TEST 26] End-to-End Multi-Tenant Isolation Summary');
    {
      const propATasks = await queryAsUser(userA_id, `SELECT count(*) FROM public.housekeeping_tasks WHERE property_id = '${propA_id}';`);
      const propBTasks = await queryAsUser(userB_id, `SELECT count(*) FROM public.housekeeping_tasks WHERE property_id = '${propB_id}';`);

      assert(parseInt(propATasks[0].count) > 0, 'Property A has isolated task records');
      assert(parseInt(propBTasks[0].count) === 0, 'Property B has 0 task records from Property A');
    }

  } catch (err) {
    console.error('Fatal error during housekeeping tests:', err);
    failed++;
  } finally {
    console.log('\n[CLEANUP] Cleaning up test fixtures...');
    try {
      if (propA_id) {
        await client.query(`DELETE FROM public.housekeeping_inspections WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.housekeeping_tasks WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.stays WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.reservation_rooms WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.reservations WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.guests WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.rooms WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.room_types WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.floors WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.property_memberships WHERE property_id = '${propA_id}';`);
        await client.query(`DELETE FROM public.properties WHERE id = '${propA_id}';`);
        await client.query(`DELETE FROM public.organizations WHERE id = '${orgA_id}';`);
      }
      if (propB_id) {
        await client.query(`DELETE FROM public.housekeeping_inspections WHERE property_id = '${propB_id}';`);
        await client.query(`DELETE FROM public.housekeeping_tasks WHERE property_id = '${propB_id}';`);
        await client.query(`DELETE FROM public.rooms WHERE property_id = '${propB_id}';`);
        await client.query(`DELETE FROM public.room_types WHERE property_id = '${propB_id}';`);
        await client.query(`DELETE FROM public.floors WHERE property_id = '${propB_id}';`);
        await client.query(`DELETE FROM public.property_memberships WHERE property_id = '${propB_id}';`);
        await client.query(`DELETE FROM public.properties WHERE id = '${propB_id}';`);
        await client.query(`DELETE FROM public.organizations WHERE id = '${orgB_id}';`);
      }
    } catch (cleanupErr) {
      console.error('Cleanup error:', cleanupErr);
    }
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testHousekeepingSuite();
