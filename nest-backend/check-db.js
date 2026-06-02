const { Client } = require('pg');

async function check() {
  const passwords = ['3128089433', '123456'];
  for (const pwd of passwords) {
    const c = new Client({ connectionString: `postgresql://postgres:${pwd}@localhost:5432/yuanbao_ai` });
    try {
      await c.connect();
      console.log(`Connected with password: ${pwd}`);
      const r1 = await c.query('SHOW server_encoding');
      console.log('server_encoding:', r1.rows[0].server_encoding);
      const r2 = await c.query('SHOW client_encoding');
      console.log('client_encoding:', r2.rows[0].client_encoding);
      const r3 = await c.query("SELECT datname, datcollate, datctype FROM pg_database WHERE datname='yuanbao_ai'");
      console.log('database info:', JSON.stringify(r3.rows[0]));
      await c.end();
      return;
    } catch (e) {
      console.log(`Password ${pwd} failed: ${e.message}`);
      await c.end();
    }
  }
}

check();
