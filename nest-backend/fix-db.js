const { Client } = require('pg');

async function fix() {
  // Connect to default 'postgres' database to drop/recreate yuanbao_ai
  const c = new Client({ connectionString: 'postgresql://postgres:3128089433@localhost:5432/postgres' });
  await c.connect();

  // Terminate existing connections to yuanbao_ai
  await c.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'yuanbao_ai' AND pid <> pg_backend_pid()
  `);
  console.log('Terminated existing connections');

  // Drop and recreate with UTF8 collation
  await c.query('DROP DATABASE IF EXISTS yuanbao_ai');
  console.log('Dropped old database');

  await c.query("CREATE DATABASE yuanbao_ai WITH ENCODING='UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0");
  console.log('Created new database with UTF-8 encoding');

  await c.end();
  console.log('Done!');
}

fix().catch(e => { console.error(e.message); process.exit(1); });
