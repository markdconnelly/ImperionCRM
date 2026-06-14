// Seed test employees + pay rates for the time-tracking UAT (ADR-0082, issue #511).
//
// Time-tracking schema 0085–0087 is prod-applied but the seven time tables are
// EMPTY. The employee→admin UAT (docs/operations/time-tracking-uat-script.md)
// needs a handful of TEST employees with an employee_profile + a pay_rate before
// it can run. This script seeds exactly that, from a caller-supplied config — it
// hard-codes NO compensation values and NO email addresses (see the security
// rules below).
//
// ── HARD RULES (issue #511 / CLAUDE.md §2, §10.3) ─────────────────────────────
//   • TEST Entra users ONLY. Never seed real client/employee PII.
//   • NO hard-coded comp/pay-rate values, NO hard-coded emails — both come from a
//     caller-supplied --config JSON (kept out of the repo; see the .example).
//   • IDEMPOTENT — UPSERTs on employee_profile.app_user_id and
//     pay_rate (app_user_id, effective_from); safe to re-run.
//   • This script DOES NOT self-apply. It is DRY-RUN by default and refuses to
//     write without an explicit --apply. Prod writes are Mark-gated (CLAUDE.md
//     §2): the agent authors this; Mark runs it.
//   • It NEVER creates identities — app_user rows are Entra-synced (ADR-0016). An
//     unknown email is reported and skipped, never inserted.
//
// Auth + connection: identical model to scripts/migrate.mjs — an Entra (AAD)
// access token used as the password (no stored secret; TLS verified), minted from
// the logged-in `az` or taken from PGTOKEN. Connection defaults to prod and is
// overridable via PGHOST/PGPORT/PGDATABASE/PGUSER.
//
// Usage:
//   node scripts/seed-time-uat.mjs --config <file.json>            # DRY-RUN (default) — prints the plan, writes nothing
//   node scripts/seed-time-uat.mjs --config <file.json> --apply    # actually write (Mark only)
//   node scripts/seed-time-uat.mjs --help
//
// Config shape — see scripts/seed-time-uat.config.example.json. Each employee:
//   { email, hourlyRate, effectiveFrom?, classification?, autotaskResourceId?,
//     quickbooksVendorId?, note? }
import { readFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import pg from "pg";

const AAD_RESOURCE = "https://ossrdbms-aad.database.windows.net";
const WIN_AZ_DIR = "C:\\Program Files\\Microsoft SDKs\\Azure\\CLI2\\wbin";
const AZ_FALLBACKS = ["az", `${WIN_AZ_DIR}\\az.cmd`];
// Defence-in-depth against an accidental mass write to prod: a UAT seed is a few
// test users, never a bulk load. Adjust deliberately if a larger test cohort is
// ever needed.
const MAX_EMPLOYEES = 10;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

/** Run `az` (PATH then known Windows install dir). Verbatim from scripts/migrate.mjs. */
function az(args) {
  let lastErr;
  const argline = args.join(" ");
  const env = { ...process.env, PATH: `${process.env.PATH ?? ""};${WIN_AZ_DIR}` };
  for (const bin of AZ_FALLBACKS) {
    const cmd = bin === "az" ? `az ${argline}` : `"${bin}" ${argline}`;
    try {
      return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env }).trim();
    } catch (err) {
      lastErr = err;
      const blob = `${err?.message} ${err?.stderr} ${err?.stdout}`;
      if (!/not recognized|cannot find|no such file|ENOENT/i.test(blob)) throw err;
    }
  }
  throw lastErr ?? new Error("az CLI not found");
}

