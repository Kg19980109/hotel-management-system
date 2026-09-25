const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function runMigrations() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to PostgreSQL database for migration execution.');

  // Create migrations tracking table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS public._schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    const check = await client.query('SELECT version FROM public._schema_migrations WHERE version = $1;', [file]);
    if (check.rows.length > 0) {
      console.log(`[SKIP] Migration already applied: ${file}`);
      continue;
    }

    console.log(`[APPLYING] Migration: ${file}...`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('INSERT INTO public._schema_migrations (version) VALUES ($1);', [file]);
      await client.query('COMMIT');
      console.log(`[SUCCESS] Migration applied: ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[ERROR] Migration failed: ${file}`, err);
      process.exit(1);
    }
  }

  console.log('All migrations executed successfully!');
  await client.end();
}

runMigrations().catch(err => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});
