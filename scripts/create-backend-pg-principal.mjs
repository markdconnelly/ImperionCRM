// One-off: create the Entra-backed Postgres principal for the backend Function App's
// managed identity, against the `postgres` maintenance DB (the only DB where the
// pgaadauth_* functions exist — same prerequisite pattern as migration 0044).
// Run as the Entra PG admin with PGTOKEN/PGUSER set (see scripts/migrate.mjs notes).
// Idempotent: skips if the role already exists.
import pg from 'pg';

const ROLE = 'mgid-imperioncrmbackendfunction';
const OBJECT_ID = '4f9bab1a-ed60-446b-94da-aee4b6ea2b98'; // UAMI principalId

const client = new pg.Client({
  host: 'imperioncrm-pg-prd-cus.postgres.database.azure.com',
  port: 5432,
  database: 'postgres',
  user: process.env.PGUSER,
  password: process.env.PGTOKEN,
  ssl: { rejectUnauthorized: true },
});

await client.connect();
try {
  const existing = await client.query('SELECT 1 FROM pg_roles WHERE rolname = $1', [ROLE]);
  if (existing.rowCount > 0) {
    console.log(`role "${ROLE}" already exists; nothing to do.`);
  } else {
    const res = await client.query(
      `SELECT * FROM pgaadauth_create_principal_with_oid($1, $2, 'service', false, false)`,
      [ROLE, OBJECT_ID],
    );
    console.log('created:', res.rows);
  }
} finally {
  await client.end();
}
