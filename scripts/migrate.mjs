// Reusable migration runner for the prod Imperion CRM Postgres.
//
// Applies ONE OR MORE *named*, committed migration files from db/migrations — never
// arbitrary SQL, and never a blind "apply everything" (which would re-fire the seed
// migrations). Each migration file is idempotent (BEGIN/COMMIT + IF NOT EXISTS), so
// re-running a named one is safe.
//
// Auth: an Entra (AAD) access token used as the password — no stored secret, same model
// as db/README.md. The token is minted via the Azure CLI (already-logged-in `az`), or
// taken from PGTOKEN if set. TLS is verified against the system CA bundle.
//
// Usage:
//   node scripts/migrate.mjs 0035                 # apply db/migrations/0035_*.sql
//   node scripts/migrate.mjs 0035 0036            # apply several, in the given order
//   node scripts/migrate.mjs --list               # list available migration files
//
// Connection defaults to prod (overridable via PGHOST/PGPORT/PGDATABASE/PGUSER):
//   host imperioncrm-pg-prd.postgres.database.azure.com  db imperioncrm
//   user = your signed-in `az` account (az account show) unless PGUSER is set.
import { readFile, readdir } from "node:fs/promises";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const AAD_RESOURCE = "https://ossrdbms-aad.database.windows.net";
const MIGRATIONS_DIR = fileURLToPath(new URL("../db/migrations/", import.meta.url));
// Where the Azure CLI may live on Windows when it isn't on PATH for this process.
const AZ_FALLBACKS = [
  "az",
  "C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin\\az.cmd",
];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/**
 * Run `az` with the given args, trying PATH then known install locations. Uses a
 * quoted shell command (execSync) so the Azure CLI's `az.cmd` launches on Windows —
 * Node's execFile* rejects `.cmd` with EINVAL, and the install path has spaces.
 */
function az(args) {
  let lastErr;
  const quoted = args.map((a) => `"${a}"`).join(" ");
  for (const bin of AZ_FALLBACKS) {
    try {
      return execSync(`"${bin}" ${quoted}`, {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      }).trim();
    } catch (err) {
      lastErr = err;
      // "not recognized" / "cannot find" → this bin isn't here; try the next.
      if (!/not recognized|cannot find|ENOENT/i.test(`${err?.message} ${err?.stderr}`)) {
        throw err; // a real az error (e.g. not logged in) — surface it
      }
    }
  }
  throw lastErr ?? new Error("az CLI not found");
}

async function listMigrations() {
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  return files;
}

/** Resolve a user-supplied id ("35", "0035", or a full filename) to one migration file. */
function resolveMigration(id, files) {
  if (id.endsWith(".sql")) {
    if (files.includes(id)) return id;
    fail(`Migration file not found: ${id}`);
  }
  const num = String(id).replace(/\D/g, "").padStart(4, "0");
  const matches = files.filter((f) => f.startsWith(`${num}_`));
  if (matches.length === 0) fail(`No migration matches "${id}" (looked for ${num}_*.sql).`);
  if (matches.length > 1) fail(`Ambiguous id "${id}" — matches: ${matches.join(", ")}`);
  return matches[0];
}

async function main() {
  const args = process.argv.slice(2);
  const files = await listMigrations();

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log("Usage: node scripts/migrate.mjs <migration-id...>  |  --list");
    process.exit(args.length === 0 ? 1 : 0);
  }
  if (args.includes("--list")) {
    console.log(files.join("\n"));
    return;
  }

  const targets = args.map((id) => resolveMigration(id, files));
  console.log(`migrations to apply (in order): ${targets.join(", ")}`);

  const token = process.env.PGTOKEN || az(["account", "get-access-token", "--resource", AAD_RESOURCE, "--query", "accessToken", "-o", "tsv"]);
  if (!token) fail("could not obtain an AAD access token (set PGTOKEN or `az login`).");
  const user = process.env.PGUSER || az(["account", "show", "--query", "user.name", "-o", "tsv"]);

  const client = new pg.Client({
    host: process.env.PGHOST || "imperioncrm-pg-prd.postgres.database.azure.com",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "imperioncrm",
    user,
    password: token,
    ssl: { rejectUnauthorized: true }, // verify the server cert; no TLS weakening
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log(`connected to ${client.database} as ${user}`);
  try {
    for (const file of targets) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
      process.stdout.write(`applying ${file} ... `);
      await client.query(sql);
      console.log("ok");
    }
  } finally {
    await client.end().catch(() => {});
  }
  console.log("done.");
}

main().catch((err) => fail(`ERROR: ${err.message}`));
