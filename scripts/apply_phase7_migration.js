const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

let connectionString = process.env.DATABASE_URL;
if (!connectionString && fs.existsSync(path.join(__dirname, '../.env.local'))) {
  const envContent = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('DATABASE_URL=')) {
      connectionString = line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
      break;
    }
  }
}

async function applyMigration() {
  const client = new Client({ connectionString });
  await client.connect();

  console.log('Connected to database. Applying Phase 7 migration...');

  const sqlPath = path.join(__dirname, '../supabase/migrations/20260927000001_phase7_food_ordering_e2e_sync.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✓ Successfully applied Phase 7 migration.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
