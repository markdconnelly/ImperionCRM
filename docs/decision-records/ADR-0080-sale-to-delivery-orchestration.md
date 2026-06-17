---
adr: 0080
title: "Sale → delivery orchestration (KQM quote → Autotask project/ticket spine)"
status: accepted
date: 2026-06-13
repo: frontend
summary: "KQM is the read-only quote SoR; Imperion builds no native quote engine."
tags: [sale-delivery]
---
# ADR-0080: Sale → delivery orchestration (KQM quote → Autotask project/ticket spine)

| Field | Value |
|---|---|
| **Repo** | frontend (schema + GUI); backend (orchestration executor + Autotask write client); local-pipeline (KQM + Autotask opportunity ingest); pipeline (Autotask webhooks) |
| **Status** | Accepted (2026-06-13, ratified by Mark) |
| **Date** | 2026-06-13 |
| **Cross-references** | ADR-0067 (CPQ — superseded in part by this ADR), ADR-0019 (proposal lifecycle), ADR-0010 (opportunity dual-axis stages), ADR-0039 (per-source bronze → silver aggregate), ADR-0044 (silver contracts/tickets), ADR-0074 (service-desk write-back — this is its superset), ADR-0071 (DocuSign e-sign), ADR-0042 (four-repo division of labor), ADR-0017 (raw SQL migrations), ADR-0055 (tiered agent autonomy) |
| **Epic** | #425 · supersedes the native-CPQ build of #317/ADR-0067 |
| **Validated by** | Spike #427 (KQM read shape) · Spike #426 (Autotask write capability) — both run live 2026-06-13 |

## Problem

Mark's real operational bottleneck is **not quoting — it is sale → delivery**: many projects in flight and nothing tracking them from a won deal through to executed work. The native-CPQ plan (ADR-0067) built a quote *engine* Imperion does not need, because **Kaseya Quote Manager (KQM) is already the system of record for quotes** and where the sales motion happens. What is missing is the **orchestration spine** that turns a won KQM quote into tracked, provisioned delivery work in Autotask (the PSA that actually runs the MSP), with a native plan/intent layer the team manages in Imperion.

## Context

