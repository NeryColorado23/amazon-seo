const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('PostgreSQL (Supabase) conectado');
});

module.exports = pool;