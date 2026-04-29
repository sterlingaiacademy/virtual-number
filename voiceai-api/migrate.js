const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://voiceai_user:Sterling@123@34.93.59.45:5432/voiceai'
});

async function migrate() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'database/migrations/001_initial_schema.sql'), 'utf-8');
    await pool.query(schema);
    console.log('Database migrated successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
