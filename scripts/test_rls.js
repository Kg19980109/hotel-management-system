const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testRLS() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('--- STARTING ROW LEVEL SECURITY (RLS) VERIFICATION SUITE ---');

  // Generate test UUIDs
  const userA_id = 'a0000000-0000-0000-0000-000000000001';
  const userB_id = 'b0000000-0000-0000-0000-000000000002';
  const userC_id = 'c0000000-0000-0000-0000-000000000003'; // Unaffiliated user
  const superAdmin_id = 'd0000000-0000-0000-0000-000000000004'; // Super Admin

  let orgA_id, orgB_id, propA_id, propB_id;

  try {
    // 1. SETUP: Create test users in auth.users
    console.log('[SETUP] Creating mock auth users...');
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES 
        ('${userA_id}', 'usera@hotel-a.com', '{"full_name": "User Alpha"}', now(), now()),
        ('${userB_id}', 'userb@hotel-b.com', '{"full_name": "User Beta"}', now(), now()),
        ('${userC_id}', 'userc@external.com', '{"full_name": "User Gamma"}', now(), now()),
        ('${superAdmin_id}', 'admin@stayhub.in', '{"full_name": "Super Admin"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. SETUP: Create organizations and properties
    console.log('[SETUP] Creating organizations and properties...');
    const orgARes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Test Org Alpha', 'test-org-alpha', '${userA_id}')
      RETURNING id;
    `);
    orgA_id = orgARes.rows[0].id;

    const orgBRes = await client.query(`
      INSERT INTO public.organizations (name, slug, created_by)
      VALUES ('Test Org Beta', 'test-org-beta', '${userB_id}')
      RETURNING id;
    `);
    orgB_id = orgBRes.rows[0].id;

    const propARes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, created_by)
      VALUES ('${orgA_id}', 'Hotel Alpha', 'hotel-alpha', '123 Beach Road', 'Goa', 'Goa', '403001', '${userA_id}')
      RETURNING id;
    `);
    propA_id = propARes.rows[0].id;

    const propBRes = await client.query(`
      INSERT INTO public.properties (organization_id, name, slug, address_line_1, city, state, postal_code, created_by)
      VALUES ('${orgB_id}', 'Hotel Beta', 'hotel-beta', '456 Hill Road', 'Shimla', 'HP', '171001', '${userB_id}')
      RETURNING id;
    `);
    propB_id = propBRes.rows[0].id;

    // Fetch role IDs
    const rolesRes = await client.query(`SELECT id, code FROM public.roles;`);
    const roles = Object.fromEntries(rolesRes.rows.map(r => [r.code, r.id]));

    // 3. SETUP: Create memberships
    // User A -> Hotel A (HOTEL_OWNER)
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES ('${propA_id}', '${userA_id}', '${roles['HOTEL_OWNER']}', 'active');
    `);

    // User B -> Hotel B (HOTEL_OWNER)
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES ('${propB_id}', '${userB_id}', '${roles['HOTEL_OWNER']}', 'active');
    `);

    // Super Admin -> Hotel A (SUPER_ADMIN)
    await client.query(`
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES ('${propA_id}', '${superAdmin_id}', '${roles['SUPER_ADMIN']}', 'active');
    `);

    console.log('[SETUP] Test fixtures initialized successfully.\n');

    // HELPER: execute query as authenticated user with Supabase JWT claims
    async function queryAsUser(userId, sql) {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE authenticated;`);
      await client.query(`SELECT set_config('request.jwt.claims', '{"sub": "${userId}", "role": "authenticated"}', true);`);
      const result = await client.query(sql);
      await client.query('COMMIT');
      return result.rows;
    }

    // TEST 1: User A can access Property A
    console.log('TEST 1: User A querying Property A...');
    const t1 = await queryAsUser(userA_id, `SELECT id, name FROM public.properties WHERE id = '${propA_id}';`);
    if (t1.length === 1 && t1[0].name === 'Hotel Alpha') {
      console.log('✓ PASS: User A successfully accessed Property A.');
    } else {
      throw new Error(`FAIL: User A could not access Property A.`);
    }

    // TEST 2: User A CANNOT access Property B
    console.log('TEST 2: User A querying Property B (cross-tenant)...');
    const t2 = await queryAsUser(userA_id, `SELECT id, name FROM public.properties WHERE id = '${propB_id}';`);
    if (t2.length === 0) {
      console.log('✓ PASS: User A was blocked from seeing Property B (0 rows returned).');
    } else {
      throw new Error(`FAIL: User A saw Property B! Cross-tenant leak!`);
    }

    // TEST 3: User B can access Property B
    console.log('TEST 3: User B querying Property B...');
    const t3 = await queryAsUser(userB_id, `SELECT id, name FROM public.properties WHERE id = '${propB_id}';`);
    if (t3.length === 1 && t3[0].name === 'Hotel Beta') {
      console.log('✓ PASS: User B successfully accessed Property B.');
    } else {
      throw new Error(`FAIL: User B could not access Property B.`);
    }

    // TEST 4: User B CANNOT access Property A
    console.log('TEST 4: User B querying Property A (cross-tenant)...');
    const t4 = await queryAsUser(userB_id, `SELECT id, name FROM public.properties WHERE id = '${propA_id}';`);
    if (t4.length === 0) {
      console.log('✓ PASS: User B was blocked from seeing Property A (0 rows returned).');
    } else {
      throw new Error(`FAIL: User B saw Property A! Cross-tenant leak!`);
    }

    // TEST 5: Organization A cannot be accessed by User B
    console.log('TEST 5: User B querying Organization A...');
    const t5 = await queryAsUser(userB_id, `SELECT id, name FROM public.organizations WHERE id = '${orgA_id}';`);
    if (t5.length === 0) {
      console.log('✓ PASS: User B was blocked from seeing Organization A.');
    } else {
      throw new Error(`FAIL: User B saw Organization A! Organization leak!`);
    }

    // TEST 6: User C (unaffiliated) cannot access Property A or Property B
    console.log('TEST 6: Unaffiliated User C querying properties...');
    const t6 = await queryAsUser(userC_id, `SELECT id, name FROM public.properties;`);
    if (t6.length === 0) {
      console.log('✓ PASS: Unaffiliated user sees 0 properties.');
    } else {
      throw new Error(`FAIL: Unaffiliated user was able to view properties!`);
    }

    // TEST 7: Unauthorized role cannot perform protected operations (e.g. UPDATE)
    console.log('TEST 7: User with RECEPTIONIST role attempting to UPDATE property settings...');
    // Create User D as RECEPTIONIST in Property A
    const userD_id = 'd0000000-0000-0000-0000-000000000005';
    await client.query(`
      INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at)
      VALUES ('${userD_id}', 'userd@hotel-a.com', '{"full_name": "Receptionist Dave"}', now(), now())
      ON CONFLICT (id) DO NOTHING;
      INSERT INTO public.property_memberships (property_id, user_id, role_id, status)
      VALUES ('${propA_id}', '${userD_id}', '${roles['RECEPTIONIST']}', 'active');
    `);

    let updateSucceeded = false;
    try {
      await client.query('BEGIN');
      await client.query(`SET LOCAL ROLE authenticated;`);
      await client.query(`SELECT set_config('request.jwt.claims', '{"sub": "${userD_id}", "role": "authenticated"}', true);`);
      const updateRes = await client.query(`UPDATE public.properties SET name = 'Hacked Name' WHERE id = '${propA_id}' RETURNING id;`);
      await client.query('COMMIT');
      if (updateRes.rows.length > 0) updateSucceeded = true;
    } catch(e) {
      await client.query('ROLLBACK');
    }

    if (!updateSucceeded) {
      console.log('✓ PASS: RECEPTIONIST role blocked from updating property (RLS policy denied update).');
    } else {
      throw new Error(`FAIL: RECEPTIONIST role was able to update property!`);
    }

    // TEST 8: Super Admin can access all properties across organizations
    console.log('TEST 8: Super Admin querying all properties across organizations...');
    const t8 = await queryAsUser(superAdmin_id, `SELECT id, name FROM public.properties;`);
    if (t8.length >= 2) {
      console.log(`✓ PASS: Super Admin accessed all properties (${t8.length} properties returned across organizations).`);
    } else {
      throw new Error(`FAIL: Super admin was restricted from platform-level visibility!`);
    }

    console.log('\n======================================================');
    console.log('ALL 8 RLS TENANT ISOLATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');

  } catch(err) {
    console.error('RLS TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    // 4. CLEANUP: Delete all test records
    console.log('\n[CLEANUP] Removing test fixtures...');
    try {
      if (propA_id) await client.query(`DELETE FROM public.properties WHERE id IN ('${propA_id}', '${propB_id}');`);
      if (orgA_id) await client.query(`DELETE FROM public.organizations WHERE id IN ('${orgA_id}', '${orgB_id}');`);
      await client.query(`DELETE FROM auth.users WHERE id IN ('${userA_id}', '${userB_id}', '${userC_id}', '${superAdmin_id}', 'd0000000-0000-0000-0000-000000000005');`);
      console.log('[CLEANUP] Test fixtures successfully cleaned up.');
    } catch(cleanupErr) {
      console.error('[CLEANUP] Error during cleanup:', cleanupErr);
    }
    await client.end();
  }
}

testRLS().catch(console.error);
