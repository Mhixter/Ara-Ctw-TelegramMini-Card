import { Pool } from 'pg';

/**
 * Build connection config.
 *
 * Priority order:
 *  1. Individual PG_* runtime variables (PGHOST / PGPORT / PGUSER / PGPASSWORD / PGDATABASE)
 *     – injected directly by Replit; never overridden by user secrets.
 *  2. DATABASE_URL – used only when the PG_* vars are absent (self-hosted / Railway).
 *
 * This avoids a common failure mode where a user-provided DATABASE_URL secret
 * contains invalid data that would shadow Replit's own managed connection.
 */
function buildPoolConfig() {
  // Prefer granular PG vars (always valid on Replit-managed databases)
  if (process.env.PGHOST && process.env.PGDATABASE) {
    return {
      host:     process.env.PGHOST,
      port:     Number(process.env.PGPORT || 5432),
      user:     process.env.PGUSER,
      password: process.env.PGPASSWORD,
      database: process.env.PGDATABASE,
      ssl: false,
      connectionTimeoutMillis: 10_000,
    };
  }

  // Fall back to DATABASE_URL (self-hosted / Railway / Supabase)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgres')) {
    console.error(
      '[db] ❌  No valid database configuration found.\n' +
      '[db]    Set DATABASE_URL (format: postgres://user:pass@host:5432/dbname)\n' +
      '[db]    or let Replit inject PGHOST / PGDATABASE automatically.'
    );
  }

  return {
    connectionString: dbUrl,
    ssl: dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1')
      ? false
      : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10_000,
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('[db] Unexpected pool error:', err.message);
});

export default pool;
