import { Pool } from 'pg';

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl || dbUrl.length < 20 || !dbUrl.startsWith('postgres')) {
  console.error(
    '[db] ❌  DATABASE_URL is missing or invalid.\n' +
    '[db]    Expected format: postgres://user:password@host:5432/dbname\n' +
    '[db]    Received:',
    dbUrl ? `"${dbUrl.slice(0, 40)}…"` : '(empty)'
  );
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

export default pool;
