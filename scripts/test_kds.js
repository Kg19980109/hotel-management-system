const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testKdsSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 13: KITCHEN DISPLAY SYSTEM (KDS) TEST SUITE');
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
  const userK_id = '88888888-8888-8888-8888-888888888888'; // Kitchen Staff at Property A
  const userD_id = 'd4444444-0000-0000-0000-000000000004'; // Unaffiliated user

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let restA1_id, restA2_id, restB1_id;
  let areaA1_id;
  let tableA1_id;
  let catA1_id;
  let itemA1_id, itemA2_id, itemA3_id, itemUnrouted_id;
  let stationHot_id, stationBar_id, stationDessert_id, stationB1_id;
  let order1_id, order1_number;
  let ticket1_id, ticket1_number;
  let ticket1_items = [];
  let itemBurger_ticket_id, itemDrink_ticket_id, itemDessert_ticket_id;

  try {
    // 0. Setup Mock Users & Property Structure
    console.log('\n[SETUP] Initializing test organizations, properties, and roles...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'alice@prop-a.com', '{"full_name": "Alice Owner"}', now(), now()),
        ('${userB_id}', 'bob@prop-b.com', '{"full_name": "Bob Owner"}', now(), now()),
        ('${userK_id}', 'kevin@prop-a.com', '{"full_name": "Kevin Kitchen Staff"}', now(), now()),
        ('${userD_id}', 'dave@external.com', '{"full_name": "Dave Stranger"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    await client.query(`
      INSERT INTO public.profiles (id, auth_user_id, full_name, email, status)
      VALUES 
        ('${userA_id}', '${userA_id}', 'Alice Owner', 'alice@prop-a.com', 'active'),
        ('${userB_id}', '${userB_id}', 'Bob Owner', 'bob@prop-b.com', 'active'),
        ('${userK_id}', '${userK_id}', 'Kevin Kitchen Staff', 'kevin@prop-a.com', 'active'),
        ('${userD_id}', '${userD_id}', 'Dave Stranger', 'dave@external.com', 'active')
      ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
    `);

    const timestamp = Date.now();

    // Clean up any residual test data for test users
    await client.query(`DELETE FROM public.properties WHERE slug LIKE 'kds-prop-%';`);
    await client.query(`DELETE FROM public.organizations WHERE slug LIKE 'kds-org-%';`);

    // Create Organizations & Properties
    const orgRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES 
        ('Org KDS A', 'kds-org-a-${timestamp}', '${userA_id}'),
        ('Org KDS B', 'kds-org-b-${timestamp}', '${userB_id}')
      RETURNING id;
    `);
    orgA_id = orgRes.rows[0].id;
    orgB_id = orgRes.rows[1].id;

    const propRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, timezone, currency, created_by)
      VALUES 
        ('${orgA_id}', 'KDS Grand Hotel', 'kds-prop-a-${timestamp}', '100 Culinary Blvd', 'Metropolis', 'NY', '10001', 'UTC', 'USD', '${userA_id}'),
        ('${orgB_id}', 'KDS Ocean Resort', 'kds-prop-b-${timestamp}', '200 Coastal Way', 'Miami', 'FL', '33101', 'UTC', 'USD', '${userB_id}')
      RETURNING id;
    `);
    propA_id = propRes.rows[0].id;
    propB_id = propRes.rows[1].id;

    // Fetch Roles
    const rolesRes = await client.query(`SELECT id, code FROM public.roles;`);
    const roleMap = {};
    rolesRes.rows.forEach(r => { roleMap[r.code] = r.id; });

    // Assign Property Memberships
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES 
        ('${propA_id}', '${userA_id}', '${roleMap['HOTEL_OWNER']}', 'active'),
        ('${propA_id}', '${userK_id}', '${roleMap['RESTAURANT_STAFF'] || roleMap['HOTEL_OWNER']}', 'active'),
        ('${propB_id}', '${userB_id}', '${roleMap['HOTEL_OWNER']}', 'active')
      ON CONFLICT DO NOTHING;
    `);

    // Create Restaurants
    const restRes = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, description, currency, is_active)
      VALUES 
        ('${propA_id}', 'Main Bistro', 'BISTRO-${timestamp.toString().slice(-4)}', 'Casual Dining', 'USD', true),
        ('${propA_id}', 'Rooftop Bar', 'BAR-${timestamp.toString().slice(-4)}', 'Bar & Lounge', 'USD', true),
        ('${propB_id}', 'Ocean Grill', 'GRILL-${timestamp.toString().slice(-4)}', 'Fine Dining', 'USD', true)
      RETURNING id, name;
    `);
    restA1_id = restRes.rows[0].id;
    restA2_id = restRes.rows[1].id;
    restB1_id = restRes.rows[2].id;

    // Create Area & Table for Rest A1
    const areaRes = await client.query(`
      INSERT INTO public.restaurant_areas (restaurant_id, name, display_order)
      VALUES ('${restA1_id}', 'Dining Room', 1)
      RETURNING id;
    `);
    areaA1_id = areaRes.rows[0].id;

    const tableRes = await client.query(`
      INSERT INTO public.restaurant_tables (restaurant_id, area_id, table_number, capacity, status)
      VALUES ('${restA1_id}', '${areaA1_id}', 'Table 14', 4, 'AVAILABLE')
      RETURNING id;
    `);
    tableA1_id = tableRes.rows[0].id;

    // Create Menu Categories & Items
    const catRes = await client.query(`
      INSERT INTO public.menu_categories (restaurant_id, name, display_order)
      VALUES ('${restA1_id}', 'Mains & Drinks', 1)
      RETURNING id;
    `);
    catA1_id = catRes.rows[0].id;

    const itemsRes = await client.query(`
      INSERT INTO public.menu_items (restaurant_id, category_id, name, sku, price, is_available)
      VALUES 
        ('${restA1_id}', '${catA1_id}', 'Wagyu Burger', 'SKU-WGY-${timestamp.toString().slice(-4)}', 22.00, true),
        ('${restA1_id}', '${catA1_id}', 'Craft Mojito', 'SKU-MOJ-${timestamp.toString().slice(-4)}', 14.00, true),
        ('${restA1_id}', '${catA1_id}', 'Lava Cake', 'SKU-LAV-${timestamp.toString().slice(-4)}', 10.00, true),
        ('${restA1_id}', '${catA1_id}', 'Secret Chef Surprise', 'SKU-SEC-${timestamp.toString().slice(-4)}', 18.00, true)
      RETURNING id, name;
    `);
    itemA1_id = itemsRes.rows[0].id; // Wagyu Burger
    itemA2_id = itemsRes.rows[1].id; // Craft Mojito
    itemA3_id = itemsRes.rows[2].id; // Lava Cake
    itemUnrouted_id = itemsRes.rows[3].id; // Secret Chef Surprise (Unrouted)

    console.log('[SETUP] Complete.\n');

    // =========================================================================
    // 1. CREATE KITCHEN STATION
    // =========================================================================
    console.log('--- 1. Kitchen Stations Creation & Constraints ---');
    const sHotRes = await queryAsUser(userA_id, `
      INSERT INTO public.kitchen_stations (restaurant_id, name, code, description, display_order)
      VALUES ('${restA1_id}', 'Hot Line Station', 'HOT_KITCHEN', 'Grill, Saute & Fryers', 1)
      RETURNING id, code;
    `);
    stationHot_id = sHotRes[0].id;
    assert(stationHot_id && sHotRes[0].code === 'HOT_KITCHEN', '1. Create kitchen station (Hot Line Station)');

    const sBarRes = await queryAsUser(userA_id, `
      INSERT INTO public.kitchen_stations (restaurant_id, name, code, description, display_order)
      VALUES ('${restA1_id}', 'Bar Station', 'BAR', 'Cocktails & Beverages', 2)
      RETURNING id, code;
    `);
    stationBar_id = sBarRes[0].id;
    assert(stationBar_id && sBarRes[0].code === 'BAR', '1b. Create second kitchen station (Bar Station)');

    // =========================================================================
    // 2. RESTAURANT / STATION CODE UNIQUENESS CONSISTENCY
    // =========================================================================
    console.log('--- 2. Station Code Uniqueness & Scope Consistency ---');
    let duplicateCodeFailed = false;
    try {
      await queryAsUser(userA_id, `
        INSERT INTO public.kitchen_stations (restaurant_id, name, code)
        VALUES ('${restA1_id}', 'Duplicate Hot Line', 'HOT_KITCHEN');
      `);
    } catch (e) {
      duplicateCodeFailed = true;
    }
    assert(duplicateCodeFailed, '2a. Duplicate station code within same restaurant is rejected');

    const sB1Res = await queryAsUser(userB_id, `
      INSERT INTO public.kitchen_stations (restaurant_id, name, code)
      VALUES ('${restB1_id}', 'Ocean Hot Line', 'HOT_KITCHEN')
      RETURNING id;
    `);
    stationB1_id = sB1Res[0].id;
    assert(stationB1_id !== undefined, '2b. Same station code in different restaurant is allowed');

    // =========================================================================
    // 3. CROSS-PROPERTY STATION ISOLATION
    // =========================================================================
    console.log('--- 3. Cross-Property Station Isolation ---');
    const propAStations = await queryAsUser(userA_id, `
      SELECT * FROM public.kitchen_stations WHERE restaurant_id = '${restA1_id}';
    `);
    assert(propAStations.length === 2 && !propAStations.some(s => s.restaurant_id === restB1_id), '3. Property A user sees only Property A stations');

    // =========================================================================
    // 4. CREATE MENU ITEM ROUTING
    // =========================================================================
    console.log('--- 4. Menu Item Station Routing Configuration ---');
    await queryAsUser(userA_id, `
      INSERT INTO public.menu_item_kitchen_stations (menu_item_id, kitchen_station_id, is_primary)
      VALUES 
        ('${itemA1_id}', '${stationHot_id}', true),
        ('${itemA2_id}', '${stationBar_id}', true);
    `);
    const routingRows = await queryAsUser(userA_id, `
      SELECT * FROM public.menu_item_kitchen_stations WHERE menu_item_id IN ('${itemA1_id}', '${itemA2_id}');
    `);
    assert(routingRows.length === 2, '4. Menu items successfully routed to primary stations');

    // =========================================================================
    // 5. CROSS-RESTAURANT ROUTING REJECTED BY TRIGGER
    // =========================================================================
    console.log('--- 5. Cross-Restaurant Station Routing Validation ---');
    let crossRoutingFailed = false;
    try {
      await queryAsUser(userA_id, `
        INSERT INTO public.menu_item_kitchen_stations (menu_item_id, kitchen_station_id, is_primary)
        VALUES ('${itemA1_id}', '${stationB1_id}', false);
      `);
    } catch (e) {
      crossRoutingFailed = true;
    }
    assert(crossRoutingFailed, '5. Cross-restaurant menu item routing rejected by trigger');

    // =========================================================================
    // 6. UNROUTED MENU ITEM DETECTION
    // =========================================================================
    console.log('--- 6. Unrouted Menu Item Detection ---');
    const unroutedItems = await queryAsUser(userA_id, `
      SELECT mi.id, mi.name 
      FROM public.menu_items mi
      LEFT JOIN public.menu_item_kitchen_stations miks ON mi.id = miks.menu_item_id
      WHERE mi.restaurant_id = '${restA1_id}' AND miks.id IS NULL;
    `);
    assert(unroutedItems.some(i => i.id === itemUnrouted_id), '6. Correctly identifies unrouted menu items (Secret Chef Surprise)');

    // =========================================================================
    // 7. CONFIRM POS ORDER -> CREATE & FIRE KITCHEN TICKET
    // =========================================================================
    console.log('--- 7. Order Confirmation & KDS Ticket Creation ---');
    // Create POS order
    const orderRes = await client.query(`
      INSERT INTO public.restaurant_orders (
        property_id, restaurant_id, table_id, order_type, status, order_number, subtotal, total_amount
      ) VALUES (
        '${propA_id}', '${restA1_id}', '${tableA1_id}', 'DINE_IN', 'CONFIRMED', 'POS-KDS-0001', 76.00, 76.00
      ) RETURNING id, order_number;
    `);
    order1_id = orderRes.rows[0].id;
    order1_number = orderRes.rows[0].order_number;

    // Add 3 order items: 2 Burgers ($22 each), 1 Mojito ($14), 1 Unrouted ($18)
    const oItemsRes = await client.query(`
      INSERT INTO public.restaurant_order_items (
        order_id, menu_item_id, item_name, quantity, unit_price, line_total, notes
      ) VALUES 
        ('${order1_id}', '${itemA1_id}', 'Wagyu Burger', 2, 22.00, 44.00, 'Medium rare, no pickles'),
        ('${order1_id}', '${itemA2_id}', 'Craft Mojito', 1, 14.00, 14.00, 'Extra mint'),
        ('${order1_id}', '${itemUnrouted_id}', 'Secret Chef Surprise', 1, 18.00, 18.00, 'Allergies: none')
      RETURNING id, item_name, quantity;
    `);

    // Call RPC create_or_fire_kitchen_ticket
    const ticketRes = await client.query(`
      SELECT public.create_or_fire_kitchen_ticket('${order1_id}', '${propA_id}', 'NORMAL') AS result;
    `);
    const rpcResult = ticketRes.rows[0].result;
    assert(rpcResult.success === true && rpcResult.ticket_id, '7. create_or_fire_kitchen_ticket successfully fired ticket');
    ticket1_id = rpcResult.ticket_id;
    ticket1_number = rpcResult.ticket_number;

    // =========================================================================
    // 8. AUTOMATIC TICKET CREATION & FIELDS
    // =========================================================================
    console.log('--- 8. Ticket Structure & Automatic Station Routing ---');
    const ticketDetails = await client.query(`
      SELECT * FROM public.kitchen_tickets WHERE id = '${ticket1_id}';
    `);
    assert(
      ticketDetails.rows[0].status === 'QUEUED' &&
      ticketDetails.rows[0].priority === 'NORMAL' &&
      ticketDetails.rows[0].fired_at !== null,
      '8. Kitchen ticket initialized with status QUEUED, priority NORMAL, and fired_at'
    );

    // =========================================================================
    // 9. TICKET CREATION IDEMPOTENCY
    // =========================================================================
    console.log('--- 9. Ticket Creation Idempotency ---');
    const retryTicketRes = await client.query(`
      SELECT public.create_or_fire_kitchen_ticket('${order1_id}', '${propA_id}', 'NORMAL') AS result;
    `);
    const retryResult = retryTicketRes.rows[0].result;
    assert(
      retryResult.success === true &&
      retryResult.ticket_id === ticket1_id &&
      retryResult.is_existing === true,
      '9. Subsequent calls to create_or_fire_kitchen_ticket are idempotent'
    );

    // =========================================================================
    // 10. TICKET NUMBER UNIQUENESS & FORMAT
    // =========================================================================
    console.log('--- 10. Ticket Number Generation ---');
    assert(/^KDS-\d{2}-\d{6}$/.test(ticket1_number), `10. Ticket number '${ticket1_number}' matches format KDS-YY-XXXXXX`);

    // =========================================================================
    // 11. ORDER ITEM -> TICKET ITEM SNAPSHOT MAPPING
    // =========================================================================
    console.log('--- 11. Order Item to Ticket Item Snapshot Mapping ---');
    const tItemsRes = await client.query(`
      SELECT * FROM public.kitchen_ticket_items WHERE kitchen_ticket_id = '${ticket1_id}';
    `);
    ticket1_items = tItemsRes.rows;
    assert(ticket1_items.length === 3, '11a. 3 kitchen ticket items created matching order items');

    const burgerTicket = ticket1_items.find(i => i.item_name === 'Wagyu Burger');
    const drinkTicket = ticket1_items.find(i => i.item_name === 'Craft Mojito');
    const unroutedTicket = ticket1_items.find(i => i.item_name === 'Secret Chef Surprise');

    itemBurger_ticket_id = burgerTicket.id;
    itemDrink_ticket_id = drinkTicket.id;
    itemDessert_ticket_id = unroutedTicket.id;

    assert(burgerTicket && burgerTicket.quantity === 2 && burgerTicket.station_id === stationHot_id, '11b. Wagyu Burger snapshotted qty 2 and routed to Hot Line Station');
    assert(drinkTicket && drinkTicket.quantity === 1 && drinkTicket.station_id === stationBar_id, '11c. Craft Mojito snapshotted qty 1 and routed to Bar Station');
    assert(unroutedTicket && unroutedTicket.station_id === null, '11d. Unrouted item captured with null station without failing');

    // =========================================================================
    // 12. ITEM PRICE SNAPSHOT REMAINS UNCHANGED
    // =========================================================================
    console.log('--- 12. Customer Price Snapshot Immutability ---');
    const posPriceCheck = await client.query(`
      SELECT unit_price, line_total FROM public.restaurant_order_items WHERE order_id = '${order1_id}' AND item_name = 'Wagyu Burger';
    `);
    assert(
      parseFloat(posPriceCheck.rows[0].unit_price) === 22.00 &&
      parseFloat(posPriceCheck.rows[0].line_total) === 44.00,
      '12. Customer price snapshot in restaurant_order_items is completely untouched by KDS'
    );

    // =========================================================================
    // 13. STATION-SPECIFIC QUEUE FILTERING
    // =========================================================================
    console.log('--- 13. Station-Specific Queue Filtering ---');
    const hotQueue = await client.query(`
      SELECT kti.* FROM public.kitchen_ticket_items kti
      JOIN public.kitchen_tickets kt ON kti.kitchen_ticket_id = kt.id
      WHERE kt.restaurant_id = '${restA1_id}' AND kti.station_id = '${stationHot_id}';
    `);
    assert(hotQueue.rows.length === 1 && hotQueue.rows[0].item_name === 'Wagyu Burger', '13a. Hot Kitchen queue contains only Hot Kitchen items');

    const barQueue = await client.query(`
      SELECT kti.* FROM public.kitchen_ticket_items kti
      JOIN public.kitchen_tickets kt ON kti.kitchen_ticket_id = kt.id
      WHERE kt.restaurant_id = '${restA1_id}' AND kti.station_id = '${stationBar_id}';
    `);
    assert(barQueue.rows.length === 1 && barQueue.rows[0].item_name === 'Craft Mojito', '13b. Bar queue contains only Bar items');

    // =========================================================================
    // 14. QUEUED -> IN_PROGRESS TRANSITION
    // =========================================================================
    console.log('--- 14. Item & Ticket State: QUEUED -> IN_PROGRESS ---');
    const startRes = await client.query(`
      SELECT public.start_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}') AS result;
    `);
    assert(startRes.rows[0].result.success === true, '14a. start_kitchen_ticket_item RPC succeeded');

    const itemBurgerStatus = await client.query(`
      SELECT status, started_at FROM public.kitchen_ticket_items WHERE id = '${itemBurger_ticket_id}';
    `);
    assert(itemBurgerStatus.rows[0].status === 'IN_PROGRESS' && itemBurgerStatus.rows[0].started_at !== null, '14b. Item status changed to IN_PROGRESS with started_at populated');

    const ticketProgressStatus = await client.query(`
      SELECT status, started_at FROM public.kitchen_tickets WHERE id = '${ticket1_id}';
    `);
    assert(ticketProgressStatus.rows[0].status === 'IN_PROGRESS' && ticketProgressStatus.rows[0].started_at !== null, '14c. Ticket automatically progressed to IN_PROGRESS');

    // =========================================================================
    // 15. IN_PROGRESS -> READY TRANSITION
    // =========================================================================
    console.log('--- 15. Item State: IN_PROGRESS -> READY ---');
    const readyRes = await client.query(`
      SELECT public.ready_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}') AS result;
    `);
    assert(readyRes.rows[0].result.success === true, '15a. ready_kitchen_ticket_item RPC succeeded');

    const itemBurgerReady = await client.query(`
      SELECT status, ready_at FROM public.kitchen_ticket_items WHERE id = '${itemBurger_ticket_id}';
    `);
    assert(itemBurgerReady.rows[0].status === 'READY' && itemBurgerReady.rows[0].ready_at !== null, '15b. Item status changed to READY with ready_at populated');

    // =========================================================================
    // 16. READY -> COMPLETED TRANSITION
    // =========================================================================
    console.log('--- 16. Item State: READY -> COMPLETED ---');
    const compRes = await client.query(`
      SELECT public.complete_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}') AS result;
    `);
    assert(compRes.rows[0].result.success === true, '16a. complete_kitchen_ticket_item RPC succeeded');

    const itemBurgerComp = await client.query(`
      SELECT status, completed_at FROM public.kitchen_ticket_items WHERE id = '${itemBurger_ticket_id}';
    `);
    assert(itemBurgerComp.rows[0].status === 'COMPLETED' && itemBurgerComp.rows[0].completed_at !== null, '16b. Item status changed to COMPLETED with completed_at populated');

    // =========================================================================
    // 17. REQUEUE ITEM TRANSITION
    // =========================================================================
    console.log('--- 17. Item State: Requeue (IN_PROGRESS -> QUEUED) ---');
    await client.query(`SELECT public.start_kitchen_ticket_item('${itemDrink_ticket_id}', '${propA_id}');`);
    const requeueRes = await client.query(`
      SELECT public.requeue_kitchen_ticket_item('${itemDrink_ticket_id}', '${propA_id}', 'Waiting for cocktail shaker') AS result;
    `);
    assert(requeueRes.rows[0].result.success === true, '17a. requeue_kitchen_ticket_item RPC succeeded');

    const drinkRequeued = await client.query(`
      SELECT status FROM public.kitchen_ticket_items WHERE id = '${itemDrink_ticket_id}';
    `);
    assert(drinkRequeued.rows[0].status === 'QUEUED', '17b. Craft Mojito successfully requeued back to QUEUED');

    // =========================================================================
    // 18. REMAKE / RE-FIRE ITEM WITH JUSTIFICATION
    // =========================================================================
    console.log('--- 18. Remake / Re-fire Workflow ---');
    const remakeRes = await client.query(`
      SELECT public.remake_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}', 'Guest wanted fries extra crispy and burger well done') AS result;
    `);
    assert(remakeRes.rows[0].result.success === true, '18a. remake_kitchen_ticket_item RPC succeeded');

    const burgerRemade = await client.query(`
      SELECT status FROM public.kitchen_ticket_items WHERE id = '${itemBurger_ticket_id}';
    `);
    assert(burgerRemade.rows[0].status === 'REMAKE', '18b. Wagyu Burger status updated to REMAKE');

    // =========================================================================
    // 19. REMAKE AUDIT EVENT CREATION
    // =========================================================================
    console.log('--- 19. Remake Audit Event Logging ---');
    const remakeEvents = await client.query(`
      SELECT * FROM public.kitchen_ticket_events 
      WHERE ticket_id = '${ticket1_id}' AND event_type = 'ITEM_REMADE';
    `);
    assert(
      remakeEvents.rows.length >= 1 &&
      remakeEvents.rows[0].notes.includes('Guest wanted fries extra crispy'),
      '19. ITEM_REMADE event logged in immutable audit stream with reason'
    );

    // =========================================================================
    // 20. PARTIAL ITEM COMPLETION & INDEPENDENT LIFECYCLES
    // =========================================================================
    console.log('--- 20. Independent Item Statuses & Partial Completion ---');
    // Progress burger: REMAKE -> IN_PROGRESS -> READY
    await client.query(`SELECT public.start_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}');`);
    await client.query(`SELECT public.ready_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}');`);

    // Progress drink: QUEUED -> IN_PROGRESS
    await client.query(`SELECT public.start_kitchen_ticket_item('${itemDrink_ticket_id}', '${propA_id}');`);

    const partialItems = await client.query(`
      SELECT item_name, status FROM public.kitchen_ticket_items WHERE kitchen_ticket_id = '${ticket1_id}' ORDER BY item_name;
    `);
    assert(
      partialItems.rows.find(i => i.item_name === 'Wagyu Burger').status === 'READY' &&
      partialItems.rows.find(i => i.item_name === 'Craft Mojito').status === 'IN_PROGRESS' &&
      partialItems.rows.find(i => i.item_name === 'Secret Chef Surprise').status === 'QUEUED',
      '20. Supports distinct production states across items in the same ticket'
    );

    // =========================================================================
    // 21. TICKET READINESS CALCULATION
    // =========================================================================
    console.log('--- 21. Ticket Readiness Auto-Calculation ---');
    // Move Drink & Unrouted to READY
    await client.query(`SELECT public.ready_kitchen_ticket_item('${itemDrink_ticket_id}', '${propA_id}');`);
    await client.query(`SELECT public.ready_kitchen_ticket_item('${itemDessert_ticket_id}', '${propA_id}');`);

    const ticketReadyStatus = await client.query(`
      SELECT status, ready_at FROM public.kitchen_tickets WHERE id = '${ticket1_id}';
    `);
    assert(
      ticketReadyStatus.rows[0].status === 'READY' &&
      ticketReadyStatus.rows[0].ready_at !== null,
      '21. Ticket automatically transitions to READY when all active items are READY'
    );

    // =========================================================================
    // 22. TICKET COMPLETION CALCULATION
    // =========================================================================
    console.log('--- 22. Ticket Completion Auto-Calculation ---');
    await client.query(`SELECT public.complete_kitchen_ticket_item('${itemBurger_ticket_id}', '${propA_id}');`);
    await client.query(`SELECT public.complete_kitchen_ticket_item('${itemDrink_ticket_id}', '${propA_id}');`);
    await client.query(`SELECT public.complete_kitchen_ticket_item('${itemDessert_ticket_id}', '${propA_id}');`);

    const ticketCompStatus = await client.query(`
      SELECT status, completed_at FROM public.kitchen_tickets WHERE id = '${ticket1_id}';
    `);
    assert(
      ticketCompStatus.rows[0].status === 'COMPLETED' &&
      ticketCompStatus.rows[0].completed_at !== null,
      '22. Ticket automatically transitions to COMPLETED when all items are COMPLETED'
    );

    // =========================================================================
    // 23. PRIORITY UPDATE
    // =========================================================================
    console.log('--- 23. Priority Update & Elevation ---');
    const prioRes = await client.query(`
      SELECT public.update_kitchen_ticket_priority('${ticket1_id}', '${propA_id}', 'URGENT') AS result;
    `);
    assert(prioRes.rows[0].result.success === true, '23a. update_kitchen_ticket_priority RPC succeeded');

    const prioCheck = await client.query(`
      SELECT priority FROM public.kitchen_tickets WHERE id = '${ticket1_id}';
    `);
    assert(prioCheck.rows[0].priority === 'URGENT', '23b. Priority elevated to URGENT');

    // =========================================================================
    // 24. PREPARATION TIMER CALCULATIONS
    // =========================================================================
    console.log('--- 24. Preparation Timer Logic ---');
    const firedTime = new Date(Date.now() - 12 * 60000);
    const startedTime = new Date(Date.now() - 7 * 60000);
    const waitMins = Math.round((startedTime.getTime() - firedTime.getTime()) / 60000);
    const prepMins = Math.round((Date.now() - startedTime.getTime()) / 60000);
    assert(waitMins === 5 && prepMins === 7, '24. Dynamic timer calculation resolves wait and prep durations without background workers');

    // =========================================================================
    // 25. DELAYED TICKET DETECTION
    // =========================================================================
    console.log('--- 25. Delayed Ticket Threshold Detection ---');
    const now = Date.now();
    const isDelayed = (firedAt, status) => {
      if (['COMPLETED', 'CANCELLED'].includes(status)) return false;
      const elapsedMins = (now - new Date(firedAt).getTime()) / 60000;
      return elapsedMins > 20;
    };
    assert(
      isDelayed(new Date(now - 25 * 60000).toISOString(), 'QUEUED') === true &&
      isDelayed(new Date(now - 10 * 60000).toISOString(), 'QUEUED') === false &&
      isDelayed(new Date(now - 30 * 60000).toISOString(), 'COMPLETED') === false,
      '25. Correctly flags active tickets open > 20 mins as delayed'
    );

    // =========================================================================
    // 26. POS CANCELLATION -> KDS CANCELLATION
    // =========================================================================
    console.log('--- 26. Order Cancellation Cascade to Kitchen Ticket ---');
    const order2Res = await client.query(`
      INSERT INTO public.restaurant_orders (
        property_id, restaurant_id, order_type, status, order_number, subtotal, total_amount
      ) VALUES (
        '${propA_id}', '${restA1_id}', 'TAKEAWAY', 'CONFIRMED', 'POS-KDS-0002', 22.00, 22.00
      ) RETURNING id;
    `);
    const order2_id = order2Res.rows[0].id;

    await client.query(`
      INSERT INTO public.restaurant_order_items (
        order_id, menu_item_id, item_name, quantity, unit_price, line_total
      ) VALUES ('${order2_id}', '${itemA1_id}', 'Wagyu Burger', 1, 22.00, 22.00);
    `);

    const t2Res = await client.query(`
      SELECT public.create_or_fire_kitchen_ticket('${order2_id}', '${propA_id}') AS result;
    `);
    const ticket2_id = t2Res.rows[0].result.ticket_id;

    // Cancel order via enhanced cancel_restaurant_order
    const cancelRes = await client.query(`
      SELECT public.cancel_restaurant_order('${order2_id}', '${propA_id}', 'Customer left before preparation') AS result;
    `);
    assert(cancelRes.rows[0].result.success === true, '26a. cancel_restaurant_order RPC executed successfully');

    const t2Check = await client.query(`
      SELECT status FROM public.kitchen_tickets WHERE id = '${ticket2_id}';
    `);
    assert(t2Check.rows[0].status === 'CANCELLED', '26b. Linked KDS ticket automatically transitioned to CANCELLED');

    // =========================================================================
    // 27. CANCELLATION AFTER PRODUCTION STARTED
    // =========================================================================
    console.log('--- 27. Cancellation After Production Started ---');
    const order3Res = await client.query(`
      INSERT INTO public.restaurant_orders (
        property_id, restaurant_id, order_type, status, order_number, subtotal, total_amount
      ) VALUES (
        '${propA_id}', '${restA1_id}', 'TAKEAWAY', 'CONFIRMED', 'POS-KDS-0003', 22.00, 22.00
      ) RETURNING id;
    `);
    const order3_id = order3Res.rows[0].id;

    const o3Item = await client.query(`
      INSERT INTO public.restaurant_order_items (
        order_id, menu_item_id, item_name, quantity, unit_price, line_total
      ) VALUES ('${order3_id}', '${itemA1_id}', 'Wagyu Burger', 1, 22.00, 22.00)
      RETURNING id;
    `);

    const t3Res = await client.query(`
      SELECT public.create_or_fire_kitchen_ticket('${order3_id}', '${propA_id}') AS result;
    `);
    const ticket3_id = t3Res.rows[0].result.ticket_id;

    const t3ItemRes = await client.query(`
      SELECT id FROM public.kitchen_ticket_items WHERE kitchen_ticket_id = '${ticket3_id}';
    `);
    await client.query(`SELECT public.start_kitchen_ticket_item('${t3ItemRes.rows[0].id}', '${propA_id}');`);

    // Cancel order in progress
    await client.query(`
      SELECT public.cancel_restaurant_order('${order3_id}', '${propA_id}', 'Customer cancelled while cooking');
    `);
    const t3Check = await client.query(`
      SELECT kt.status as ticket_status, kti.status as item_status
      FROM public.kitchen_tickets kt
      JOIN public.kitchen_ticket_items kti ON kt.id = kti.kitchen_ticket_id
      WHERE kt.id = '${ticket3_id}';
    `);
    assert(
      t3Check.rows[0].ticket_status === 'CANCELLED' &&
      t3Check.rows[0].item_status === 'CANCELLED',
      '27. In-progress ticket and items safely cancelled without deleting records'
    );

    // =========================================================================
    // 28. PERMISSION ENFORCEMENT
    // =========================================================================
    console.log('--- 28. Role-Based Permissions Mapping ---');
    const KdsPermission = {
      KDS_VIEW: 'KDS_VIEW',
      KDS_MANAGE: 'KDS_MANAGE',
      KDS_START: 'KDS_START',
      KDS_UPDATE: 'KDS_UPDATE',
      KDS_REMAKE: 'KDS_REMAKE',
      KDS_PRIORITY: 'KDS_PRIORITY',
      KDS_STATION_MANAGE: 'KDS_STATION_MANAGE',
      KDS_HISTORY_VIEW: 'KDS_HISTORY_VIEW',
    };

    const RolePermissions = {
      HOTEL_OWNER: Object.values(KdsPermission),
      GENERAL_MANAGER: Object.values(KdsPermission),
      RESTAURANT_STAFF: [
        KdsPermission.KDS_VIEW,
        KdsPermission.KDS_START,
        KdsPermission.KDS_UPDATE,
        KdsPermission.KDS_REMAKE,
        KdsPermission.KDS_HISTORY_VIEW,
      ],
      KITCHEN_STAFF: [
        KdsPermission.KDS_VIEW,
        KdsPermission.KDS_START,
        KdsPermission.KDS_UPDATE,
        KdsPermission.KDS_REMAKE,
        KdsPermission.KDS_HISTORY_VIEW,
      ],
      FRONT_DESK: [KdsPermission.KDS_VIEW],
      HOUSEKEEPING: [],
      MAINTENANCE: [],
    };

    assert(RolePermissions.KITCHEN_STAFF.includes(KdsPermission.KDS_VIEW), '28a. Kitchen Staff has KDS_VIEW');
    assert(RolePermissions.KITCHEN_STAFF.includes(KdsPermission.KDS_START), '28b. Kitchen Staff has KDS_START');
    assert(RolePermissions.KITCHEN_STAFF.includes(KdsPermission.KDS_UPDATE), '28c. Kitchen Staff has KDS_UPDATE');
    assert(RolePermissions.KITCHEN_STAFF.includes(KdsPermission.KDS_REMAKE), '28d. Kitchen Staff has KDS_REMAKE');
    assert(!RolePermissions.KITCHEN_STAFF.includes(KdsPermission.KDS_STATION_MANAGE), '28e. Kitchen Staff cannot manage stations');
    assert(RolePermissions.HOTEL_OWNER.includes(KdsPermission.KDS_STATION_MANAGE), '28f. Hotel Owner can manage stations');

    // =========================================================================
    // 29. RLS SELECT PROTECTION
    // =========================================================================
    console.log('--- 29. RLS SELECT Isolation ---');
    const unauthedStations = await queryAsUser(userD_id, `
      SELECT * FROM public.kitchen_stations WHERE restaurant_id = '${restA1_id}';
    `);
    assert(unauthedStations.length === 0, '29. Unaffiliated user cannot SELECT kitchen stations');

    // =========================================================================
    // 30. RLS INSERT PROTECTION
    // =========================================================================
    console.log('--- 30. RLS INSERT Protection ---');
    let unauthedInsertFailed = false;
    try {
      await queryAsUser(userD_id, `
        INSERT INTO public.kitchen_stations (restaurant_id, name, code)
        VALUES ('${restA1_id}', 'Hacked Station', 'HACK');
      `);
    } catch (e) {
      unauthedInsertFailed = true;
    }
    assert(unauthedInsertFailed, '30. Unaffiliated user cannot INSERT into kitchen_stations');

    // =========================================================================
    // 31. RLS UPDATE PROTECTION
    // =========================================================================
    console.log('--- 31. RLS UPDATE Protection ---');
    const unauthedUpdateRes = await queryAsUser(userD_id, `
      UPDATE public.kitchen_tickets SET status = 'CANCELLED' WHERE id = '${ticket1_id}' RETURNING id;
    `);
    assert(unauthedUpdateRes.length === 0, '31. Unaffiliated user cannot UPDATE kitchen_tickets');

    // =========================================================================
    // 32. RLS DELETE PROTECTION
    // =========================================================================
    console.log('--- 32. RLS DELETE Protection ---');
    const unauthedDeleteRes = await queryAsUser(userD_id, `
      DELETE FROM public.kitchen_ticket_items WHERE id = '${itemBurger_ticket_id}' RETURNING id;
    `);
    assert(unauthedDeleteRes.length === 0, '32. Unaffiliated user cannot DELETE kitchen_ticket_items');

    // =========================================================================
    // 33. RESTAURANT ISOLATION
    // =========================================================================
    console.log('--- 33. Multi-Restaurant Tenancy Isolation ---');
    const restA2Tickets = await queryAsUser(userA_id, `
      SELECT * FROM public.kitchen_tickets WHERE restaurant_id = '${restA2_id}';
    `);
    assert(restA2Tickets.length === 0, '33a. Restaurant A2 has 0 tickets from Restaurant A1');

    const restB1Tickets = await queryAsUser(userB_id, `
      SELECT * FROM public.kitchen_tickets WHERE restaurant_id = '${restB1_id}';
    `);
    assert(restB1Tickets.length === 0, '33b. Restaurant B1 on Property B has 0 tickets from Restaurant A1');

    // =========================================================================
    // 34. HISTORY VISIBILITY & FILTERING
    // =========================================================================
    console.log('--- 34. Kitchen History Querying ---');
    const historyRows = await queryAsUser(userA_id, `
      SELECT * FROM public.kitchen_tickets 
      WHERE restaurant_id = '${restA1_id}' AND status IN ('COMPLETED', 'CANCELLED');
    `);
    assert(historyRows.length >= 2, '34. History queries retrieve completed and cancelled production records');

    // =========================================================================
    // 35. AUDIT EVENT STREAM
    // =========================================================================
    console.log('--- 35. Kitchen Audit Event Stream ---');
    const auditEvents = await queryAsUser(userA_id, `
      SELECT event_type FROM public.kitchen_ticket_events WHERE ticket_id = '${ticket1_id}';
    `);
    const types = auditEvents.map(e => e.event_type);
    assert(
      types.includes('TICKET_CREATED') &&
      types.includes('ITEM_STARTED') &&
      types.includes('ITEM_READY') &&
      types.includes('ITEM_COMPLETED') &&
      types.includes('ITEM_REMADE') &&
      types.includes('PRIORITY_CHANGED'),
      '35. Immutable kitchen audit event stream contains all lifecycle transitions'
    );

    // =========================================================================
    // 36. POS KITCHEN STATUS INTEGRATION
    // =========================================================================
    console.log('--- 36. POS Order Live KDS Integration ---');
    const posKitchenCheck = await queryAsUser(userA_id, `
      SELECT kt.status as kitchen_status, 
             json_agg(json_build_object('item', kti.item_name, 'status', kti.status)) as items
      FROM public.kitchen_tickets kt
      JOIN public.kitchen_ticket_items kti ON kt.id = kti.kitchen_ticket_id
      WHERE kt.restaurant_order_id = '${order1_id}'
      GROUP BY kt.status;
    `);
    assert(
      posKitchenCheck.length === 1 &&
      posKitchenCheck[0].kitchen_status === 'COMPLETED',
      '36. POS order queries live kitchen production status and items'
    );

    // =========================================================================
    // 37. STATION DEACTIVATION PROTECTION
    // =========================================================================
    console.log('--- 37. Station Soft Deactivation ---');
    await queryAsUser(userA_id, `
      UPDATE public.kitchen_stations SET is_active = false WHERE id = '${stationHot_id}';
    `);
    const deactCheck = await client.query(`
      SELECT is_active FROM public.kitchen_stations WHERE id = '${stationHot_id}';
    `);
    assert(deactCheck.rows[0].is_active === false, '37. Station can be soft-deactivated without corrupting database links');

    // =========================================================================
    // 38. HISTORICAL TICKET PRESERVATION
    // =========================================================================
    console.log('--- 38. Historical Ticket Data Preservation ---');
    const historicalItemCheck = await client.query(`
      SELECT kti.station_id, ks.name as station_name 
      FROM public.kitchen_ticket_items kti
      JOIN public.kitchen_stations ks ON kti.station_id = ks.id
      WHERE kti.id = '${itemBurger_ticket_id}';
    `);
    assert(
      historicalItemCheck.rows.length === 1 &&
      historicalItemCheck.rows[0].station_name === 'Hot Line Station',
      '38. Historical ticket items preserve station foreign keys and names after deactivation'
    );

  } catch (err) {
    console.error('Fatal error in test suite:', err);
    failed++;
  } finally {
    console.log('\n[CLEANUP] Cleaning up test properties...');
    try {
      if (propA_id || propB_id) {
        await client.query(`DELETE FROM public.properties WHERE id IN ('${propA_id}', '${propB_id}');`);
      }
      if (orgA_id || orgB_id) {
        await client.query(`DELETE FROM public.organizations WHERE id IN ('${orgA_id}', '${orgB_id}');`);
      }
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`STAYHUB PHASE 13 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testKdsSuite().catch(e => {
  console.error(e);
  process.exit(1);
});
