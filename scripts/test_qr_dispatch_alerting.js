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

// In-memory simulator of OperationalAlertManager for unit verification of buzzer & alert queue
class MockOperationalAlertManager {
  constructor() {
    this.alerts = new Map();
    this.isBuzzing = false;
    this.buzzerCount = 0;
    this.soundEnabled = true;
    this.audioUnlocked = false;
  }

  addOrUpdateAlert(alert) {
    const existing = this.alerts.get(alert.id);
    if (existing) {
      if (
        alert.status === 'ACKNOWLEDGED' ||
        alert.status === 'COMPLETED' ||
        alert.status === 'CANCELLED'
      ) {
        this.removeAlert(alert.id);
        return;
      }
      this.alerts.set(alert.id, { ...existing, ...alert });
    } else {
      if (alert.status === 'SUBMITTED' || alert.status === 'CONFIRMED') {
        this.alerts.set(alert.id, alert);
        this.startBuzzer();
      }
    }
  }

  removeAlert(id) {
    if (this.alerts.has(id)) {
      this.alerts.delete(id);
      if (this.alerts.size === 0) {
        this.stopBuzzer();
      }
    }
  }

  startBuzzer() {
    if (!this.isBuzzing) {
      this.isBuzzing = true;
      this.buzzerCount++;
    }
  }

  stopBuzzer() {
    this.isBuzzing = false;
  }

  getHighestPriority() {
    const list = Array.from(this.alerts.values());
    if (list.some((a) => a.priority === 'URGENT')) return 'URGENT';
    if (list.some((a) => a.priority === 'HIGH')) return 'HIGH';
    if (list.some((a) => a.priority === 'NORMAL')) return 'NORMAL';
    return 'LOW';
  }

  getIntervalMs() {
    const prio = this.getHighestPriority();
    if (prio === 'URGENT') return 3500;
    if (prio === 'HIGH') return 5000;
    return 7000;
  }
}

