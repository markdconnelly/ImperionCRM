# Data-access layer

How the application reads data. Implements ADR-0007; precedes the PostgreSQL +
pgvector store (ADR-0003).

## What it is
A typed repository abstraction in `src/lib/data`. Callers depend on interfaces,
never on a concrete data source. Today the implementation is mock fixtures;
swapping to Postgres changes one function.

## Structure
| File | Responsibility |
|---|---|
| `repositories.ts` | Async contracts: `DashboardRepository`, `AgentRepository`, `Repositories`. |
| `mock/mock-repositories.ts` | Fixture-backed implementation (wraps `lib/mock-data`). |
| `index.ts` | `getRepositories()` — server-only selection point (mock now; Postgres when `DATABASE_URL` is set). |

## Data flow
```mermaid
flowchart LR
    SC[Server component\npage.tsx / DashboardView] -->|getRepositories| PROV[lib/data/index.ts\nserver-only]
    PROV --> IMPL{Implementation}
    IMPL -->|today| MOCK[mock-repositories]
    IMPL -.->|DATABASE_URL set| PG[(Postgres + pgvector\ngold layer — ADR-0003)]
    SC -->|plain data props| UI[Presentational components]
```

## Rules
- Only **server components / route handlers / the orchestrator** call
  `getRepositories()` — it is `server-only` and must not enter client bundles.
- Components are presentational: they receive plain data via props and import no
  data source.
- Repository methods are **async** so they can become real queries unchanged.

## Mapping to the staged pipeline (§4)
Repositories expose **gold** (AI/UI-ready) reads. Bronze/silver live in Postgres;
gold projections are what the UI and agents consume. Row scoping to the signed-in
user's Entra permissions will be enforced inside the implementation.

Tree-shaped writes (e.g. `createDeliveryTemplate`, ADR-0081 — template → phases →
tasks) run in a single `pool.connect()` transaction (`BEGIN`/`COMMIT`/`ROLLBACK`),
mirroring `applyOnboardingTemplate`; the `getDeliveryTemplate` read assembles the
tree client-side from three ordered queries. See `delivery-templates.test.ts` for
the SQL-shape + mapping contract.

**Timesheet methods (ADR-0082, migrations 0085–0087).** `listTimesheets` /
`getTimesheetForWeek` / `ensureTimesheetForWeek` / `addTimeEntry` / `updateTimeEntry` /
`deleteTimeEntry` / `submitTimesheet` back the employee weekly-timesheet vertical.
`getTimesheetForWeek` assembles the week from three ordered reads (the timesheet row,
its attendance entries, and the per-day `time_reconciliation_day` rows that seed the
memory-jogger); minutes are **derived in SQL** (`EXTRACT(EPOCH …)/60`), never stored.
`ensureTimesheetForWeek` is an idempotent upsert on `UNIQUE (app_user_id, week_start)`.
`submitTimesheet` is a single atomic statement that transitions **only an Open sheet** →
Submitted, stamps the attester, and snapshots the entries (`jsonb_agg`) for audit. The
attest **Hard-deviation gate** (over-logged day or same-day overlap) is computed in
`hasHardDeviation` over the assembled week. Comp data (0085 `pay_rate`) is NOT read here —
that stays in the backend reconciliation process. See `timesheets.test.ts` for the
SQL-shape + mapping + gate contract.

The **admin approval** methods (ADR-0082) sit on the same tables: `listSubmittedTimesheets`
is the review queue (Submitted sheets across employees, joined to `app_user` for the name);
`approveTimesheet` runs a `pool.connect()` transaction — Submitted→Approved then an idempotent
`INSERT … ON CONFLICT (timesheet_id) DO NOTHING` of the **pending `time_ticket`** row the
backend Time Ticket writer (BE-1) consumes (the ticket is requested here, written there — the
front end never holds Autotask creds, ADR-0042); `reopenTimesheet` sends a sheet back to the
employee (→open, stamps cleared, snapshot + ticket row kept for the re-write).

## Swapping to Postgres (ADR-0003)
1. Add a `postgres/` implementation of the same interfaces (querying gold).
2. In `index.ts`, return it when `process.env.DATABASE_URL` is set.
3. No change to any caller or component.

## Failure behaviour — fail closed, with one exception (`postgres/fallback.ts`)
With **no database configured**, every read returns mock data (dev/demo). With a
**database configured**, a failed read does NOT silently return demo data — the guarded
fallback seam (#193) logs and throws `DataUnavailableError`, which the route error
boundary renders as "Live data is unavailable" rather than fake numbers.

**The one exception is schema lag (#301).** A merged read of a new *optional* bronze
table can outpace its prod migration (this bit SharePoint 0078 and directory-groups
0079). That surfaces as Postgres `42P01` (undefined_table) / `42703` (undefined_column) —
deterministic "not migrated yet", not an outage. So the **optional enrichment reads**
(account-scoped posture / Defender / MFA / SharePoint / credential-exposure reads and the
contact directory-groups read) treat those two codes as **empty** (`isSchemaLagError`),
degrading one section to blank instead of failing the whole page. Every other error —
connection loss, timeout, syntax — still fails closed. **Core reads** (account, contact,
timeline, bronze-source drill) are never degraded: a failure there is a real problem.

## Connection pool — recycle before the Entra token dies (`db/client.ts`, #1290)
In Azure the pool authenticates each connection with a Microsoft Entra access token, and
Azure Postgres **terminates a connection when its token expires** (~60–90 min) and reaps
idle ones. A pooled client left open past that point is dead; the next query that grabs it
fails with a connection error and — via the fail-closed seam above — surfaces as an
intermittent, self-healing "Live data is unavailable" on an unrelated page. The pool is
therefore tuned to never hand out a stale-token connection: `maxLifetimeSeconds` (1800)
rotates every connection well under the token TTL, `idleTimeoutMillis` reaps idle clients
before the server drops them, `connectionTimeoutMillis` fails fast instead of hanging a
render, and a `pool.on('error')` handler logs the real cause (the per-query catch swallows
it) and lets pg discard the dead client.

Tuning alone did not fully stop the incident (#1293): a request can still land on a
connection the moment it dies. So `db/retry.ts` wraps `pool.query` in one seam that (1) **logs
the underlying pg error** — the per-method `catch {}` otherwise swallows it, leaving only
"which method failed", never why — and (2) **retries once** on a transient connection fault
(`isRetryableConnectionError`: the Postgres `08*` / `57P0*` SQLSTATEs, Node socket errnos, and
the pg pool's "Connection terminated"/"timeout" messages). Reads and idempotent upserts are
safe to retry because a connection error means the statement never executed; a real query
fault (constraint / permission / undefined-table) is logged and rethrown, never retried.