/** Validate one config entry into a normalized employee spec; throws on bad input. */
function normalizeEmployee(raw, i) {
  const where = `employees[${i}]`;
  if (!raw || typeof raw !== "object") fail(`${where}: must be an object.`);
  const email = raw.email;
  if (typeof email !== "string" || !email.includes("@")) fail(`${where}.email: a valid email is required.`);
  const rate = raw.hourlyRate;
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < 0) {
    fail(`${where}.hourlyRate: a non-negative number is required (provide the TEST rate in the config; never hard-coded).`);
  }
  const classification = raw.classification ?? "1099";
  if (classification !== "1099" && classification !== "W2") fail(`${where}.classification: must be "1099" or "W2".`);
  const effectiveFrom = raw.effectiveFrom ?? "2026-01-01";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) fail(`${where}.effectiveFrom: must be YYYY-MM-DD.`);
  const autotaskResourceId =
    raw.autotaskResourceId == null ? null : Number(raw.autotaskResourceId);
  if (autotaskResourceId != null && !Number.isInteger(autotaskResourceId)) {
    fail(`${where}.autotaskResourceId: must be an integer or omitted.`);
  }
  const quickbooksVendorId =
    raw.quickbooksVendorId == null ? null : String(raw.quickbooksVendorId);
  const note = raw.note == null ? null : String(raw.note);
  return { email, hourlyRate: rate, classification, effectiveFrom, autotaskResourceId, quickbooksVendorId, note };
}

async function loadConfig(configPath) {
  let parsed;
  try {
    parsed = JSON.parse(await readFile(configPath, "utf8"));
  } catch (err) {
    fail(`could not read/parse --config ${configPath}: ${err.message}`);
  }
  const list = Array.isArray(parsed) ? parsed : parsed.employees;
  if (!Array.isArray(list) || list.length === 0) {
    fail(`--config must contain a non-empty "employees" array (or be an array). See scripts/seed-time-uat.config.example.json.`);
  }
  if (list.length > MAX_EMPLOYEES) {
    fail(`--config has ${list.length} employees; refusing more than ${MAX_EMPLOYEES} for a UAT seed (safety cap).`);
  }
  return list.map(normalizeEmployee);
}

