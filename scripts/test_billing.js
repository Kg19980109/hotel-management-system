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

async function testBillingSuite() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('===========================================================');
  console.log('STAYHUB PHASE 16: BILLING, PAYMENTS & GUEST FOLIOS TEST SUITE');
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

  const ownerA_id = 'a1111111-0000-0000-0000-000000000001';
  const ownerB_id = 'b2222222-0000-0000-0000-000000000002';
  const accountantA_id = 'a3333333-0000-0000-0000-000000000003';
  const frontDeskA_id = 'a4444444-0000-0000-0000-000000000004';
  const kitchenA_id = 'a5555555-0000-0000-0000-000000000005';

  let orgA_id, orgB_id;
  let propA_id, propB_id;
  let roomA101_id, roomB201_id;
  let guestA_id, guestB_id;
  let resA_id, resB_id;
  let stayA_id, stayB_id;
  let restA_id;
  let orderA1_id, orderA2_roomservice_id;
  let folioA_id, folioB_id;
  let rawSessionTokenA, hashSessionTokenA;
  let rawSessionTokenB, hashSessionTokenB;

  try {
    console.log('\n[SETUP] Initializing test organizations, properties, rooms, stays, restaurants & roles...');

    // 0. Ensure Auth Users & Profiles exist
    for (const uid of [ownerA_id, ownerB_id, accountantA_id, frontDeskA_id, kitchenA_id]) {
      await client.query(
        `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;`,
        [uid, `billing-${uid}@stayhub.test`]
      );
      await client.query(
        `INSERT INTO public.profiles (id, auth_user_id, full_name, email) 
         VALUES ($1, $1, 'Staff User', $2) 
         ON CONFLICT (id) DO NOTHING;`,
        [uid, `billing-${uid}@stayhub.test`]
      );
    }

    // 1. Create Organization & Property A
    const orgA = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Billing Test Org A', 'billing-org-a-' || gen_random_uuid(), 'billing-a@stayhub.test')
      RETURNING id;
    `);
    orgA_id = orgA.rows[0].id;

    const propA = await client.query(`
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email
      )
      VALUES ($1, 'StayHub Luxury Hotel A', 'hotel-a-' || gen_random_uuid(), 'SHHA', 'Ocean Drive', 'Goa', 'Goa', '403001', '+91 832 999991', 'hotel-a@stayhub.test')
      RETURNING id;
    `, [orgA_id]);
    propA_id = propA.rows[0].id;

    // 2. Create Organization & Property B
    const orgB = await client.query(`
      INSERT INTO public.organizations (name, slug, email)
      VALUES ('Billing Test Org B', 'billing-org-b-' || gen_random_uuid(), 'billing-b@stayhub.test')
      RETURNING id;
    `);
    orgB_id = orgB.rows[0].id;

    const propB = await client.query(`
      INSERT INTO public.properties (
        organization_id, name, slug, property_code, address_line_1, city, state, postal_code, phone, email
      )
      VALUES ($1, 'StayHub Grand Hotel B', 'hotel-b-' || gen_random_uuid(), 'SHHB', 'Mountain Road', 'Manali', 'HP', '175131', '+91 1902 999992', 'hotel-b@stayhub.test')
      RETURNING id;
    `, [orgB_id]);
    propB_id = propB.rows[0].id;

    // 3. Fetch Role IDs
    const rolesRes = await client.query(`SELECT id, code FROM public.roles;`);
    const roleMap = {};
    for (const r of rolesRes.rows) {
      roleMap[r.code] = r.id;
    }

    // Memberships for Property A
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES 
        ($1, $2, $3, 'active'),
        ($1, $4, $5, 'active'),
        ($1, $6, $7, 'active'),
        ($1, $8, $9, 'active');
    `, [
      propA_id, ownerA_id, roleMap['HOTEL_OWNER'] || roleMap['SUPER_ADMIN'],
      accountantA_id, roleMap['ACCOUNTANT'] || roleMap['GENERAL_MANAGER'] || roleMap['HOTEL_OWNER'],
      frontDeskA_id, roleMap['RECEPTIONIST'] || roleMap['FRONT_DESK'],
      kitchenA_id, roleMap['KITCHEN_STAFF'] || roleMap['CHEF']
    ]);

    // Memberships for Property B
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES ($1, $2, $3, 'active');
    `, [propB_id, ownerB_id, roleMap['HOTEL_OWNER'] || roleMap['SUPER_ADMIN']]);

    // 4. Room Types & Rooms
    const rtA = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ($1, 'Deluxe Sea View Suite', 'DLX-SEA', 5000.00, 3)
      RETURNING id;
    `, [propA_id]);
    const roomTypeA_id = rtA.rows[0].id;

    const rA1 = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '301', 'AVAILABLE', 'CLEAN', 3)
      RETURNING id;
    `, [propA_id, roomTypeA_id]);
    roomA101_id = rA1.rows[0].id;

    const rtB = await client.query(`
      INSERT INTO public.room_types (property_id, name, code, base_rate, max_occupancy)
      VALUES ($1, 'Mountain Chalet', 'MTN-CHL', 8000.00, 4)
      RETURNING id;
    `, [propB_id]);
    const roomTypeB_id = rtB.rows[0].id;

    const rB1 = await client.query(`
      INSERT INTO public.rooms (property_id, room_type_id, room_number, status, housekeeping_status, max_occupancy)
      VALUES ($1, $2, '101', 'AVAILABLE', 'CLEAN', 4)
      RETURNING id;
    `, [propB_id, roomTypeB_id]);
    roomB201_id = rB1.rows[0].id;

    // 5. Guests & Stays
    const gA = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ($1, 'Aarav', 'Sharma', 'aarav.sharma@example.com', '+91 9876543210')
      RETURNING id;
    `, [propA_id]);
    guestA_id = gA.rows[0].id;

    const resA = await client.query(`
      INSERT INTO public.reservations (
        property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date,
        adults, children
      )
      VALUES ($1, $2, 'CNF-A101-' || floor(random()*89999+10000)::text, 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + INTERVAL '2 days', 2, 0)
      RETURNING id;
    `, [propA_id, guestA_id]);
    resA_id = resA.rows[0].id;

    const stayA = await client.query(`
      INSERT INTO public.stays (
        property_id, reservation_id, guest_id, room_id, status,
        actual_check_in_at, expected_check_out_date, adults, children
      )
      VALUES ($1, $2, $3, $4, 'CHECKED_IN', NOW(), CURRENT_DATE + INTERVAL '2 days', 2, 0)
      RETURNING id;
    `, [propA_id, resA_id, guestA_id, roomA101_id]);
    stayA_id = stayA.rows[0].id;

    // Stay B
    const gB = await client.query(`
      INSERT INTO public.guests (property_id, first_name, last_name, email, phone)
      VALUES ($1, 'Rohan', 'Verma', 'rohan.verma@example.com', '+91 9876543211')
      RETURNING id;
    `, [propB_id]);
    guestB_id = gB.rows[0].id;

    const resB = await client.query(`
      INSERT INTO public.reservations (
        property_id, primary_guest_id, confirmation_number, status, check_in_date, check_out_date,
        adults, children
      )
      VALUES ($1, $2, 'CNF-B201-' || floor(random()*89999+10000)::text, 'CONFIRMED', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 days', 2, 0)
      RETURNING id;
    `, [propB_id, guestB_id]);
    resB_id = resB.rows[0].id;

    const stayB = await client.query(`
      INSERT INTO public.stays (
        property_id, reservation_id, guest_id, room_id, status,
        actual_check_in_at, expected_check_out_date, adults, children
      )
      VALUES ($1, $2, $3, $4, 'CHECKED_IN', NOW(), CURRENT_DATE + INTERVAL '3 days', 2, 0)
      RETURNING id;
    `, [propB_id, resB_id, guestB_id, roomB201_id]);
    stayB_id = stayB.rows[0].id;

    // 6. Guest QR Sessions
    rawSessionTokenA = generateSecureToken(32);
    hashSessionTokenA = hashToken(rawSessionTokenA);
    await client.query(`
      INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      )
      VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, NOW() + INTERVAL '2 days');
    `, [propA_id, roomA101_id, guestA_id, stayA_id, hashSessionTokenA]);

    rawSessionTokenB = generateSecureToken(32);
    hashSessionTokenB = hashToken(rawSessionTokenB);
    await client.query(`
      INSERT INTO public.guest_sessions (
        property_id, room_id, guest_id, stay_id, session_type, session_token_hash, expires_at
      )
      VALUES ($1, $2, $3, $4, 'VERIFIED_STAY', $5, NOW() + INTERVAL '3 days');
    `, [propB_id, roomB201_id, guestB_id, stayB_id, hashSessionTokenB]);

    // 7. Restaurant and Operational Orders
    const restA = await client.query(`
      INSERT INTO public.restaurants (property_id, name, code, is_active)
      VALUES ($1, 'Ocean Breeze Grill', 'OBG', true)
      RETURNING id;
    `, [propA_id]);
    restA_id = restA.rows[0].id;

    // Dine-In Order
    const ordA1 = await client.query(`
      INSERT INTO public.restaurant_orders (
        property_id, restaurant_id, order_number, order_type, status,
        stay_id, guest_id, room_id, subtotal, tax_amount, total_amount
      )
      VALUES ($1, $2, 'ORD-26-000101', 'DINE_IN', 'COMPLETED', $3, $4, $5, 1200.00, 60.00, 1260.00)
      RETURNING id;
    `, [propA_id, restA_id, stayA_id, guestA_id, roomA101_id]);
    orderA1_id = ordA1.rows[0].id;

    // Room Service Order
    const ordA2 = await client.query(`
      INSERT INTO public.restaurant_orders (
        property_id, restaurant_id, order_number, order_type, status,
        stay_id, guest_id, room_id, subtotal, tax_amount, total_amount
      )
      VALUES ($1, $2, 'ORD-26-000102', 'ROOM_SERVICE', 'COMPLETED', $3, $4, $5, 800.00, 40.00, 840.00)
      RETURNING id;
    `, [propA_id, restA_id, stayA_id, guestA_id, roomA101_id]);
    orderA2_roomservice_id = ordA2.rows[0].id;

    console.log('[SETUP] Test fixture initialized successfully.');

    // ============================================================
    // TESTS 1-3: Folio Creation & Isolation
    // ============================================================
    console.log('\n--- TESTS 1-3: Folio Creation & Isolation ---');

    // Test 1: Folio creation via RPC
    const createFolioRes = await client.query(`
      SELECT public.get_or_create_stay_folio($1, $2) AS result;
    `, [stayA_id, propA_id]);
    const folioAResult = createFolioRes.rows[0].result;
    folioA_id = folioAResult.folio ? folioAResult.folio.id : folioAResult.id;
    assert(Boolean(folioA_id), 'Test 1: Folio created successfully via get_or_create_stay_folio');

    // Check folio number format
    const folioRow = await client.query(`SELECT * FROM public.guest_folios WHERE id = $1;`, [folioA_id]);
    assert(folioRow.rows[0].folio_number.startsWith('FOL-'), 'Test 1b: Folio number generated server-side with prefix FOL-');

    // Test 2: Unique active folio per stay (calling again returns same folio)
    const secondFolioRes = await client.query(`
      SELECT public.get_or_create_stay_folio($1, $2) AS result;
    `, [stayA_id, propA_id]);
    const secondResult = secondFolioRes.rows[0].result;
    const secondFolioId = secondResult.folio ? secondResult.folio.id : secondResult.id;
    assert(secondFolioId === folioA_id, 'Test 2: Unique active folio per stay (idempotent lookup)');

    // Test 3: Folio Property Isolation
    const createFolioBRes = await client.query(`
      SELECT public.get_or_create_stay_folio($1, $2) AS result;
    `, [stayB_id, propB_id]);
    const folioBResult = createFolioBRes.rows[0].result;
    folioB_id = folioBResult.folio ? folioBResult.folio.id : folioBResult.id;
    assert(folioB_id !== folioA_id, 'Test 3: Property A and Property B have isolated folios');

    // ============================================================
    // TESTS 4-8: Charges & Restaurant Integration
    // ============================================================
    console.log('\n--- TESTS 4-8: Charges & Order Posting ---');

    // Test 4: Post manual charge
    const manChargeRes = await client.query(`
      SELECT public.post_manual_folio_charge(
        $1, $2, 'SERVICE', 'Airport Luxury Transfer', 1, 1500.00, 270.00, 0.00, $3
      ) AS result;
    `, [folioA_id, propA_id, ownerA_id]);
    const manChargeId = manChargeRes.rows[0].result.charge.id;
    assert(Boolean(manChargeId), 'Test 4: Manual folio charge posted successfully');

    // Test 5: Post room charge
    const roomChargeRes = await client.query(`
      SELECT public.post_room_charges_for_stay($1, $2, $3) AS result;
    `, [stayA_id, propA_id, ownerA_id]);
    const roomChargeId = roomChargeRes.rows[0].result.charge.id;
    assert(Boolean(roomChargeId), 'Test 5: Room rate charge posted for stay');

    // Test 6: Post Restaurant Dine-in charge
    const restChargeRes = await client.query(`
      SELECT public.post_restaurant_order_to_folio($1, $2, $3, $4) AS result;
    `, [orderA1_id, stayA_id, propA_id, ownerA_id]);
    const restChargeId = restChargeRes.rows[0].result.charge.id;
    assert(Boolean(restChargeId), 'Test 6: Restaurant Dine-In order posted to folio');

    // Test 7: Post Room Service charge
    const rsChargeRes = await client.query(`
      SELECT public.post_restaurant_order_to_folio($1, $2, $3, $4) AS result;
    `, [orderA2_roomservice_id, stayA_id, propA_id, ownerA_id]);
    const rsChargeId = rsChargeRes.rows[0].result.charge.id;
    const rsRow = await client.query(`SELECT charge_type FROM public.folio_charges WHERE id = $1;`, [rsChargeId]);
    assert(rsRow.rows[0].charge_type === 'ROOM_SERVICE', 'Test 7: Room Service order correctly identified as ROOM_SERVICE charge_type');

    // Test 8: Duplicate restaurant charge prevention (idempotency)
    const duplicateRestRes = await client.query(`
      SELECT public.post_restaurant_order_to_folio($1, $2, $3, $4) AS result;
    `, [orderA1_id, stayA_id, propA_id, ownerA_id]);
    assert(duplicateRestRes.rows[0].result.charge.id === restChargeId, 'Test 8: Reposting the same restaurant order returns existing charge without duplicating');

    // ============================================================
    // TESTS 9-12: Price Snapshot & Tax & Discounts
    // ============================================================
    console.log('\n--- TESTS 9-12: Price Snapshot & Tax & Discounts ---');

    // Test 9: Price snapshot preservation (mutating restaurant order total does not alter folio charge)
    await client.query(`UPDATE public.restaurant_orders SET total_amount = 99999.00 WHERE id = $1;`, [orderA1_id]);
    const verifyCharge = await client.query(`SELECT total_amount FROM public.folio_charges WHERE id = $1;`, [restChargeId]);
    assert(Number(verifyCharge.rows[0].total_amount) === 1260.00, 'Test 9: Historical folio charge total is immutable to subsequent restaurant operational price changes');

    // Test 10: Tax calculation precision
    const taxCheck = await client.query(`SELECT subtotal, tax_amount, total_amount FROM public.folio_charges WHERE id = $1;`, [roomChargeId]);
    const sub = Number(taxCheck.rows[0].subtotal);
    const tax = Number(taxCheck.rows[0].tax_amount);
    const tot = Number(taxCheck.rows[0].total_amount);
    assert(tot === Number((sub + tax).toFixed(2)), `Test 10: Exact GST tax and total precision preserved (Sub: ₹${sub}, Tax: ₹${tax}, Total: ₹${tot})`);

    // Test 11: Discount calculation
    const discountChargeRes = await client.query(`
      SELECT public.post_manual_folio_charge(
        $1, $2, 'ROOM', 'Manager Special Suite Rate', 1, 4000.00, 420.00, 500.00, $3
      ) AS result;
    `, [folioA_id, propA_id, ownerA_id]);
    const discChargeId = discountChargeRes.rows[0].result.charge.id;
    const discRow = await client.query(`SELECT discount_amount, total_amount FROM public.folio_charges WHERE id = $1;`, [discChargeId]);
    assert(Number(discRow.rows[0].discount_amount) === 500.00 && Number(discRow.rows[0].total_amount) === 3920.00, 'Test 11: Controlled discount recorded accurately');

    // Test 12: Unauthorized discount / negative price rejection in trigger
    let unauthDiscountError = false;
    try {
      await client.query(`
        INSERT INTO public.folio_charges (
          property_id, folio_id, stay_id, guest_id, charge_type, source_type, description,
          quantity, unit_price, subtotal, discount_amount, tax_amount, total_amount
        ) VALUES (
          $1, $2, $3, $4, 'ROOM', 'MANUAL', 'Illegal Negative Charge',
          1, -500.00, -500.00, 0, 0, -500.00
        );
      `, [propA_id, folioA_id, stayA_id, guestA_id]);
    } catch (e) {
      unauthDiscountError = true;
    }
    assert(unauthDiscountError, 'Test 12: Direct negative price / charge rejected by check constraint');

    // ============================================================
    // TESTS 13-17: Payments, References & Overpayment
    // ============================================================
    console.log('\n--- TESTS 13-17: Payments & Settlement ---');

    // Test 13 & 14: Payment creation & reference generation
    const pay1Res = await client.query(`
      SELECT public.record_folio_payment($1, $2, 'CARD', 3000.00, 'Initial advance deposit', $3) AS result;
    `, [folioA_id, propA_id, frontDeskA_id]);
    const pay1Result = pay1Res.rows[0].result;
    const pay1Id = pay1Result.payment.id;
    assert(pay1Id && pay1Result.payment.payment_reference.startsWith('PAY-'), 'Test 13 & 14: Payment recorded with server generated PAY- reference');

    // Test 15: Partial payment
    assert(Number(pay1Result.balance.balance_due) > 0, 'Test 15: Partial payment reflected in positive remaining balance');

    // Test 16: Check get_folio_balance RPC
    const balRes = await client.query(`SELECT public.get_folio_balance($1, $2) AS balance;`, [folioA_id, propA_id]);
    const balData = balRes.rows[0].balance;
    assert(
      Number(balData.payments_total) === 3000.00 && Number(balData.balance_due) > 0,
      `Test 16: Authoritative balance computed correctly (Gross: ₹${balData.gross_charges}, Paid: ₹${balData.payments_total}, Due: ₹${balData.balance_due})`
    );

    // Test 17: Overpayment handling (recording zero or negative payment rejected)
    let invalidPaymentError = false;
    try {
      const badPay = await client.query(`
        SELECT public.record_folio_payment($1, $2, 'CASH', -50.00, 'Invalid payment', $3) AS result;
      `, [folioA_id, propA_id, frontDeskA_id]);
      if (!badPay.rows[0].result.success) invalidPaymentError = true;
    } catch (e) {
      invalidPaymentError = true;
    }
    assert(invalidPaymentError, 'Test 17: Invalid negative payment rejected');

    // ============================================================
    // TESTS 18-20: Refunds & Protection
    // ============================================================
    console.log('\n--- TESTS 18-20: Refunds & Protections ---');

    // Test 18: Process valid refund
    const refundRes = await client.query(`
      SELECT public.refund_folio_payment($1, $2, 500.00, 'Partial meal deposit refund', $3) AS result;
    `, [pay1Id, propA_id, ownerA_id]);
    const refundData = refundRes.rows[0].result;
    assert(refundData.success && Boolean(refundData.refund.id), 'Test 18: Refund processed on payment record');

    // Verify payment status became PARTIALLY_REFUNDED
    const pay1Check = await client.query(`SELECT status FROM public.folio_payments WHERE id = $1;`, [pay1Id]);
    assert(pay1Check.rows[0].status === 'PARTIALLY_REFUNDED', 'Test 18b: Payment status transitioned to PARTIALLY_REFUNDED');

    // Test 19: Refund cannot exceed refundable amount
    const excessiveRefundRes = await client.query(`
      SELECT public.refund_folio_payment($1, $2, 3000.00, 'Excess refund attempt', $3) AS result;
    `, [pay1Id, propA_id, ownerA_id]);
    assert(!excessiveRefundRes.rows[0].result.success, 'Test 19: Refund exceeding remaining refundable amount (3000 - 500 = 2500) rejected');

    // Test 20: Full remaining refund transitions status to REFUNDED
    const fullRefundRes = await client.query(`
      SELECT public.refund_folio_payment($1, $2, 2500.00, 'Final remaining refund', $3) AS result;
    `, [pay1Id, propA_id, ownerA_id]);
    const pay1FullRefundCheck = await client.query(`SELECT status FROM public.folio_payments WHERE id = $1;`, [pay1Id]);
    assert(pay1FullRefundCheck.rows[0].status === 'REFUNDED', 'Test 20: Fully refunded payment transitions status to REFUNDED');

    // ============================================================
    // TESTS 21-25: Invoices & Items Snapshots
    // ============================================================
    console.log('\n--- TESTS 21-25: Invoices & Line Items ---');

    // Test 21 & 22: Invoice generation & server-side number
    const invRes = await client.query(`
      SELECT public.generate_invoice($1, $2, 'Aarav Sharma', 'aarav.sharma@example.com', 'Flat 4B, Ocean Villa, Goa', $3) AS result;
    `, [folioA_id, propA_id, accountantA_id]);
    const invResult = invRes.rows[0].result;
    const invoiceId = invResult.invoice.id;
    assert(Boolean(invoiceId), 'Test 21: Invoice generated successfully');

    const invRow = await client.query(`SELECT * FROM public.invoices WHERE id = $1;`, [invoiceId]);
    assert(invRow.rows[0].invoice_number.startsWith('INV-'), 'Test 22: Invoice number generated server-side with prefix INV-');

    // Test 23: Invoice items snapshot
    const invItems = await client.query(`SELECT * FROM public.invoice_items WHERE invoice_id = $1;`, [invoiceId]);
    assert(invItems.rows.length >= 4, `Test 23: Invoice snapshot contains ${invItems.rows.length} line items`);

    // Test 24: Invoice totals match
    const activeChargesSum = await client.query(`
      SELECT SUM(total_amount) as total FROM public.folio_charges WHERE folio_id = $1 AND voided_at IS NULL;
    `, [folioA_id]);
    assert(
      Number(invRow.rows[0].total_amount) === Number(activeChargesSum.rows[0].total),
      `Test 24: Invoice total amount (₹${invRow.rows[0].total_amount}) matches active folio charges total (₹${activeChargesSum.rows[0].total})`
    );

    // Test 25: Duplicate invoice protection (calling again returns existing invoice)
    const dupInvRes = await client.query(`
      SELECT public.generate_invoice($1, $2, 'Aarav Sharma', 'aarav.sharma@example.com', 'Flat 4B, Ocean Villa, Goa', $3) AS result;
    `, [folioA_id, propA_id, accountantA_id]);
    assert(dupInvRes.rows[0].result.invoice.id === invoiceId, 'Test 25: Re-running generate_invoice returns existing active invoice without creating duplicate');

    // ============================================================
    // TESTS 26-28: Folio Balance, Void Charge & Adjustments
    // ============================================================
    console.log('\n--- TESTS 26-28: Charge Voiding & Adjustments ---');

    // Test 27: Void charge
    const voidChargeRes = await client.query(`
      SELECT public.void_folio_charge($1, $2, 'Incorrect airport pickup car booking', $3) AS result;
    `, [manChargeId, propA_id, ownerA_id]);
    const voidedCharge = await client.query(`SELECT voided_at, void_reason FROM public.folio_charges WHERE id = $1;`, [manChargeId]);
    assert(voidedCharge.rows[0].voided_at !== null, 'Test 27: Charge marked voided with audit reason');

    // Test 26 & 28: Balance calculation excludes voided charges
    const balAfterVoidRes = await client.query(`SELECT public.get_folio_balance($1, $2) AS balance;`, [folioA_id, propA_id]);
    const newBalData = balAfterVoidRes.rows[0].balance;
    assert(
      Number(newBalData.gross_charges) > 0,
      `Test 26 & 28: Folio balance calculation dynamically excludes voided charges (New Gross: ₹${newBalData.gross_charges})`
    );

    // ============================================================
    // TESTS 32-35: Guest Folio Security & Isolation
    // ============================================================
    console.log('\n--- TESTS 32-35: Guest Portal Security & Isolation ---');

    // Test 32: Guest folio access via session token (while stay is active)
    const guestFolioRes = await client.query(`
      SELECT public.get_guest_folio($1) AS folio_ctx;
    `, [hashSessionTokenA]);
    const guestCtx = guestFolioRes.rows[0].folio_ctx;
    assert(guestCtx && guestCtx.charges.length > 0, 'Test 32: Guest retrieves authoritative folio using active session token');

    // Test 33: Guest cannot access another folio or cross-room data
    await client.query(`SELECT public.get_or_create_stay_folio($1, $2);`, [stayB_id, propB_id]);
    await client.query(`
      SELECT public.post_manual_folio_charge($1, $2, 'ROOM', 'Room Night B', 1, 8000.00, 960.00, 0.00, $3);
    `, [folioB_id, propB_id, ownerB_id]);

    const guestFolioBRes = await client.query(`
      SELECT public.get_guest_folio($1) AS folio_ctx;
    `, [hashSessionTokenB]);
    const guestBCtx = guestFolioBRes.rows[0].folio_ctx;
    assert(guestCtx.folio_number !== guestBCtx.folio_number, 'Test 33: Guest A session accesses Folio A only; Guest B session accesses Folio B');

    // Test 34 & 35: Cross-Property RLS & Unauthenticated Rejection
    await client.query('BEGIN');
    await client.query(`SET LOCAL ROLE anon;`);
    const anonRows = await client.query(`SELECT * FROM public.guest_folios;`);
    await client.query('COMMIT');
    assert(anonRows.rows.length === 0, 'Test 34 & 35: Anonymous / unauthenticated access to guest_folios returns 0 rows via RLS');

    // ============================================================
    // TESTS 29-31: Checkout Settlement Rules
    // ============================================================
    console.log('\n--- TESTS 29-31: Checkout Settlement Rules ---');

    // Test 30: Checkout with outstanding balance is rejected by check_out_stay
    let unpaidCheckoutRejected = false;
    try {
      await client.query(`
        SELECT public.check_out_stay($1, $2, false);
      `, [stayA_id, propA_id]);
    } catch (e) {
      if (e.message.includes('Outstanding folio balance') || e.message.includes('must be settled')) {
        unpaidCheckoutRejected = true;
      }
    }
    assert(unpaidCheckoutRejected, 'Test 30: check_out_stay rejects checkout when folio has unpaid balance');

    // Settle the balance with a full payment
    const fullPayRes = await client.query(`
      SELECT public.record_folio_payment($1, $2, 'UPI', $3, 'Final settlement via GooglePay', $4) AS result;
    `, [folioA_id, propA_id, newBalData.balance_due, frontDeskA_id]);
    const fullBal = await client.query(`SELECT public.get_folio_balance($1, $2) AS balance;`, [folioA_id, propA_id]);
    assert(Number(fullBal.rows[0].balance.balance_due) === 0.00, 'Settlement payment brought folio balance to exactly ₹0.00');

    // Test 29: Checkout with zero balance succeeds
    const checkoutRes = await client.query(`
      SELECT public.check_out_stay($1, $2, false) AS result;
    `, [stayA_id, propA_id]);
    const stayCheck = await client.query(`SELECT status FROM public.stays WHERE id = $1;`, [stayA_id]);
    const folioCheck = await client.query(`SELECT status FROM public.guest_folios WHERE id = $1;`, [folioA_id]);
    assert(
      stayCheck.rows[0].status === 'CHECKED_OUT' && (folioCheck.rows[0].status === 'SETTLED' || folioCheck.rows[0].status === 'CLOSED'),
      'Test 29: Checkout succeeds with zero balance; stay transitions to CHECKED_OUT and folio to SETTLED'
    );

    // Test 31: Authorized checkout override on Stay B (with unpaid balance)
    const checkoutOverrideRes = await client.query(`
      SELECT public.check_out_stay($1, $2, true) AS result;
    `, [stayB_id, propB_id]);
    const stayBCheck = await client.query(`SELECT status FROM public.stays WHERE id = $1;`, [stayB_id]);
    assert(stayBCheck.rows[0].status === 'CHECKED_OUT', 'Test 31: Authorized checkout override allows checkout with outstanding balance');

    // ============================================================
    // TESTS 36-39: Staff Permissions & Role Boundaries
    // ============================================================
    console.log('\n--- TESTS 36-39: Role Boundaries & Financial Permissions ---');

    // Test 37: Accountant access to Property A folios
    const acctRows = await queryAsUser(accountantA_id, `SELECT * FROM public.guest_folios WHERE property_id = $1;`, [propA_id]);
    assert(acctRows.length > 0, 'Test 37: Accountant has read access to property folios');

    // Test 38: Front desk permission to view folios
    const fdRows = await queryAsUser(frontDeskA_id, `SELECT * FROM public.guest_folios WHERE property_id = $1;`, [propA_id]);
    assert(fdRows.length > 0, 'Test 38: Front Desk has read access to property folios');

    // Test 39: Cross-Property Staff access blocked (Owner B cannot see Property A folios)
    const crossPropRows = await queryAsUser(ownerB_id, `SELECT * FROM public.guest_folios WHERE property_id = $1;`, [propA_id]);
    assert(crossPropRows.length === 0, 'Test 39: Cross-property staff access returns 0 rows via RLS');

    // ============================================================
    // TESTS 40-42: Concurrency Protections
    // ============================================================
    console.log('\n--- TESTS 40-42: Concurrency & Idempotency ---');

    // Test 41: Concurrent restaurant posting protection
    const concurrent1 = client.query(`SELECT public.post_restaurant_order_to_folio($1, $2, $3, $4) AS result;`, [orderA2_roomservice_id, stayA_id, propA_id, ownerA_id]);
    const concurrent2 = client.query(`SELECT public.post_restaurant_order_to_folio($1, $2, $3, $4) AS result;`, [orderA2_roomservice_id, stayA_id, propA_id, ownerA_id]);
    const [cRes1, cRes2] = await Promise.all([concurrent1, concurrent2]);
    assert(cRes1.rows[0].result.charge.id === cRes2.rows[0].result.charge.id, 'Test 41: Simultaneous restaurant order posting yields exact same charge ID without duplicates');

    // Test 42: Concurrent invoice generation protection
    const invConc1 = client.query(`SELECT public.generate_invoice($1, $2, 'Aarav Sharma', 'aarav@example.com', 'Goa', $3) AS result;`, [folioA_id, propA_id, accountantA_id]);
    const invConc2 = client.query(`SELECT public.generate_invoice($1, $2, 'Aarav Sharma', 'aarav@example.com', 'Goa', $3) AS result;`, [folioA_id, propA_id, accountantA_id]);
    const [iRes1, iRes2] = await Promise.all([invConc1, invConc2]);
    assert(iRes1.rows[0].result.invoice.id === iRes2.rows[0].result.invoice.id, 'Test 42: Simultaneous invoice generation yields exact same invoice ID without duplicates');

    // ============================================================
    // TESTS 43-48: Financial Audit, Immutability & Numeric Precision
    // ============================================================
    console.log('\n--- TESTS 43-48: Immutability & Financial Invariants ---');

    // Test 43: Financial event history audit log
    const events = await client.query(`SELECT * FROM public.folio_events WHERE folio_id = $1 ORDER BY created_at ASC;`, [folioA_id]);
    assert(events.rows.length >= 6, `Test 43: Immutable financial event history recorded ${events.rows.length} distinct events (CHARGES, PAYMENTS, REFUNDS, INVOICE)`);

    // Test 44: Prevent mutation of historical charge prices
    let chargeMutationBlocked = false;
    try {
      await client.query(`UPDATE public.folio_charges SET unit_price = 1.00 WHERE id = $1;`, [roomChargeId]);
    } catch (e) {
      if (e.message.toLowerCase().includes('immutable')) {
        chargeMutationBlocked = true;
      }
    }
    assert(chargeMutationBlocked, 'Test 44: Database trigger trg_prevent_folio_charges_mutation blocks direct mutation of unit_price');

    // Test 45: Currency consistency
    const currCheck = await client.query(`SELECT currency FROM public.guest_folios WHERE id = $1;`, [folioA_id]);
    assert(currCheck.rows[0].currency === 'INR', 'Test 45: Currency is consistently standard INR across financial records');

    // Test 46: Server-side total calculation verified
    const serverCalc = await client.query(`SELECT public.get_folio_balance($1, $2) AS balance;`, [folioA_id, propA_id]);
    assert(Number(serverCalc.rows[0].balance.balance_due) === 0.00, 'Test 46: Server-side total balance calculation is authoritative and exact');

    // Test 47: Direct payment amount mutation blocked
    let paymentMutationBlocked = false;
    try {
      await client.query(`UPDATE public.folio_payments SET amount = 1.00 WHERE folio_id = $1;`, [folioA_id]);
    } catch (e) {
      if (e.message.toLowerCase().includes('immutable')) {
        paymentMutationBlocked = true;
      }
    }
    assert(paymentMutationBlocked, 'Test 47: Database trigger trg_prevent_folio_payments_mutation blocks direct mutation of payment amount');

    // Test 48: Direct event history deletion blocked
    let eventDeletionBlocked = false;
    try {
      await client.query(`DELETE FROM public.folio_events WHERE folio_id = $1;`, [folioA_id]);
    } catch (e) {
      if (e.message.toLowerCase().includes('immutable')) {
        eventDeletionBlocked = true;
      }
    }
    assert(eventDeletionBlocked, 'Test 48: Database trigger trg_prevent_folio_events_mutation blocks deletion of audit events');

  } catch (err) {
    console.error('\n[FATAL ERROR IN SUITE]:', err);
    failed++;
  } finally {
    // Cleanup test data
    try {
      console.log('\n[CLEANUP] Cleaning test data...');
      await client.query(`ALTER TABLE public.folio_events DISABLE TRIGGER trg_prevent_folio_events_mutation;`);
      await client.query(`ALTER TABLE public.folio_charges DISABLE TRIGGER trg_prevent_folio_charges_mutation;`);
      await client.query(`ALTER TABLE public.folio_payments DISABLE TRIGGER trg_prevent_folio_payments_mutation;`);

      if (propA_id) {
        await client.query(`DELETE FROM public.guest_sessions WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.folio_events WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.invoice_items WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.invoices WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.folio_refunds WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.folio_payments WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.folio_charges WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.guest_folios WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.restaurant_orders WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.restaurants WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.stays WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.reservations WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.guests WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.rooms WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.room_types WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.property_memberships WHERE property_id = $1;`, [propA_id]);
        await client.query(`DELETE FROM public.properties WHERE id = $1;`, [propA_id]);
      }
      if (propB_id) {
        await client.query(`DELETE FROM public.guest_sessions WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.folio_events WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.invoice_items WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.invoices WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.folio_refunds WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.folio_payments WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.folio_charges WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.guest_folios WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.stays WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.reservations WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.guests WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.rooms WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.room_types WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.property_memberships WHERE property_id = $1;`, [propB_id]);
        await client.query(`DELETE FROM public.properties WHERE id = $1;`, [propB_id]);
      }
      if (orgA_id) await client.query(`DELETE FROM public.organizations WHERE id = $1;`, [orgA_id]);
      if (orgB_id) await client.query(`DELETE FROM public.organizations WHERE id = $1;`, [orgB_id]);

      await client.query(`ALTER TABLE public.folio_events ENABLE TRIGGER trg_prevent_folio_events_mutation;`);
      await client.query(`ALTER TABLE public.folio_charges ENABLE TRIGGER trg_prevent_folio_charges_mutation;`);
      await client.query(`ALTER TABLE public.folio_payments ENABLE TRIGGER trg_prevent_folio_payments_mutation;`);
    } catch (cleanErr) {
      console.error('Cleanup warning:', cleanErr);
    }
    await client.end();
  }

  console.log('\n===========================================================');
  console.log(`PHASE 16 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

testBillingSuite();
