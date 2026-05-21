const path = require('path');
require('../voiceai-api/node_modules/dotenv').config({ path: path.join(__dirname, '../voiceai-api/.env') });
const db = require('../voiceai-api/src/config/database');

async function main() {
  try {
    const res = await db.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      WHERE n.nspname = 'public';
    `);
    console.log(res.rows);
    
    const count = await db.query('SELECT * FROM clients');
    console.log('Clients:', count.rows);
    
    const users = await db.query('SELECT * FROM users');
    console.log('Users:', users.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
