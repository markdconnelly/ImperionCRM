# Time-tracking UAT — seeding test employees (runbook)

Runbook for `scripts/seed-time-uat.mjs` (issue #511). Seeds the minimal data the
time-tracking UAT needs: a few **test** employees, each with an `employee_profile`
and a `pay_rate`. Companion to the UAT script (`time-tracking-uat-script.md`, #512)
and the readiness plan (`time-expense-user-test-plan.md`, Track A step 1).

## Why this is needed

Schema migrations 0085–0087 are **applied and live in prod**, but the seven time
tables are **empty**. The employee→admin UAT can't run until test employees exist
with comp + (optionally) mappings. This is a **test prerequisite**, not a feature.

## Who runs it — and the hard rules

- **Mark runs it.** Prod writes are Mark-gated (CLAUDE.md §2); the read-only
  postgres MCP cannot write. The agent authors the script and **never executes it**.
- **TEST Entra users ONLY. No client/employee PII** in the script, the config, or
  any issue/PR.
- **No hard-coded comp.** Pay rates **and** emails live only in a caller-supplied
  config that is **gitignored** (`scripts/seed-time-uat.config.json`).
- **Idempotent** — UPSERTs; safe to re-run.
- **Dry-run by default** — writes nothing without an explicit `--apply`.
- **Never creates identities** — `app_user` is Entra-synced (ADR-0016). Each test
  user must have signed in once (so the app_user mirror exists) before seeding.

## Steps

1. **Ensure each test user has signed in once** via Entra SSO, so an `app_user`
   row exists (the script resolves employees by `app_user.email` and skips unknown
   emails rather than creating them).

2. **Create the config** from the template (kept out of git):

   ```powershell
   Copy-Item scripts/seed-time-uat.config.example.json scripts/seed-time-uat.config.json
   # edit scripts/seed-time-uat.config.json: real TEST emails + TEST hourly rates
   ```

   Each employee: `email`, `hourlyRate` (required), and optional `effectiveFrom`
   (default `2026-01-01`), `classification` (default `1099`), `autotaskResourceId`,
   `quickbooksVendorId`, `note`. Leave the two mapping ids `null` to confirm them
   in the UI (step 4).

3. **Dry-run, then apply** (auth = your logged-in `az`, Entra token — no stored
   secret, same model as `scripts/migrate.mjs`):

   ```powershell
   node scripts/seed-time-uat.mjs --config scripts/seed-time-uat.config.json           # preview — writes nothing
   node scripts/seed-time-uat.mjs --config scripts/seed-time-uat.config.json --apply   # write to prod
   ```

   The dry-run prints the exact plan (resolved app_user id, classification, rate,
   mappings) per employee and flags any unresolved emails. Re-run with `--apply`
   once it looks right.

4. **Confirm mappings** — open `/timesheets/mappings` (admin) and set each
   employee's Autotask Resource id + QuickBooks vendor id (or supply them in the
   config up front).

5. **Run the UAT** — `docs/operations/time-tracking-uat-script.md`.

## Notes

- Connection defaults to prod; override with `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`
  to target a test database instead (`PGTOKEN` supplies a token without shelling to `az`).
- Comp grants (migration 0085): `pay_rate` is readable only by the web role
  (app-gated to finance/admin) and the backend reconciliation process — this seed
  writes it as the web/admin principal.
- Safety cap: the script refuses more than 10 employees per run (a UAT seed is a
  handful of test users, not a bulk load).