function usage(code) {
  console.log(
    [
      "Seed TEST employees + pay rates for the time-tracking UAT (issue #511).",
      "",
      "Usage:",
      "  node scripts/seed-time-uat.mjs --config <file.json>           # DRY-RUN (default)",
      "  node scripts/seed-time-uat.mjs --config <file.json> --apply   # write to prod (Mark only)",
      "",
      "Config: see scripts/seed-time-uat.config.example.json.",
      "Hard rules: TEST users only · no client PII · no hard-coded comp · idempotent.",
    ].join("\n"),
  );
  process.exit(code);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.length === 0) usage(args.length === 0 ? 1 : 0);
  const apply = args.includes("--apply");
  const ci = args.indexOf("--config");
  const configPath = ci >= 0 ? args[ci + 1] : undefined;
  if (!configPath) fail("missing --config <file.json> (see scripts/seed-time-uat.config.example.json).");

  const employees = await loadConfig(configPath);

  console.log(`mode: ${apply ? "APPLY (writing to the database)" : "DRY-RUN (no writes — pass --apply to write)"}`);
  console.log(`employees in config: ${employees.length}`);
  console.log(
    "⚠  These rows are written to PRODUCTION. Use TEST Entra users only — never client/employee PII.\n",
  );

  const token = process.env.PGTOKEN || az(["account", "get-access-token", "--resource", AAD_RESOURCE, "--query", "accessToken", "-o", "tsv"]);
  if (!token) fail("could not obtain an AAD access token (set PGTOKEN or `az login`).");
  const user = process.env.PGUSER || az(["account", "show", "--query", "user.name", "-o", "tsv"]);

  const client = new pg.Client({
    host: process.env.PGHOST || "imperioncrm-pg-prd-cus.postgres.database.azure.com",
    port: Number(process.env.PGPORT || 5432),
    database: process.env.PGDATABASE || "imperioncrm",
    user,
    password: token,
    ssl: { rejectUnauthorized: true },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log(`connected to ${client.database} as ${user}\n`);

  let seeded = 0;
  const missing = [];
  try {
    for (const e of employees) {
      // Resolve the Entra-synced identity — NEVER create one (ADR-0016).
      const { rows } = await client.query(
        `SELECT id FROM app_user WHERE lower(email) = lower($1) ORDER BY created_at LIMIT 1`,
        [e.email],
      );
      if (rows.length === 0) {
        missing.push(e.email);
        console.log(`SKIP  ${e.email} — no app_user row (have the test user sign in / sync to Entra first).`);
        continue;
      }
      const appUserId = rows[0].id;
      const hasMapping = e.autotaskResourceId != null || e.quickbooksVendorId != null;
      console.log(
        `${apply ? "SEED " : "PLAN "} ${e.email} (${appUserId}) — ${e.classification}, ` +
          `$${e.hourlyRate}/hr from ${e.effectiveFrom}` +
          (hasMapping ? `, mappings[at=${e.autotaskResourceId ?? "-"}, qb=${e.quickbooksVendorId ?? "-"}]` : ", mappings: confirm via UI"),
      );

      if (!apply) continue;

      await client.query("BEGIN");
      try {
        // employee_profile: 1:1 sidecar. Set classification; set mappings + stamp
        // resolved_at only when supplied (otherwise leave NULL for the /timesheets/mappings UI).
        await client.query(
          `INSERT INTO employee_profile
             (app_user_id, classification, autotask_resource_id, quickbooks_vendor_id, mappings_resolved_at)
           VALUES ($1, $2, $3, $4, CASE WHEN $3 IS NOT NULL OR $4 IS NOT NULL THEN now() ELSE NULL END)
           ON CONFLICT (app_user_id) DO UPDATE
             SET classification        = EXCLUDED.classification,
                 autotask_resource_id  = COALESCE(EXCLUDED.autotask_resource_id, employee_profile.autotask_resource_id),
                 quickbooks_vendor_id  = COALESCE(EXCLUDED.quickbooks_vendor_id, employee_profile.quickbooks_vendor_id),
                 mappings_resolved_at  = CASE
                                           WHEN EXCLUDED.autotask_resource_id IS NOT NULL
                                             OR EXCLUDED.quickbooks_vendor_id IS NOT NULL
                                           THEN now() ELSE employee_profile.mappings_resolved_at END,
                 is_active             = true`,
          [appUserId, e.classification, e.autotaskResourceId, e.quickbooksVendorId],
        );
        // pay_rate: effective-dated; one row per (employee, effective_from).
        await client.query(
          `INSERT INTO pay_rate (app_user_id, effective_from, rate_kind, hourly_rate, note)
           VALUES ($1, $2, 'hourly', $3, $4)
           ON CONFLICT (app_user_id, effective_from) DO UPDATE
             SET rate_kind = 'hourly', hourly_rate = EXCLUDED.hourly_rate, note = EXCLUDED.note`,
          [appUserId, e.effectiveFrom, e.hourlyRate, e.note ?? "time-tracking UAT seed (#511)"],
        );
        await client.query("COMMIT");
        seeded += 1;
      } catch (err) {
        await client.query("ROLLBACK").catch(() => {});
        throw err;
      }
    }
  } finally {
    await client.end().catch(() => {});
  }

  console.log("");
  if (!apply) {
    console.log(`DRY-RUN complete — nothing written. Re-run with --apply to seed (${employees.length - missing.length} resolvable).`);
  } else {
    console.log(`done — seeded/updated ${seeded} employee(s).`);
  }
  if (missing.length) {
    console.log(`\nUNRESOLVED (no app_user row, skipped): ${missing.join(", ")}`);
    console.log("  → have each test user sign in once (Entra SSO) so app_user mirrors them, then re-run.");
  }
  console.log("\nNext steps:");
  console.log("  1. Open /timesheets/mappings (admin) and confirm each employee's Autotask Resource id + QuickBooks vendor id.");
  console.log("  2. Run the UAT script: docs/operations/time-tracking-uat-script.md");
}

main().catch((err) => fail(`ERROR: ${err.message}`));
