const { Client } = require('pg');

const connectionString = 'postgresql://postgres:Koushik%400109@db.tfnusdxtwqzrzblujaju.supabase.co:5432/postgres';

async function testConnection() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Successfully connected to the database.');

    await client.query('CREATE TABLE IF NOT EXISTS test_table_agent (id serial PRIMARY KEY, name varchar(50));');
    console.log('Successfully created test table.');

    const res = await client.query("INSERT INTO test_table_agent (name) VALUES ('test_agent') RETURNING *;");
    console.log('Successfully inserted data:', res.rows[0]);

    await client.query('DROP TABLE test_table_agent;');
    console.log('Successfully dropped test table.');

  } catch (err) {
    console.error('Error connecting or querying the database:', err.stack);
  } finally {
    await client.end();
  }
}

testConnection();
