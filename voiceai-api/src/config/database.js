const { Pool } = require('pg');

const isProduction = process.env.NODE_ENV === 'production';

const poolConfig = isProduction
  ? {
      connectionString: process.env.DATABASE_URL,
      // Cloud SQL Unix socket via Cloud SQL Auth Proxy or connector
      host: `/cloudsql/${process.env.CLOUD_SQL_CONNECTION_NAME}`,
      database: 'voiceai',
      user: 'voiceai_user',
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      connectionString: process.env.DATABASE_URL,
      max: 10,
    };

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
});

pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('PostgreSQL client connected');
  }
});

/**
 * Execute a parameterized query
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('DB query', { text: text.substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (err) {
    console.error('DB query error', { text: text.substring(0, 80), error: err.message });
    throw err;
  }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);
  let released = false;
  client.release = () => {
    if (!released) {
      released = true;
      originalRelease();
    }
  };
  return client;
}

module.exports = { query, getClient, pool };
