const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres'
});

async function listTables() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("TABLES FOUND:");
    res.rows.forEach(row => console.log(row.table_name));
  } catch (err) {
    console.error('Error fetching tables:', err);
  } finally {
    await client.end();
  }
}

listTables();
