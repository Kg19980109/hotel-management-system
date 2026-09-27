const { Client } = require('pg');
const connectionString = 'postgresql://postgres.tfnusdxtwqzrzblujaju:Koushik@0109@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const res = await client.query('SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;');
    console.log('supabase_migrations:', res.rows);
  } catch (e) {
    console.log('No supabase_migrations', e.message);
  }
  
  try {
    const res2 = await client.query('SELECT version FROM public._schema_migrations ORDER BY version;');
    console.log('_schema_migrations:', res2.rows);
  } catch (e) {
    console.log('No public._schema_migrations', e.message);
  }
  await client.end();
}

check();