The intelligence/integration layer is the product goal; it needs native feature surface to reason over, and **revenue sequences the build** (epic #425, 2026-06-13 grilling). The relevant facts are now **verified against the live APIs**, not assumed:

- **KQM is read-only, poll-only** (no webhooks; #98). A won quote is `quote.status == 3` (Int64 enum: 1 open / 2 sent / **3 WON** / 90 dead) ⇔ `salesOrderId > 0` (spike #427: 11/11 status-3 quotes carried a sales order, none else). The quote header already carries the Autotask seam — `autotaskOpportunityID`, `autotaskOrganizationID`, `autotaskQuoteID` (16/16 populated) — so the won → Autotask hop needs **no mapping table**. Line items live on `quoteline` (grouped by `quotesection.quoteID`), with `isRecurring`/`recurringType` splitting MRR vs one-off; there is **no header total** (silver sums selected lines). `quoteline`/`quotesection` are not server-filterable by quote → full-collection pull + client-side join.
- **Autotask can take the writes** the spine needs (spike #426, live prod write + cleanup). `Projects`, `Tickets`, `Tasks`, `Phases` all `canCreate=True`, `canDelete=False`. There is **no "instantiate template" endpoint** — a template is just a `projectType=3 (Template)` project; we emulate it by creating the Project and recreating its phase/task tree as child `Phases`/`Tasks` (created/updated via `/Projects/{id}/Phases|Tasks`). A service-desk **Ticket on the "Project Management" queue (`queueID 29683483`)** links to its project natively via `ticket.projectID`. **Creates are not idempotent** (server-assigned ids, no upsert/external key).
- **The opportunity is the silver merge target** (ADR-0010, ADR-0039), not a KQM-specific object. It has three bronze sources — KQM (quote/won/lines), Autotask (its opportunity entity), and website (manual sales notes + knowledge) — merged by precedence (website > autotask > kqm). See #428.
- **Schema lives in frontend, processes in backend** (ADR-0042). Webhooks/real-time stay in the cloud pipeline; scheduled bulk ingest + vectorization in local-pipeline.

## Options considered

- **A. Build native CPQ (ADR-0067 as written).** Rejected: duplicates KQM, which is the quote SoR; solves the problem Mark does not have (quoting) and not the one he does (delivery tracking). The API limit (KQM read-only) makes a native quote builder a parallel, diverging source of truth.
- **B. Bidirectional quote sync (mirror KQM quotes, allow native edits, write back).** Rejected: KQM has no write API for quotes; a two-way merge invents conflict resolution against a system that cannot accept our writes. KQM stays authoritative and read-only.
- **C. Orchestration spine over read-only KQM + write-capable Autotask (chosen).** Imperion ingests KQM as a bronze source of the opportunity, triggers on the won state, and orchestrates delivery by *writing to Autotask* (the system that genuinely owns execution). The native Imperion layer is the **intent/schedule plane**; Autotask is the **execution SoR**. This is the only option consistent with both API realities (verified by the spikes).

### Tradeoffs

C means Imperion never owns the quote or the ticket of record — it owns the *orchestration* and the *intent*. Accepted: that is exactly the missing layer, and it avoids a doomed second quote engine. The cost is that idempotency, retry-safety, and the quote↔project↔ticket linkage become **Imperion's responsibility** (Autotask gives us none of them on create) — addressed by the link/tracking tables below.

## Decision

1. **KQM is the read-only quote SoR; Imperion builds no native quote engine.** ADR-0067's catalog / price_book / quote / quote_line / discount-gate / quote-builder GUI are **gutted** (see the ADR-0067 amendment). KQM ingests as a bronze source of the **opportunity** (#428), not a standalone quote object.

2. **The won trigger.** The local-pipeline polls KQM `/quote` incrementally (`modifiedAfter`); a quote crossing to `status == 3` raises a **won-opportunity event**. The trigger contract is `status == 3` (equivalently `salesOrderId` present). The won opportunity already carries `autotaskOpportunityID` / `autotaskOrganizationID` — the keys the provisioning step needs.

3. **The orchestration spine** (intent in Imperion, execution in Autotask):
   ```
   KQM won quote (bronze → silver opportunity, #428)
     → DocuSign contract from the proposal (ADR-0071 / #318)
     → Autotask PROJECT created from a seeded template (template-emulated: Project + child Phases/Tasks)
     → JIT project-queue TICKETS fired in a rolling window before each task starts (never 100 up front)
   ```
   The native Imperion **project/task plan is the intent + schedule layer**; Autotask Projects/Tasks/Tickets are the **execution record**.

4. **Backend link / tracking tables (new, frontend-owned schema).** A join model binds `opportunity ↔ imperion_project ↔ imperion_task ↔ autotask_project_id ↔ autotask_ticket_id`, plus per-task **schedule** and **fire-state** (`none | scheduled | fired`). Because Autotask creates are **not idempotent**, every provisioning row carries a **created-flag + the returned Autotask id**; the executor checks it before every write so a retry never double-provisions. This table — not Autotask — is the source of idempotency.

5. **The extended Autotask write-back client (backend) is a superset of ADR-0074/#422.** #422 only annotates existing tickets (notes/UDF/CSAT); this ADR adds **create Project, create Phase, create Task, create queue Ticket**, all through the documented child-collection URLs, honoring the shared Autotask rate budget (sequential writes; 3 threads/endpoint, 10k/hr/db).

6. **The GUI delivery board (frontend).** Over the existing project/task model: per-task **ticket-state** (none/scheduled/fired), a **manual-fire OR schedule** control, and **drill-through into the Autotask ticket** (native `ticket.projectID` link makes this a direct deep-link). This is the no-regret surface (#341 kanban / #350 portfolio) the orchestration plugs into.

7. **JIT ticket firing.** Project-queue tickets are created in a **rolling window** before each task's scheduled start, not all at provisioning time — keeps the Autotask service desk uncluttered and matches how delivery actually rolls. Firing is either scheduled (by the task's start window) or manual from the board.

8. **No hard delete / rollback.** Autotask `canDelete=False` on these entities; "undo" of a provisioning mistake is **set Inactive/Complete**, recorded in the tracking table. The executor must therefore be conservative on create.

## Consequences

- The native-CPQ build (#385-390) is superseded; the deal-value rollups (MRR/one-off/TCV) move onto the silver `opportunity` (#428), computed from KQM `quoteline`. Forecasting (#316) reads them there.
- DocuSign (#318/ADR-0071) survives unchanged — it signs the proposal; the signed contract gates Autotask provisioning.
- ADR-0074's write-back is reframed as the *narrow* case of this ADR's write client; the two ship one client.
- A spike-verified capability matrix (issues #426/#427) is the implementation contract; build can start against it without re-probing.

### Security impact

Autotask write is a **new write capability** to a production system holding client delivery data — it is added deliberately and gated. Creds stay in Key Vault (`kv-imperioncrm-prd`), minted per call via the cert SP, never to disk; the local-pipeline least-privilege posture (its CLAUDE.md §2/§8) treats any new write surface as a security event. Writes are scoped to provisioning (Projects/Phases/Tasks/Tickets) — no destructive operations exist on the API anyway (`canDelete=False`). All test/probe writes during build follow the `ZZ-IMPERION-SPIKE-` marked-and-cleaned policy and attach to `companyID 0` (My Company), never a client.

### Cost impact

No new SaaS spend — reuses existing KQM + Autotask licences. Autotask API calls share the documented rate budget; JIT firing reduces ticket volume vs up-front provisioning.

### Operational impact

Provisioning is **retry-safe only via the tracking table** — operating the executor without it risks duplicate Autotask projects/tickets (no API-side idempotency). Round-trip-to-bronze lag for written records = the local-pipeline poll interval (records are immediately queryable; no API propagation delay). The "Project Management" queue id (`29683483`) is environment-specific config, not a constant.

## Future considerations

- True template management (a UI to define the seeded project template) — v1 emulates from a designated `projectType=3` template project.
- Two-way status reflection (Autotask task completion → native plan progress) once the read pull cadence is tuned.
- Multi-PSA abstraction — out of scope; Autotask is the only PSA (ADR-0042 Kaseya stack).
- Retiring `salesOrderId` as a secondary won-signal if KQM status semantics are confirmed stable.
