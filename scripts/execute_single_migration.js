const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.tfnusdxtwqzrzblujaju:Koushik@0109@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL database.');

  const file = '20260927000002_enable_realtime_all_tables.sql';
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  console.log(`[APPLYING] Migration: ${file}...`);
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  
  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('COMMIT');
    console.log(`[SUCCESS] Migration applied: ${file}`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`[ERROR] Migration failed: ${file}`, err);
    process.exit(1);
  }

  await client.end();
}

run().catch(err => {
  console.error('Runner failed:', err);
  process.exit(1);
});
