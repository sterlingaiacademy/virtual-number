const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://voiceai_user:Sterling@123@34.93.59.45:5432/voiceai'
});

async function check() {
  const result = await pool.query('SELECT * FROM clients');
  console.log(result.rows);
  const users = await pool.query('SELECT * FROM users');
  console.log(users.rows);
  pool.end();
}
check();