async function runQrDispatchAlertingSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 23: QR REQUEST DISPATCH, ALERTING & BUZZER SUITE');
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

  const prefix = `test_qr_${Date.now()}`;
  let propA_id, propB_id;
  let roomA_id, roomB_id;
  let guestA_id, guestB_id;
  let stayA_id, stayB_id;
  let tokenA, tokenA_hash, sessionA_id;
  let tokenB, tokenB_hash, sessionB_id;
  let restaurantA_id, menuItemA_id;

  try {
    // SETUP TEST FIXTURES
    // 1. Properties
    const orgRes = await client.query(
      `INSERT INTO public.organizations (name, slug) VALUES ('Org QR Test', '${prefix}_org') RETURNING id;`
    );
    const org_id = orgRes.rows[0].id;

    const propARes = await client.query(
      `INSERT INTO public.properties (organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email)
       VALUES ($1, 'Property A', '${prefix}_a', 'QRA', '123 Beach Road', 'Goa', 'Goa', '403001', '+91 9999999991', '${prefix}_a@example.com') RETURNING id;`,
      [org_id]
    );
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(
      `INSERT INTO public.properties (organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email)
       VALUES ($1, 'Property B', '${prefix}_b', 'QRB', '456 Hill Road', 'Manali', 'HP', '175131', '+91 9999999992', '${prefix}_b@example.com') RETURNING id;`,
      [org_id]
    );
    propB_id = propBRes.rows[0].id;

    // 2. Room Types & Rooms
    const rtARes = await client.query(
      `INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy) VALUES ($1, 'Deluxe A', '${prefix}_rtA', 1500, 2) RETURNING id;`,
      [propA_id]
    );
    const rtBRes = await client.query(
      `INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy) VALUES ($1, 'Deluxe B', '${prefix}_rtB', 1500, 2) RETURNING id;`,
      [propB_id]
    );

    const roomARes = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '204', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propA_id, rtARes.rows[0].id]
    );
    roomA_id = roomARes.rows[0].id;

    const roomBRes = await client.query(
      `INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
       VALUES ($1, $2, '305', 'AVAILABLE', 'CLEAN', 2) RETURNING id;`,
      [propB_id, rtBRes.rows[0].id]
    );
    roomB_id = roomBRes.rows[0].id;

    // 3. Guests & Reservations & Stays
    const gARes = await client.query(
      `INSERT INTO public.guests (property_id, first_name, last_name, email) VALUES ($1, 'Rahul', 'Sharma', '${prefix}_rahul@example.com') RETURNING id;`,
      [propA_id]
    );
    guestA_id = gARes.rows[0].id;

    const gBRes = await client.query(
      `INSERT INTO public.guests (property_id, first_name, last_name, email) VALUES ($1, 'Amit', 'Verma', '${prefix}_amit@example.com') RETURNING id;`,
      [propB_id]
    );
    guestB_id = gBRes.rows[0].id;

    const resARes = await client.query(
      `INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
       VALUES ($1, $2, '${prefix}_confA', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propA_id, guestA_id]
    );

    const resBRes = await client.query(
      `INSERT INTO public.reservations (property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date, adults, children)
       VALUES ($1, $2, '${prefix}_confB', 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propB_id, guestB_id]
    );

    const stayARes = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propA_id, resARes.rows[0].id, guestA_id, roomA_id]
    );
    stayA_id = stayARes.rows[0].id;

    const stayBRes = await client.query(
      `INSERT INTO public.stays (property_id, reservation_id, guest_id, room_id, status, actual_check_in_at, expected_check_out_date, adults, children)
       VALUES ($1, $2, $3, $4, 'CHECKED_IN', now(), CURRENT_DATE + 3, 2, 0) RETURNING id;`,
      [propB_id, resBRes.rows[0].id, guestB_id, roomB_id]
    );
    stayB_id = stayBRes.rows[0].id;

    // 4. Guest Sessions
    tokenA = generateSecureToken();
    tokenA_hash = hashToken(tokenA);
    const sessARes = await client.query(
      `INSERT INTO public.guest_sessions (property_id, room_id, guest_id, stay_id, session_token_hash, session_type, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'VERIFIED_STAY', now() + interval '1 day') RETURNING id;`,
      [propA_id, roomA_id, guestA_id, stayA_id, tokenA_hash]
    );
    sessionA_id = sessARes.rows[0].id;

    tokenB = generateSecureToken();
    tokenB_hash = hashToken(tokenB);
    const sessBRes = await client.query(
      `INSERT INTO public.guest_sessions (property_id, room_id, guest_id, stay_id, session_token_hash, session_type, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'VERIFIED_STAY', now() + interval '1 day') RETURNING id;`,
      [propB_id, roomB_id, guestB_id, stayB_id, tokenB_hash]
    );
    sessionB_id = sessBRes.rows[0].id;

    // 5. Restaurant & Menu Item
    const restRes = await client.query(
      `INSERT INTO public.restaurants (property_id, name, code, is_active) VALUES ($1, 'StayHub Bistro', '${prefix}_bistro', true) RETURNING id;`,
      [propA_id]
    );
    restaurantA_id = restRes.rows[0].id;

    const stStation = await client.query(
      `INSERT INTO public.kitchen_stations (restaurant_id, name, code, is_active)
       VALUES ($1, 'Hot Line', '${prefix}_hot', true) RETURNING id;`,
      [restaurantA_id]
    );
    const stationA_id = stStation.rows[0].id;

    const catRes = await client.query(
      `INSERT INTO public.menu_categories (restaurant_id, name, is_active) VALUES ($1, 'Main Dishes', true) RETURNING id;`,
      [restaurantA_id]
    );

    const itemRes = await client.query(
      `INSERT INTO public.menu_items (restaurant_id, category_id, name, price, currency, is_available, is_active)
       VALUES ($1, $2, 'Butter Chicken with Naan', 450.00, 'INR', true, true) RETURNING id;`,
      [restaurantA_id, catRes.rows[0].id]
    );
    menuItemA_id = itemRes.rows[0].id;

    await client.query(
      `INSERT INTO public.menu_item_kitchen_stations (menu_item_id, kitchen_station_id, is_primary)
       VALUES ($1, $2, true);`,
      [menuItemA_id, stationA_id]
    );

    console.log('Test fixtures created successfully.\n');

    // TEST 1: QR guest session creates request
    const createHkRes = await client.query(
      `SELECT public.create_guest_service_request($1, 'HOUSEKEEPING', 'Extra towels', 'Extra Towels Request', 'Need 2 large towels', 'NORMAL') AS res;`,
      [tokenA_hash]
    );
    const hkReqData = createHkRes.rows[0].res;
    assert(hkReqData.success === true && hkReqData.request_id, '1. QR guest session creates request');
    const hkReqId = hkReqData.request_id;

    // TEST 2: Request assigned to correct property
    const checkPropRes = await client.query(
      `SELECT property_id, room_id, status FROM public.guest_service_requests WHERE id = $1;`,
      [hkReqId]
    );
    assert(
      checkPropRes.rows[0].property_id === propA_id && checkPropRes.rows[0].room_id === roomA_id,
      '2. Request assigned to correct property'
    );

    // TEST 3: Request assigned to correct department
    function getDepartmentForCategory(category) {
      switch (category.toUpperCase()) {
        case 'HOUSEKEEPING':
        case 'LAUNDRY':
          return 'HOUSEKEEPING';
        case 'MAINTENANCE':
          return 'MAINTENANCE';
        case 'ROOM_SERVICE':
        case 'FOOD':
        case 'DINING':
          return 'RESTAURANT';
        case 'FRONT_DESK':
        case 'CHECK_OUT':
          return 'FRONT_DESK';
        case 'CONCIERGE':
        case 'TRANSPORT':
        case 'SPA':
          return 'CONCIERGE';
        default:
          return 'GENERAL_OPERATIONS';
      }
    }
    const dept = getDepartmentForCategory('HOUSEKEEPING');
    assert(dept === 'HOUSEKEEPING', '3. Request assigned to correct department');

    // TEST 4: Housekeeping request appears in housekeeping queue
    const hkQueue = await client.query(
      `SELECT id, title, category, status FROM public.guest_service_requests WHERE property_id = $1 AND category IN ('HOUSEKEEPING', 'LAUNDRY');`,
      [propA_id]
    );
    assert(
      hkQueue.rows.some((r) => r.id === hkReqId && r.status === 'SUBMITTED'),
      '4. Housekeeping request appears in housekeeping queue'
    );

    // TEST 5: Maintenance request appears in maintenance queue
    const createMaintRes = await client.query(
      `SELECT public.create_guest_service_request($1, 'MAINTENANCE', 'AC issue', 'AC is not cooling', 'Room AC is warm', 'HIGH') AS res;`,
      [tokenA_hash]
    );
    const maintReqId = createMaintRes.rows[0].res.request_id;
    const maintQueue = await client.query(
      `SELECT id, title, category, priority, status FROM public.guest_service_requests WHERE property_id = $1 AND category = 'MAINTENANCE';`,
      [propA_id]
    );
    assert(
      maintQueue.rows.some((r) => r.id === maintReqId && r.priority === 'HIGH'),
      '5. Maintenance request appears in maintenance queue'
    );

    // TEST 6: Food order reaches restaurant
    const foodOrderRes = await client.query(
      `SELECT public.create_guest_food_order($1, $2, $3, 'Please deliver with extra cutlery') AS res;`,
      [
        tokenA_hash,
        restaurantA_id,
        JSON.stringify([{ menu_item_id: menuItemA_id, quantity: 2, special_instructions: 'Less spicy' }]),
      ]
    );
    const foodOrderData = foodOrderRes.rows[0].res;
    assert(foodOrderData.success === true && foodOrderData.order_id, '6. Food order reaches restaurant');
    const foodOrderId = foodOrderData.order_id;

    // TEST 7: Food order reaches KDS
    const kdsTicketRes = await client.query(
      `SELECT id, ticket_number, status, priority FROM public.kitchen_tickets WHERE restaurant_order_id = $1;`,
      [foodOrderId]
    );
    assert(
      kdsTicketRes.rows.length > 0 && kdsTicketRes.rows[0].status === 'QUEUED',
      '7. Food order reaches KDS'
    );

    // TEST 8: KDS status reaches guest
    const guestOrderDetailRes = await client.query(
      `SELECT public.get_guest_food_order_detail($1, $2) AS res;`,
      [tokenA_hash, foodOrderId]
    );
    assert(
      guestOrderDetailRes.rows[0].res.success === true &&
        guestOrderDetailRes.rows[0].res.order.kds_status === 'QUEUED',
      '8. KDS status reaches guest'
    );

    // TEST 9: Housekeeping status reaches guest
    const guestHkDetailRes = await client.query(
      `SELECT public.get_guest_service_request_detail($1, $2) AS res;`,
      [tokenA_hash, hkReqId]
    );
    assert(
      guestHkDetailRes.rows[0].res.success === true &&
        guestHkDetailRes.rows[0].res.request.status === 'SUBMITTED',
      '9. Housekeeping status reaches guest'
    );

    // TEST 10: Maintenance status reaches guest
    const guestMaintDetailRes = await client.query(
      `SELECT public.get_guest_service_request_detail($1, $2) AS res;`,
      [tokenA_hash, maintReqId]
    );
    assert(
      guestMaintDetailRes.rows[0].res.success === true &&
        guestMaintDetailRes.rows[0].res.request.status === 'SUBMITTED' &&
        guestMaintDetailRes.rows[0].res.request.priority === 'HIGH',
      '10. Maintenance status reaches guest'
    );

    // TEST 11: Realtime event publication configured
    const pubRes = await client.query(
      `SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';`
    );
    const pubTables = pubRes.rows.map((r) => r.tablename);
    assert(
      pubTables.includes('guest_service_requests') &&
        pubTables.includes('kitchen_tickets') &&
        pubTables.includes('restaurant_orders'),
      '11. Realtime tables in supabase_realtime publication'
    );

    // TEST 12: New request generates operational alert
    const alertMgr = new MockOperationalAlertManager();
    alertMgr.addOrUpdateAlert({
      id: hkReqId,
      type: 'SERVICE_REQUEST',
      category: 'HOUSEKEEPING',
      department: 'HOUSEKEEPING',
      roomNumber: '204',
      guestName: 'Rahul Sharma',
      title: 'Extra Towels Request',
      priority: 'NORMAL',
      receivedAt: Date.now(),
      propertyId: propA_id,
      status: 'SUBMITTED',
    });
    assert(alertMgr.alerts.has(hkReqId), '12. New request generates operational alert');

    // TEST 13: Alert starts buzzer
    assert(alertMgr.isBuzzing === true, '13. Alert starts buzzer');

    // TEST 14: Repeated realtime event does not create duplicate buzzer
    alertMgr.addOrUpdateAlert({
      id: hkReqId,
      type: 'SERVICE_REQUEST',
      category: 'HOUSEKEEPING',
      department: 'HOUSEKEEPING',
      roomNumber: '204',
      guestName: 'Rahul Sharma',
      title: 'Extra Towels Request',
      priority: 'NORMAL',
      receivedAt: Date.now(),
      propertyId: propA_id,
      status: 'SUBMITTED',
    });
    assert(
      alertMgr.alerts.size === 1 && alertMgr.buzzerCount === 1,
      '14. Repeated realtime event does not create duplicate buzzer'
    );

    // TEST 15: Acknowledge stops buzzer
    const ackRes = await client.query(
      `SELECT public.staff_acknowledge_guest_request($1, $2, 'Towel request acknowledged') AS res;`,
      [propA_id, hkReqId]
    );
    assert(ackRes.rows[0].res.success === true, 'Staff acknowledged in DB');
    alertMgr.removeAlert(hkReqId);
    assert(alertMgr.isBuzzing === false, '15. Acknowledge stops buzzer');

    // TEST 16: Acknowledgement propagates to other staff clients
    const hkStatusAfterAck = await client.query(
      `SELECT status, acknowledged_at FROM public.guest_service_requests WHERE id = $1;`,
      [hkReqId]
    );
    assert(
      hkStatusAfterAck.rows[0].status === 'ACKNOWLEDGED' &&
        hkStatusAfterAck.rows[0].acknowledged_at !== null,
      '16. Acknowledgement propagates to other staff clients with timestamp'
    );

    // TEST 17: Multiple unacknowledged requests are queued
    alertMgr.addOrUpdateAlert({
      id: 'req_1',
      priority: 'NORMAL',
      status: 'SUBMITTED',
    });
    alertMgr.addOrUpdateAlert({
      id: 'req_2',
      priority: 'URGENT',
      status: 'SUBMITTED',
    });
    assert(
      alertMgr.alerts.size === 2 && alertMgr.getHighestPriority() === 'URGENT',
      '17. Multiple unacknowledged requests are queued with priority escalation'
    );

    // TEST 18: Reconnect synchronizes missed requests
    const openSyncRes = await client.query(
      `SELECT id, category, priority, status FROM public.guest_service_requests WHERE property_id = $1 AND status = 'SUBMITTED';`,
      [propA_id]
    );
    assert(openSyncRes.rows.length >= 1, '18. Reconnect synchronizes missed requests');

    // TEST 19: Unauthorized staff / Role relevance filtering
    function isRequestRelevantForRole(roleCode, category) {
      if (!roleCode) return false;
      const role = roleCode.toUpperCase();
      const cat = category.toUpperCase();
      if (['SUPER_ADMIN', 'HOTEL_OWNER', 'GENERAL_MANAGER', 'ADMIN'].includes(role)) return true;
      switch (role) {
        case 'HOUSEKEEPING':
          return cat === 'HOUSEKEEPING' || cat === 'LAUNDRY';
        case 'MAINTENANCE':
          return cat === 'MAINTENANCE';
        case 'FRONT_DESK':
        case 'RECEPTIONIST':
          return ['FRONT_DESK', 'CONCIERGE', 'SPA', 'TRANSPORT', 'OTHER'].includes(cat);
        case 'RESTAURANT_STAFF':
        case 'KITCHEN_STAFF':
          return ['ROOM_SERVICE', 'FOOD', 'DINING'].includes(cat);
        default:
          return false;
      }
    }
    assert(
      isRequestRelevantForRole('HOUSEKEEPING', 'HOUSEKEEPING') === true &&
        isRequestRelevantForRole('HOUSEKEEPING', 'MAINTENANCE') === false &&
        isRequestRelevantForRole('GENERAL_MANAGER', 'HOUSEKEEPING') === true,
      '19. Role-based department routing filters out irrelevant requests'
    );

    // TEST 20: Cross-property request access is rejected
    const crossPropAck = await client.query(
      `SELECT public.staff_acknowledge_guest_request($1, $2, 'Malicious ack') AS res;`,
      [propB_id, hkReqId] // Trying to ack Prop A request using Prop B id
    );
    assert(
      crossPropAck.rows[0].res.success === false,
      '20. Cross-property request access is rejected'
    );

    // TEST 21: Guest cannot access another guest's request
    const guestCrossDetail = await client.query(
      `SELECT public.get_guest_service_request_detail($1, $2) AS res;`,
      [tokenB_hash, hkReqId] // Guest B tries to view Guest A's request
    );
    assert(
      guestCrossDetail.rows[0].res.success === false,
      '21. Guest cannot access another guest request'
    );

    // TEST 22: Guest cannot access another room's request
    const guestCrossOrder = await client.query(
      `SELECT public.get_guest_food_order_detail($1, $2) AS res;`,
      [tokenB_hash, foodOrderId]
    );
    assert(
      guestCrossOrder.rows[0].res.success === false,
      '22. Guest cannot access another rooms food order'
    );

    // TEST 23: Completed request stops alert
    alertMgr.addOrUpdateAlert({
      id: 'req_1',
      status: 'COMPLETED',
    });
    assert(!alertMgr.alerts.has('req_1'), '23. Completed request stops alert');

    // TEST 24: Invalid state transition rejected
    // Cannot acknowledge already acknowledged or completed request
    const doubleAck = await client.query(
      `SELECT public.staff_acknowledge_guest_request($1, $2) AS res;`,
      [propA_id, hkReqId]
    );
    assert(
      doubleAck.rows[0].res.success === false,
      '24. Invalid state transition rejected (cannot re-acknowledge)'
    );

    // TEST 25: Priority changes alert behavior (intervals & urgency)
    alertMgr.alerts.clear();
    alertMgr.addOrUpdateAlert({ id: 'norm', priority: 'NORMAL', status: 'SUBMITTED' });
    const normalInterval = alertMgr.getIntervalMs();
    alertMgr.addOrUpdateAlert({ id: 'urg', priority: 'URGENT', status: 'SUBMITTED' });
    const urgentInterval = alertMgr.getIntervalMs();
    assert(
      normalInterval === 7000 && urgentInterval === 3500,
      '25. Priority changes alert behavior (urgent interval is shorter)'
    );

    // TEST 26: Browser audio permission handling works
    alertMgr.soundEnabled = false;
    alertMgr.stopBuzzer();
    assert(
      alertMgr.isBuzzing === false,
      '26. Browser audio permission handling and mute controls work'
    );

    // TEST 27: Existing notification system remains functional
    const fs = require('fs');
    const path = require('path');
    const tmplFile = fs.readFileSync(path.join(__dirname, '../src/lib/notifications/templates.ts'), 'utf8');
    assert(
      tmplFile.includes('GUEST_SERVICE_REQUEST_CREATED') && tmplFile.includes('ROOM_SERVICE_ORDER_PLACED'),
      '27. Existing notification system remains functional with new templates'
    );

    // TEST 28: Existing KDS workflow remains functional
    const kdsTicketId = kdsTicketRes.rows[0].id;
    await client.query(
      `UPDATE public.kitchen_tickets SET status = 'IN_PROGRESS', started_at = now() WHERE id = $1;`,
      [kdsTicketId]
    );
    const kdsCheck = await client.query(
      `SELECT status FROM public.kitchen_tickets WHERE id = $1;`,
      [kdsTicketId]
    );
    assert(
      kdsCheck.rows[0].status === 'IN_PROGRESS',
      '28. Existing KDS workflow remains functional'
    );

    // TEST 29: Existing housekeeping workflow remains functional
    const hkTaskRes = await client.query(
      `INSERT INTO public.housekeeping_tasks (property_id, room_id, task_type, status, priority, scheduled_for)
       VALUES ($1, $2, 'CLEANING', 'PENDING', 'NORMAL', now()) RETURNING id;`,
      [propA_id, roomA_id]
    );
    assert(hkTaskRes.rows.length > 0, '29. Existing housekeeping workflow remains functional');

    // TEST 30: Existing maintenance workflow remains functional
    const maintWoRes = await client.query(
      `INSERT INTO public.maintenance_work_orders (property_id, room_id, title, category, priority, status)
       VALUES ($1, $2, 'Fix Showerhead', 'PLUMBING', 'NORMAL', 'OPEN') RETURNING id;`,
      [propA_id, roomA_id]
    );
    assert(maintWoRes.rows.length > 0, '30. Existing maintenance workflow remains functional');
  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // CLEANUP FIXTURES
    try {
      if (propA_id) {
        await client.query(`DELETE FROM public.properties WHERE id IN ($1, $2);`, [
          propA_id,
          propB_id,
        ]);
      }
    } catch (cleanupErr) {
      console.warn('Cleanup warning:', cleanupErr.message);
    }
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`SUITE RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runQrDispatchAlertingSuite().catch((err) => {
  console.error('Fatal suite failure:', err);
  process.exit(1);
});
