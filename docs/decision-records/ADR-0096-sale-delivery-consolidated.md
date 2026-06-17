---
adr: 0096
title: "Sale → delivery orchestration & provisioning — consolidated dossier"
status: accepted
date: 2026-06-16
repo: frontend
summary: "Consolidated dossier of the sale→delivery cluster: the KQM-quote-as-read-only-SoR orchestration spine (won quote → Autotask project/ticket execution record, idempotency via Imperion tracking tables) and the data-driven delivery-template / human-triggered-bridge / hard-contract-gate provisioning model. The orchestration spine (ADR-0080) is ACCEPTED; the provisioning model (ADR-0081) is PROPOSED — not yet ratified — and is labeled as such inline. Carries every member decision and amendment clause verbatim with a zero-loss traceability table; member ADRs are retained with their real statuses (0080 consolidated, 0081 PROPOSED preserved)."
tags: [sale-delivery]
consolidates: [ADR-0080, ADR-0081]
---
# ADR-0096: Sale → delivery orchestration & provisioning — consolidated dossier

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted for the orchestration spine (ADR-0080); the provisioning model (ADR-0081) it carries is **Proposed — not yet ratified** (see inline labels in Synthesis §B and M2) |
| **Date** | 2026-06-16 |
| **Consolidates** | ADR-0080 (status → `consolidated`) · ADR-0081 (**status stays `proposed`** — preserved verbatim, NOT promoted) — both retained on disk; each gains `consolidated_into: ADR-0096` |
| **Cross-references** | ADR-0090 (consolidation method — dossier + traceability + retained originals) · ADR-0084 (claim ADR numbers at merge) · ADR-0067 (native CPQ — superseded *in part* by ADR-0080; its catalog/price_book/quote/quote_line/discount-gate/quote-builder are gutted) · ADR-0019 (proposal lifecycle) · ADR-0010 (opportunity dual-axis stages — the silver merge target) · ADR-0039 (per-source bronze → silver aggregate) · ADR-0044 (silver contracts/tickets) · ADR-0074 (service-desk write-back — the narrow case of ADR-0080's write client) · ADR-0071 (#318 DocuSign e-sign — the contract gate) · ADR-0052 (one project/task model) · ADR-0037 (onboarding template — the proven shape ADR-0081 generalizes) · ADR-0042 (four-repo division of labor) · ADR-0017 (raw SQL migrations) · ADR-0055 (tiered agent autonomy) · backend executor + Autotask write client (sibling-repo decision — referenced, not absorbed) · [`docs/security/unified-security-standard.md`](../security/unified-security-standard.md) (the shared baseline this cluster conforms to — referenced, not restated) |
| **Epic** | #425 · supersedes the native-CPQ build of #317/ADR-0067 · spikes #426 (Autotask write) / #427 (KQM read) are the implementation contract |

## Purpose & scope

This is a consolidation dossier produced under [ADR-0090](./ADR-0090-adr-ingestion-overhaul.md). It folds the **sale→delivery cluster** — the two decision records that define how a won deal becomes tracked, provisioned delivery work — into one ingestible record, so that "the current decision about sale→delivery" can be reconstructed from a single file rather than two ADRs and their cross-references.

**This cluster contains one ACCEPTED decision and one PROPOSED decision, and the dossier keeps them distinct.** [ADR-0080](./ADR-0080-sale-to-delivery-orchestration.md) (the orchestration *spine*) is **Accepted** (ratified by Mark, 2026-06-13). [ADR-0081](./ADR-0081-delivery-provisioning-template-model.md) (the provisioning *template model / human-triggered bridge / contract gate*) is **Proposed — not yet ratified**. This dossier does **not** promote ADR-0081: its member file keeps `status: proposed` verbatim, the synthesis section that carries it is labeled **"Proposed — not yet ratified,"** the traceability table flags its status, and the dossier's own status (above) is explicit that only the spine is Accepted. Presenting the provisioning model as settled would be a fabrication of ratification — so it is everywhere marked as the proposal it is.

**Zero loss is the binding constraint (ADR-0090).** A decision is "lost" only if it appears in *no* active record. This dossier therefore:

- **Synthesizes** the current sale→delivery decision (the section immediately below), split into the **Accepted** orchestration spine (§A) and the **Proposed** provisioning model (§B);
- **Carries every member decision and every clause VERBATIM** (the per-member sections that follow — quoted directly from each source ADR's *Decision* and binding clauses);
- **Proves zero loss with a traceability table** mapping each source ADR's decision(s) to its dossier section, with a **Status column** that records ADR-0081 = Proposed;
- **Retains every member file on disk** with `consolidated_into: ADR-0096` and an inbound pointer — so history and inbound links survive (ADR-0090).

**Member statuses are preserved verbatim (ADR-0090).** ADR-0080 is `Accepted` → its consolidation flips it to `consolidated`. **ADR-0081 is `Proposed` and STAYS `proposed`** — consolidation adds only the `consolidated_into` pointer and does **not** flip its status to `consolidated` or `accepted`, because that would silently fabricate a ratification that has not happened. This mirrors how ADR-0092 kept ADR-0032 `superseded` rather than flipping it to `consolidated` (preserving the supersession fact); here the fact preserved is that **0081's decision is still proposed**.

**Boundaries preserved (system CLAUDE.md §1, single-owner rule).** This is the front-end-owned schema + GUI decision plus the *intent* layer. The **backend executor** and the **Autotask write client** that consume this schema are sibling-repo decisions and stay **references, never absorptions**. The cross-repo work split (local-pipeline KQM + Autotask ingest; pipeline Autotask webhooks) is named as a reference. The shared **unified security standard** is **referenced, not restated**.

---

## Synthesis — the current sale → delivery decision

Mark's real operational bottleneck is **not quoting — it is sale → delivery**: many projects in flight and nothing tracking them from a won deal through to executed work. The native-CPQ plan (ADR-0067) built a quote *engine* Imperion does not need, because **Kaseya Quote Manager (KQM) is already the system of record for quotes**. What is missing is the **orchestration spine** that turns a won KQM quote into tracked, provisioned delivery work in Autotask (the PSA that runs the MSP), plus a native plan/intent layer the team manages in Imperion. The cluster decides this in two layers — one **ratified**, one **proposed**.

### §A — Orchestration spine (ADR-0080, ACCEPTED)

1. **KQM is the read-only quote SoR; Imperion builds no native quote engine.** ADR-0067's catalog / price_book / quote / quote_line / discount-gate / quote-builder GUI are **gutted**. KQM ingests as a bronze source of the **opportunity** (#428), not a standalone quote object. KQM is **read-only, poll-only** (no webhooks); a won quote is `quote.status == 3` (Int64 enum: 1 open / 2 sent / 3 WON / 90 dead) ⇔ `salesOrderId > 0`. The quote header already carries the Autotask seam — `autotaskOpportunityID`, `autotaskOrganizationID`, `autotaskQuoteID` — so the won → Autotask hop needs **no mapping table**.

2. **The won trigger.** The local-pipeline polls KQM `/quote` incrementally (`modifiedAfter`); a quote crossing to `status == 3` raises a **won-opportunity event**. The trigger contract is `status == 3` (equivalently `salesOrderId` present). The won opportunity already carries `autotaskOpportunityID` / `autotaskOrganizationID` — the keys provisioning needs.

3. **The orchestration spine** — intent in Imperion, execution in Autotask: KQM won quote (bronze → silver opportunity, #428) → DocuSign contract from the proposal (ADR-0071 / #318) → Autotask **PROJECT** created from a seeded template (template-emulated: Project + child Phases/Tasks) → JIT **project-queue TICKETS** fired in a rolling window before each task starts (never 100 up front). The native Imperion project/task plan is the **intent + schedule layer**; Autotask Projects/Tasks/Tickets are the **execution record**.

4. **Backend link / tracking tables (frontend-owned schema).** A join model binds `opportunity ↔ imperion_project ↔ imperion_task ↔ autotask_project_id ↔ autotask_ticket_id`, plus per-task **schedule** and **fire-state** (`none | scheduled | fired`). Because Autotask creates are **not idempotent** (server-assigned ids, no upsert/external key), every provisioning row carries a **created-flag + the returned Autotask id**; the executor checks it before every write so a retry never double-provisions. **This table — not Autotask — is the source of idempotency.**

5. **The extended Autotask write-back client (backend) is a superset of ADR-0074/#422.** #422 only annotates existing tickets; this ADR adds **create Project, create Phase, create Task, create queue Ticket**, through the documented child-collection URLs, honoring the shared Autotask rate budget (sequential writes; 3 threads/endpoint, 10k/hr/db).

6. **The GUI delivery board (frontend),** over the existing project/task model: per-task **ticket-state** (none/scheduled/fired), a **manual-fire OR schedule** control, and **drill-through into the Autotask ticket** (native `ticket.projectID` link → direct deep-link).

7. **JIT ticket firing.** Project-queue tickets are created in a **rolling window** before each task's scheduled start, not all at provisioning time. Firing is scheduled (by the task's start window) or manual from the board.

8. **No hard delete / rollback.** Autotask `canDelete=False`; "undo" of a provisioning mistake is **set Inactive/Complete**, recorded in the tracking table. The executor must be conservative on create.

### §B — Delivery provisioning model (ADR-0081, **PROPOSED — NOT YET RATIFIED**)

> **Status: this entire subsection carries a PROPOSED decision (ADR-0081), not a ratified one.** It describes how a won opportunity *would* become a provisioned delivery project once ratified. It is not in force as an accepted decision; treat it as the design on the table, not as settled fact.

1. **Data-driven delivery templates** (proposed, frontend-owned schema, migration `0084` placeholder): `delivery_template` (key, name, version, project_type_id?, active); `delivery_template_phase` (template_id, ordinal, name, offset_days, duration_days — mirrors `OnboardingPhaseDef`); `delivery_template_task` (phase_id, ordinal, title, offset_days, duration_days, **dispatches_ticket** bool, **ticket_queue_id**, **ticket_title**, **ticket_lead_days**) — a task optionally fires a project-queue ticket `ticket_lead_days` before its scheduled start (JIT, ADR-0080 §7); maps 1:1 to `task_ticket_fire` at instantiation.

2. **Human-triggered provisioning from the board** (proposed; chosen over auto-provision and auto-draft). A won silver `opportunity` surfaces as *ready to provision*; a human picks a `delivery_template` (filtered by the deal's project type when bound), names the project, sets a start date, and confirms. Instantiation creates one native `project`, its `project_milestone`s (from phases) and `task`s (from template tasks) — the **same instantiation contract as `applyOnboardingTemplate`**, generalized — and a `project_provisioning` row (`provision_state='pending'`, `delivery_template_id`, `source_kqm_quote_id`, `autotask_opportunity_id`). Ticket-dispatching tasks get a `task_ticket_fire` row.

3. **Hard contract gate** (proposed). `project_provisioning` gains `contract_state` (`none|sent|signed`), `contract_signed_at`, `contract_envelope_ref` (DocuSign envelope id, ADR-0071). The executor MUST NOT provision a row whose `contract_state <> 'signed'`. The board shows the gate and blocks the fire control until signed. Until DocuSign is wired the state stays `none` and provisioning is **inert by design**.

4. **Executor stays a pure consumer** (proposed; separate backend issue): reads `pending` + `signed` rows, emulates the template into Autotask, JIT-fires tickets, **never touches opportunities** (KQM's wizard already creates the Autotask opportunity), checks `idempotency_key`/state before every write (ADR-0080 §4).

5. **Onboarding playbook is untouched.** Its easy-mode deploy/verify machinery (ADR-0052 §3) stays on `ONBOARDING_TEMPLATE`. Migrating onboarding onto `delivery_template` is explicitly deferred — convergence later, not now.

### Layering (preserved verbatim)

- **Quote layer (ADR-0080, Accepted):** KQM is the read-only quote SoR; no native quote engine; won = `status == 3`; the quote header carries the Autotask seam.
- **Orchestration / execution layer (ADR-0080, Accepted):** intent in Imperion (native project/task plan + tracking tables = the idempotency source), execution in Autotask (Projects/Phases/Tasks/queue Tickets), JIT firing, conservative-on-create because `canDelete=False`.
- **Provisioning / input layer (ADR-0081, PROPOSED):** data-driven `delivery_template`, human-triggered bridge from the board, hard DocuSign contract gate (built-but-inert until #318), executor as pure consumer. **Not yet ratified.**

### Relationship & supersession web (preserved verbatim)

- **ADR-0080 supersedes ADR-0067 *in part*** — the native-CPQ catalog / price_book / quote / quote_line / discount-gate / quote-builder GUI are gutted (see the ADR-0067 amendment). ADR-0067 is **not** a member of this cluster and is **not** absorbed — it is cited as a reference; only the supersession fact is carried.
- **ADR-0080 reframes ADR-0074's write-back as the *narrow* case** of its Autotask write client; the two ship one client. ADR-0074 is a reference, not absorbed.
- **ADR-0081 builds on ADR-0080** — it fills the executor's missing *input* (nothing turned a won opportunity into an Imperion delivery project + a `project_provisioning` row). It generalizes the proven onboarding playbook shape (ADR-0037 / ADR-0052) into the proposed `delivery_template`. **ADR-0081 is Proposed; this build-on is therefore a proposed extension of an accepted spine, not a ratified one.**
- The cross-repo work split (local-pipeline KQM + Autotask ingest; pipeline Autotask webhooks; backend executor + Autotask write client) stays a **reference** (system CLAUDE.md §1).

ADR-0080 is **Accepted** and consolidation flips it to `consolidated`. ADR-0081 is **Proposed** and stays `proposed`. Consolidation alters no decision's substantive status beyond the orchestration spine's `accepted → consolidated` retention flip.

---

## Traceability table (zero-loss proof)

Every cluster member, each source decision, the dossier section that carries it verbatim, and — critically — its **status**. The retained member file is the second proof of non-loss.

| Source ADR | Status | Decision(s) carried | Dossier section |
|---|---|---|---|
| **ADR-0080** | **Accepted** (→ `consolidated` on retention) | Sale→delivery orchestration spine — KQM is the read-only quote SoR (no native quote engine; ADR-0067 CPQ build gutted in part); won trigger `status == 3` ⇔ `salesOrderId > 0`; quote header carries the Autotask seam (no mapping table); spine = KQM won → DocuSign contract → Autotask Project (template-emulated: Project + child Phases/Tasks) → JIT project-queue Tickets; frontend-owned link/tracking tables bind opportunity↔imperion_project↔imperion_task↔autotask ids + schedule + fire-state, with created-flag + returned id as the **sole idempotency source** (Autotask creates non-idempotent); extended Autotask write client is a superset of ADR-0074/#422; GUI delivery board (ticket-state, fire/schedule, deep-link); JIT rolling-window firing; no hard delete (`canDelete=False`, undo = Inactive/Complete) | Synthesis §A · Layering · Supersession web · [M1 — ADR-0080](#m1--adr-0080-sale--delivery-orchestration-accepted) |
| **ADR-0081** | **Proposed — NOT ratified** (stays `proposed`) | Delivery provisioning model — data-driven `delivery_template` / `_phase` / `_task` schema (migration 0084 placeholder; per-task dispatch-ticket spec maps 1:1 to `task_ticket_fire`); human-triggered provisioning from the board (chosen over auto-provision / auto-draft) — won opportunity → "ready to provision" → human picks template, names project, sets start, confirms → native project + milestones + tasks (same contract as `applyOnboardingTemplate`, generalized) + `project_provisioning` row; **hard DocuSign contract gate** (`contract_state`/`contract_signed_at`/`contract_envelope_ref`; executor MUST NOT provision unless `signed`; built-but-inert until #318); executor stays a pure consumer (never touches opportunities); onboarding playbook untouched | Synthesis §B (**labeled PROPOSED**) · Layering · Supersession web · [M2 — ADR-0081](#m2--adr-0081-delivery-provisioning--template-model-human-triggered-bridge-contract-gate-proposed) |

**Member count: 2.** Cross-references preserved (not absorbed): **ADR-0067** (native CPQ — superseded in part by ADR-0080), **ADR-0074** (service-desk write-back — the narrow case of ADR-0080's write client), **ADR-0071/#318** (DocuSign — the contract gate), **ADR-0010/0039/0044** (opportunity merge target, per-source bronze, silver contracts/tickets), **ADR-0052/0037** (one project/task model + onboarding template ADR-0081 generalizes), **ADR-0042/0017/0055** (four-repo split, raw SQL migrations, tiered autonomy), and the sibling-repo **backend executor + Autotask write client** and **unified security standard** (referenced).

---

# Member decisions (verbatim)

Each section below reproduces the governing decision text of one member ADR **verbatim** from its source file. The full source ADR (Problem / Context / Options / Consequences / Future considerations) is retained on disk under its original filename; only its decision and binding clauses are quoted here, which is what the zero-loss guarantee requires.

## M1 — ADR-0080 (Sale → delivery orchestration) — **Accepted**

> Source: [`ADR-0080-sale-to-delivery-orchestration.md`](./ADR-0080-sale-to-delivery-orchestration.md) · Status: **Accepted** (2026-06-13, ratified by Mark) · Supersedes (in part): ADR-0067 native CPQ · Validated by spikes #426/#427.

**Decision (verbatim):**

> 1. **KQM is the read-only quote SoR; Imperion builds no native quote engine.** ADR-0067's catalog / price_book / quote / quote_line / discount-gate / quote-builder GUI are **gutted** (see the ADR-0067 amendment). KQM ingests as a bronze source of the **opportunity** (#428), not a standalone quote object.
>
> 2. **The won trigger.** The local-pipeline polls KQM `/quote` incrementally (`modifiedAfter`); a quote crossing to `status == 3` raises a **won-opportunity event**. The trigger contract is `status == 3` (equivalently `salesOrderId` present). The won opportunity already carries `autotaskOpportunityID` / `autotaskOrganizationID` — the keys the provisioning step needs.
>
> 3. **The orchestration spine** (intent in Imperion, execution in Autotask):
>    ```
>    KQM won quote (bronze → silver opportunity, #428)
>      → DocuSign contract from the proposal (ADR-0071 / #318)
>      → Autotask PROJECT created from a seeded template (template-emulated: Project + child Phases/Tasks)
>      → JIT project-queue TICKETS fired in a rolling window before each task starts (never 100 up front)
>    ```
>    The native Imperion **project/task plan is the intent + schedule layer**; Autotask Projects/Tasks/Tickets are the **execution record**.
>
> 4. **Backend link / tracking tables (new, frontend-owned schema).** A join model binds `opportunity ↔ imperion_project ↔ imperion_task ↔ autotask_project_id ↔ autotask_ticket_id`, plus per-task **schedule** and **fire-state** (`none | scheduled | fired`). Because Autotask creates are **not idempotent**, every provisioning row carries a **created-flag + the returned Autotask id**; the executor checks it before every write so a retry never double-provisions. This table — not Autotask — is the source of idempotency.
>
> 5. **The extended Autotask write-back client (backend) is a superset of ADR-0074/#422.** #422 only annotates existing tickets (notes/UDF/CSAT); this ADR adds **create Project, create Phase, create Task, create queue Ticket**, all through the documented child-collection URLs, honoring the shared Autotask rate budget (sequential writes; 3 threads/endpoint, 10k/hr/db).
>
> 6. **The GUI delivery board (frontend).** Over the existing project/task model: per-task **ticket-state** (none/scheduled/fired), a **manual-fire OR schedule** control, and **drill-through into the Autotask ticket** (native `ticket.projectID` link makes this a direct deep-link). This is the no-regret surface (#341 kanban / #350 portfolio) the orchestration plugs into.
>
> 7. **JIT ticket firing.** Project-queue tickets are created in a **rolling window** before each task's scheduled start, not all at provisioning time — keeps the Autotask service desk uncluttered and matches how delivery actually rolls. Firing is either scheduled (by the task's start window) or manual from the board.
>
> 8. **No hard delete / rollback.** Autotask `canDelete=False` on these entities; "undo" of a provisioning mistake is **set Inactive/Complete**, recorded in the tracking table. The executor must therefore be conservative on create.

**Security impact (preserved verbatim):**

> Autotask write is a **new write capability** to a production system holding client delivery data — it is added deliberately and gated. Creds stay in Key Vault (`kv-imperioncrm-prd`), minted per call via the cert SP, never to disk; the local-pipeline least-privilege posture (its CLAUDE.md §2/§8) treats any new write surface as a security event. Writes are scoped to provisioning (Projects/Phases/Tasks/Tickets) — no destructive operations exist on the API anyway (`canDelete=False`). All test/probe writes during build follow the `ZZ-IMPERION-SPIKE-` marked-and-cleaned policy and attach to `companyID 0` (My Company), never a client.

## M2 — ADR-0081 (Delivery provisioning — template model, human-triggered bridge, contract gate) — **Proposed**

> Source: [`ADR-0081-delivery-provisioning-template-model.md`](./ADR-0081-delivery-provisioning-template-model.md) · Status: **Proposed** (2026-06-13) · Builds on: ADR-0080.

**Status note (consolidation):** ADR-0081 is **Proposed** and remains so. It is carried here verbatim for zero loss and gains `consolidated_into: ADR-0096`; its `status: proposed` is **NOT** changed to `consolidated` or `accepted`. The decision below is the proposal on the table — it has not been ratified. (This mirrors how ADR-0092 kept ADR-0032 `superseded` rather than flipping it.)

**Decision (verbatim):**

> 1. **Data-driven delivery templates.** New frontend-owned schema (migration 0084):
>    - `delivery_template` (key, name, version, project_type_id?, active) — a
>      reusable playbook, optionally bound to a `project_type` so the board can
>      filter the picker.
>    - `delivery_template_phase` (template_id, ordinal, name, offset_days,
>      duration_days) — mirrors `OnboardingPhaseDef`.
>    - `delivery_template_task` (phase_id, ordinal, title, offset_days,
>      duration_days, **dispatches_ticket** bool, **ticket_queue_id**,
>      **ticket_title**, **ticket_lead_days**) — a task optionally fires a
>      project-queue ticket `ticket_lead_days` before its scheduled start (JIT,
>      ADR-0080 §7). Maps 1:1 to `task_ticket_fire` at instantiation.
> 2. **Human-triggered provisioning from the board.** A won silver `opportunity`
>    surfaces on the delivery board as *ready to provision*. A human picks a
>    `delivery_template` (filtered by the deal's project type when bound), names the
>    project, sets a start date, and confirms. Instantiation creates one native
>    `project`, its `project_milestone`s (from phases) and `task`s (from template
>    tasks) — the **same instantiation contract as `applyOnboardingTemplate`**,
>    generalized — and a `project_provisioning` row (`provision_state='pending'`,
>    `delivery_template_id`, `source_kqm_quote_id`, `autotask_opportunity_id` from
>    the won quote seam). Ticket-dispatching tasks get a `task_ticket_fire` row
>    (`fire_state='none'`, `scheduled_for` derived from offsets, or NULL = manual).
> 3. **Hard contract gate.** `project_provisioning` gains `contract_state`
>    (`none|sent|signed`), `contract_signed_at`, and `contract_envelope_ref` (the
>    DocuSign envelope id, ADR-0071). The executor MUST NOT provision a row whose
>    `contract_state <> 'signed'`. The board shows the gate and blocks the fire
>    control until signed. Until DocuSign is wired the state stays `none` and
>    provisioning is inert by design.
> 4. **Executor stays a pure consumer** (separate issue, backend repo): reads
>    `pending` + `signed` rows, emulates the template into Autotask, JIT-fires
>    tickets, never touches opportunities, checks `idempotency_key`/state before
>    every write (ADR-0080 §4).
> 5. **Onboarding playbook is untouched.** Its easy-mode deploy/verify machinery
>    (ADR-0052 §3) stays on `ONBOARDING_TEMPLATE`. Migrating onboarding onto
>    `delivery_template` is explicitly deferred — the two converge later, not now.

**Security impact (preserved verbatim):**

> No secrets. Schema is additive/idempotent (ADR-0042 — frontend owns it). The
> contract gate is a **safety control**: it prevents the executor writing client
> delivery work into the production PSA before a contract is signed. Provisioning
> remains an admin/`delivery:write` action; the executor's Autotask writes keep the
> ADR-0080 posture (KV creds per call, conservative-on-create, `ZZ-`-marked test
> writes on My Company). `Never commit secrets.`

---

## Consequences

### Security impact

No change to any security posture — this is a documentation consolidation (ADR-0090). Every security control of the member ADRs remains in force and is carried **verbatim**: Autotask write is a deliberately-added, Key-Vault-gated write capability scoped to provisioning, with `ZZ-`-marked test writes on My Company and no destructive ops on the API (`canDelete=False`) (ADR-0080); the **hard contract gate** is a safety control preventing the executor from writing client delivery work to the production PSA before a contract is signed, and provisioning stays an admin/`delivery:write` action (ADR-0081, **Proposed**). Because ADR-0081 is Proposed, its security clauses describe a proposed control, carried verbatim so nothing is lost — not a control currently in force. The backend executor + Autotask write client remain sibling-repo references, not absorbed. `Never commit secrets` — no secrets, tokens, connection strings, queue ids beyond the documented environment-config note, or client PII appear in this dossier or any member file; Autotask/KQM/DocuSign credentials are custodied in Key Vault per the unified security standard.

### Cost impact

None from the consolidation. The member ADRs' cost notes are carried verbatim: no new SaaS spend — reuses existing KQM + Autotask (+ pending DocuSign) licences; Autotask API calls share the documented rate budget; JIT firing reduces ticket volume vs up-front provisioning. Slightly larger ADR corpus to index (one added file); the generated index and `adr-index.json` absorb it mechanically.

### Operational impact

The sale→delivery decision surface is now reconstructable from one file, with the **accepted spine and the proposed provisioning model clearly distinguished**. Member files are retained with `consolidated_into: ADR-0096` — ADR-0080 keeps a retention status of `consolidated`, **ADR-0081 keeps `status: proposed`** — so all inbound `ADR-NNNN` links and history survive and the proposed-vs-accepted distinction is not lost. The generated README index (`scripts/adr-index.mjs`) and `adr-index.json` are regenerated in the same change; `--check` passes. The members' standing operational notes are unchanged and remain the operational truth: provisioning is retry-safe only via the tracking table (Autotask gives no API-side idempotency); the "Project Management" queue id (`29683483`) is environment-specific config, not a constant; the executor's go-live is gated on DocuSign (#318) by the hard contract gate (proposed) — ingest, merge, template authoring, and the board flow ship and are usable before that. When ADR-0081 is ratified, its status flips to `accepted` (and this dossier's §B labels + frontmatter update in the same PR); future sale→delivery decisions either amend a member (updating this dossier's synthesis + web in the same PR) or, if net-new, are authored standalone and folded in at the next consolidation pass.

## Future considerations

- This dossier is vectorized into gold alongside other knowledge once stable (ADR-0090 future considerations; LocalPipeline).
- The member ADRs' own future items are carried verbatim and unchanged: true template-management UI (ADR-0080 — v1 emulates from a designated `projectType=3` template project); two-way status reflection (Autotask task completion → native plan progress); auto-draft-on-won and deal-type→template auto-mapping once templates are trusted (ADR-0081); unifying the onboarding playbook onto `delivery_template`; promoting `task_ticket_fire.scheduled_for` derivation into a backend scheduler (ADR-0081).
- **When ADR-0081 is ratified**, promote its member status `proposed → accepted`, flip its retention to `consolidated`, and re-label Synthesis §B + the dossier's own status line — all in the ratifying PR.
- The same consolidation method (ADR-0090) applies to the remaining clusters.
