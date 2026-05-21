const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../voiceai-api/.env') });
const db = require('../voiceai-api/src/config/database');

async function main() {
  try {
    console.log('Connecting to database to clear clients...');
    // Because of foreign keys, we need to clear related tables or use CASCADE
    // However, since we want to clear everything, we can just clear calls, transcripts, virtual_numbers, users, ai_agents, and clients.
    await db.query('DELETE FROM transcripts');
    await db.query('DELETE FROM calls');
    await db.query('DELETE FROM virtual_numbers');
    await db.query('DELETE FROM users WHERE role = $1', ['client']);
    await db.query('DELETE FROM ai_agents');
    await db.query('DELETE FROM clients');
    
    console.log('Successfully cleared all client-related data from the database!');
  } catch (err) {
    console.error('Error clearing database:', err);
  } finally {
    process.exit(0);
  }
}

main();
