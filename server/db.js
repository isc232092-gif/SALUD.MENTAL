const { Pool } = require('pg');
require('dotenv').config();

let pool;

function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const isSupabase = connectionString && (connectionString.includes('supabase.co') || connectionString.includes('supabase.net') || connectionString.includes('pooler.supabase.com'));

    pool = new Pool({
      connectionString: connectionString,
      ssl: isSupabase ? { rejectUnauthorized: false } : false
    });
  }
  return pool;
}

module.exports = { getPool };
