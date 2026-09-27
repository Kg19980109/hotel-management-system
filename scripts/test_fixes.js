const { Client } = require('pg');

const connectionString = 'postgresql://postgres.tfnusdxtwqzrzblujaju:Koushik@0109@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function runTest() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('--- 1. Testing Menu Items Query ---');
  const items = await client.query(`
    SELECT m.id, m.name, m.price, m.currency, r.name as restaurant_name, r.property_id, r.id as restaurant_id
    FROM menu_items m
    JOIN restaurants r ON m.restaurant_id = r.id
    WHERE m.is_active = true AND r.is_active = true
    LIMIT 5;
  `);
  console.log('Found active menu items:', items.rows);

  if (items.rows.length === 0) {
    console.error('No active menu items found!');
    await client.end();
    return;
  }

  const sample = items.rows[0];

  console.log('--- 2. Testing create_restaurant_order RPC with auth UID ---');
  await client.query("SET LOCAL \"request.jwt.claim.sub\" = 'd875dfa4-923b-4f0c-b6fd-7788390be593'");
  
  const orderRes = await client.query(`
    SELECT public.create_restaurant_order(
      $1::uuid,
      $2::uuid,
      'TAKEAWAY',
      $3::jsonb,
      NULL,
      0,
      0,
      0,
      'Test order from verification script'
    ) as res;
  `, [sample.property_id, sample.restaurant_id, JSON.stringify([{ menu_item_id: sample.id, quantity: 2 }])]);

  console.log('Order created successfully:', orderRes.rows[0].res);
  const createdOrderId = orderRes.rows[0].res.order_id;

  console.log('--- 3. Testing complete_restaurant_order RPC ---');
  const compRes = await client.query(`
    SELECT public.complete_restaurant_order($1::uuid, $2::uuid, 'Cash Settlement') as res;
  `, [createdOrderId, sample.property_id]);
  console.log('Order completed successfully:', compRes.rows[0].res);

  console.log('--- 4. Checking guest dining outlets ---');
  const restRes = await client.query(`
    SELECT id, name, cuisine_type, is_active FROM restaurants WHERE property_id = $1 AND is_active = true;
  `, [sample.property_id]);
  console.log('Available dining outlets for property:', restRes.rows);

  await client.end();
  console.log('=== ALL TESTS PASSED SUCCESSFULLY! ===');
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
