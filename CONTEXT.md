# Imperion OS

The MSP business-management app (CRM + support + delivery + security posture) for Imperion. One app across four repos; this repo owns the database schema and the UI. Data flows bronze → silver → gold per source, merged into unified objects the app reads.

## Language

### Versions & launch

**v1 "Complete"**:
The first release — the complete filed product, shipped AI-first. Scope rule: every feature filed by 2026-06-11 is v1, plus employee time tracking (ADR-0082, pulled into v1 2026-06-13). Not an MVP, not an operational core that automates later.
_Avoid_: Operational (the old thin-v1 name), MVP, phase 1

**v2 "Refined"**:
The first major iteration: refinement driven by real usage — feedback review, earned autonomy, trend-aware board, persona editing. Never new-wave completion work.
_Avoid_: Automated (a retired wave name; automation is v1 scope)

**Go-Live**:
The v1.0.0 cut, the employee rollout, and employees' first touch of the app — one event, not three. There is no 0.x soft launch or per-module rollout.
_Avoid_: soft launch, pilot, beta

**Agent-Quality Eval**:
The scripted v1 acceptance gate for the AI experience: orchestrator answers across all nine gold entity types, a board session over a real packet, RAG citation spot-checks — run green plus Mark's hands-on UX sign-off.
_Avoid_: smoke test, vibe check

### Projects & delivery

**Project Type**:
A user-creatable category of project (table, not enum), created from the project board. Onboarding is the seeded, protected, foundational type — it gets its own dedicated page; all other types live on the project board.
_Avoid_: project category

**Project Task**:
A task (the one unified task object) linked to a project. There is exactly one task model; sales, project, and ad-hoc tasks differ by category and linkage, never by table.
_Avoid_: project ticket, delivery task (as a separate object)

**Easy Mode**:
Onboarding's automation surface: a playbook step carries a button that fires a function performing the real configuration in the customer's environment via the authorized API. Clicking is deploying — not a checkbox.
_Avoid_: one-click setup, wizard

**Easy-Mode Deploy**:
One execution of an easy-mode step's configuration function. The corresponding project task is closed by a verification job confirming the configuration is actually in place — close-on-verification, never close-on-click. Idempotent; no-op with an audit note when no linked task exists.
_Avoid_: auto-complete, step sync

**Project Board**:
The general surface where projects of every type are created and tracked. Onboarding projects appear here like any other; their dedicated Onboarding page is the easy-mode surface, not their home.
_Avoid_: board (unqualified — the Board of Directors page owns that word), kanban

**Sales Task**:
A task with the sales category — a rep's next concrete sales action on a deal or contact. Same task object as everything else; the category is the discriminator.
_Avoid_: sales ticket, activity (unqualified)

**Sales Queue**:
A rep's ordered list of their open sales tasks, grouped by due date and deal — the working surface of the sales activity page. A read model, not a stored object.
_Avoid_: sales pipeline (that's deals by stage), task list (unqualified)

### Time tracking

**Employee**:
The internal person who tracks time — an existing `app_user` (the Entra-mirrored identity, ADR-0016) extended for time tracking with an Employee Classification, an effective-dated Pay Rate, and the external mappings that let the three signals join: an **Autotask Resource id** (to attribute Ticket Time Entries) and a **QuickBooks vendor/employee id** (to match payments). The employee's **email is the consistent join key** across all three systems — mappings auto-resolve by email (resolved ids stored for stability and audit). Comp fields live in a separate, payroll-role-gated store, never on the Entra-synced identity row.
_Avoid_: user (unqualified — `app_user` is the identity; Employee is the time-tracking extension), staff, technician (a technician is an Employee who works tickets)

**Time Entry**:
One block of an employee's day on the Imperion site: a **start time and end time** on a given day, from which **duration is calculated** (never hand-entered) — plus notes, a **category** (`billable` → tied to an Ancillary Ticket · `internal` · `admin`), and optionally a noted Ancillary Ticket. The *authoritative source* for an employee's time. An employee may have several per day. Entered manually (a live punch-clock is a later add). Sourced as `website` bronze. (`pto`/`holiday` categories are dormant until W2 — out of v1.)
_Avoid_: punch, clock-in record (those are inputs); duration entry (duration is derived, not typed)

**Attestation**:
The employee's affirmation that a submitted Timesheet's Time Entries are their true, accurate time. Submitting *is* attesting — it moves the Timesheet to **Submitted** and **hard-locks the employee out**: from then on only an Admin can edit. The attested original is preserved for audit even when an Admin later corrects.
_Avoid_: approval (that's the admin's later act), confirmation

**Approval**:
The Admin's act of accepting a Submitted Timesheet, optionally after correcting it. Only Admins approve and only Admins edit a Submitted Timesheet. Approval moves it to **Approved** and triggers the write of the Time Ticket to Autotask; corrections before approval are audited against the employee's attested original. Distinct from Payroll Approval.
_Avoid_: sign-off, attestation (that's the employee's act)

**Payroll Approval**:
The second, payroll-facing approval — accepting an Approved Timesheet for payment. Held by the **CFO (Nick), Admins, and Super Admins** (`canApprovePayroll`). It does not pay; it authorizes the manual payment outside the app. Moves the Timesheet to **Payroll-Approved**.
_Avoid_: approval (unqualified — that's the admin correctness gate), finance sign-off

**Employee Classification**:
Whether an employee is paid as **1099** (contractor) or **W2** (employee). Drives the expected-pay math and which QuickBooks record is authoritative. **v1: every employee is 1099** — paid their hourly Pay Rate directly with no withholding (gross = net), settled as a QuickBooks **vendor/AP payment**. **W2** is supported in the model but dormant: it brings tax withholding (gross ≠ net), a QuickBooks **payroll** record, and overtime — deferred until the first W2 hire.
_Avoid_: contractor/employee (use 1099/W2), worker type

**Pay Rate**:
An employee's compensation rate, **effective-dated** (a Timesheet reconciles against the rate in force that week). For 1099 it is an hourly rate paid straight (no overtime); W2 adds hourly-with-overtime or salaried. Sensitive comp data: visible only to payroll roles (`canApprovePayroll`), never to the employee themselves, agents, or any client-facing surface. Kept to compute expected pay and efficiency analytics.
_Avoid_: salary (a Pay Rate may be hourly or salaried), cost (that's a derived figure)

**Payroll Reconciliation**:
The check that the manual payment was done and done correctly: **expected pay** (a Timesheet's approved hours under the employee's effective Pay Rate) lined up against the **authoritative QuickBooks payment**. The match — employee + pay period + amount within tolerance — is what sets the Timesheet **Paid**. Distinct from the time-side Reconciliation.
_Avoid_: payment matching (use the full term)

**Paid**:
The terminal Timesheet state, set when Payroll Reconciliation matches an Approved Timesheet to its authoritative QuickBooks payment. QuickBooks is read **read-only** and is the system of record for the payment fact; Imperion never initiates or records a payment — it only verifies one QuickBooks already holds.
_Avoid_: closed, settled; "pay" as a verb the app performs (it never pays)

**Ticket Time Entry**:
A native Autotask TimeEntry an employee logs against a ticket or project task as they work it. The *corroborating* per-ticket signal, read into `autotask` bronze — generally less total time than the day's attendance, scattered across tickets in the same period. Never authoritative.
_Avoid_: time entry (unqualified — that's the website one), billable time (a property, not the object)

**Timesheet**:
The weekly (**Monday–Sunday**), per-employee container of Time Entries. The unit that is attested, reconciled, approved, paid, and documented in Autotask. One employee, one week, one Timesheet. Lifecycle: **Open → Submitted → Approved → Payroll-Approved → Paid**.
_Avoid_: timecard, pay period (a Timesheet is a week, not a pay cycle)

**Time Ticket**:
The single weekly ticket Imperion writes to Autotask to document a submitted Timesheet — the attestation artifact in the system of record, mirrored back into Imperion like any other ticket. It records the reconciled summary; it does **not** re-create the Ancillary Ticket Time Entries (which already live in Autotask), so the two never double-count.
_Avoid_: general time ticket, summary ticket (use Time Ticket)

**Ancillary Ticket**:
An ordinary client/project ticket that already carries an employee's Ticket Time Entries. At entry time the site surfaces the employee's Ancillary Tickets to jog their memory of the day's blocks before they submit. The Time Ticket is not one of these.
_Avoid_: work ticket, related ticket

**Time Record**:
One normalized row in the single silver time-tracking table, discriminated by `source` (`website`/`autotask`) and `kind` (`attendance` for a Time Entry, `allocation` for a Ticket Time Entry). The authoritative unified timeline of every time fact per employee; website attendance rows are the source of truth, Autotask allocation rows corroborate.
_Avoid_: time row, timesheet line (a Time Record is one fact, not a sheet)

**Reconciliation**:
The per-employee, per-day lineup of attested attendance (Time Entries) against the same period's Autotask Ticket Time Entries, yielding a daily verdict — **Balanced**, **Under-logged**, or **Over-logged** — and any Deviations. A derived read model over Time Records, not a stored source. Attendance is the envelope; logged ticket work fills it; the visible gap is unallocated time.
_Avoid_: sync, matching (unqualified)

**Deviation**:
A flagged mismatch surfaced by Reconciliation, of one of six kinds (over-logged, temporal orphan, under-logged gap, attended-nothing-logged, logged-never-attended, overlap). **Hard** deviations (over-logged, overlap) are logical impossibilities that block Attestation until resolved; **Soft** deviations are real-day texture that nudge and may be attested with an explanatory note.
_Avoid_: error, exception (unqualified), conflict

### Expenses

**Expense Item**:
One normalized row in the single silver expense table, discriminated by `source` and `kind` (`mileage` | `out_of_pocket`). Carries date, mapped category, amount, merchant/description, a **reimbursable** flag, a **billable** flag (with an optional client `companyID`/project/ticket link), and — for out-of-pocket — a receipt reference. The website-attested value is authoritative; for mileage, MileIQ is authoritative for the **miles** fact only (the amount is miles × the Imperion rate). An employee may have many per report.
_Avoid_: expense line, receipt (a receipt is the evidence attached to an out-of-pocket item, not the item)

**Expense Report**:
The **monthly**, per-employee container of Expense Items — the unit that is attested, policy-checked, approved, reimbursed, and documented in Autotask. Required only when the employee incurred ≥1 expense that month; no expenses, no report. Lifecycle: **Open → Submitted → Approved → Finance-Approved → Reimbursed** (with **Rejected → reopen**).
_Avoid_: expense claim, report (unqualified — the BI hub owns that word), monthly close (that is the finance task, not the container)

**Attestation** (expense):
The employee's affirmation that a submitted Expense Report's items are true and accurate. Submitting *is* attesting — it moves the report to **Submitted** and **hard-locks the employee out**: only an Admin edits thereafter. Every out-of-pocket item must have a receipt and all **Hard** policy violations must clear before attest (mileage is receipt-exempt). The attested original is preserved for audit.
_Avoid_: approval (the admin's later act), claim submission

**Approval** (expense):
The Admin's act of accepting a Submitted Expense Report, optionally after correcting it against the attested original. Moves it to **Approved** and triggers the idempotent Autotask ExpenseReport write. Distinct from Finance Approval.
_Avoid_: sign-off, attestation (the employee's act)

**Finance Approval** (expense):
The payment-facing approval — accepting an Approved Expense Report for reimbursement. Held by `canApprovePayroll` (**CFO / `finance` ∨ `admin`**). It does not pay; it authorizes the manual reimbursement outside the app. Moves the report to **Finance-Approved**. The same gate and the same Monthly Close that authorize time payment.
_Avoid_: payroll approval (that is the time-side term; expenses are not payroll), approval (unqualified)

**Reimbursable** vs **Billable**:
Two **independent** properties of an Expense Item. **Reimbursable** = the employee paid personally and is owed the money back (the employee leg → a QuickBooks AP bill). **Billable** = the cost is passed through to a client on their invoice (the client leg → Autotask `isBillableToCompany` + `companyID`). An item can be **both** — reimbursed to the employee *and* billed to the client. Default is internal (Imperion), non-billable.
_Avoid_: chargeable (use billable), expensable (use reimbursable)

**Mileage Rate**:
The per-mile reimbursement rate, **effective-dated** and configurable, used to compute a mileage item's amount (miles × rate). **Defaults to MileIQ's suggested rate** (captured per drive) and is **overridable on a system basis**. Sensitive comp data: lives in the payroll-role-gated comp store beside Pay Rate, visible only to `canApprovePayroll`, never to the employee, agents, or any client surface.
_Avoid_: IRS rate (a default source, not the rate), MileIQ rate (that is only the default suggestion)

**MileIQ Drive**:
One business-classified drive auto-captured by MileIQ and pulled (read-only OAuth) into `mileiq_drive` bronze, normalizing to an `Expense Item(kind=mileage)`. Personal drives never enter. MileIQ is authoritative for the miles fact; the dollar amount is Imperion's (miles × Mileage Rate).
_Avoid_: trip, mileage entry (unqualified)

**Expense Category**:
A clean, user-facing category **hard-linked to a QuickBooks chart-of-accounts account** (QuickBooks is the category SoR). An Admin maps each synced QuickBooks account to a category with caps, a soft threshold, a billable-default, an Autotask `expenseCategory` id, and a visibility toggle. A needed-but-absent category is **created in QuickBooks manually** by finance, then synced back and mapped — the app never writes QuickBooks. **Mileage** is a receipt-exempt system category.
_Avoid_: account (that is the QuickBooks side), expense type

**Expense Policy**:
The configurable rule set the policy engine evaluates per item, pre-attest, surfaced as a memory-jogger. **Hard** violations (missing receipt, over a category hard-cap, dated outside the month) block attest; **Soft** violations (suspected duplicate, over a soft threshold, billable missing a client link, uncategorized) nudge and may be attested with a note. Each violation links to the canonical **company expense policy in IT Glue** (authored separately as a business document).
_Avoid_: rule (unqualified), validation

**Reimbursement Reconciliation**:
The check that the manual reimbursement was done and done correctly: **expected** (an Expense Report's approved reimbursable total) lined up against the **authoritative QuickBooks bill-payment** (read-only). The match — employee + period + amount within tolerance — sets the report **Reimbursed**. Books as a **separate AP bill**, distinct from the payroll wage. Distinct from the time-side Payroll Reconciliation, though both close in the same Monthly Close.
_Avoid_: payment matching (use the full term), payroll reconciliation (that is the time leg)

**Reimbursed**:
The terminal Expense Report state, set when Reimbursement Reconciliation matches an Approved report to its authoritative QuickBooks bill-payment. QuickBooks is read **read-only** and is the system of record for the payment fact; Imperion never initiates or records a reimbursement — it only verifies one QuickBooks already holds.
_Avoid_: paid (that is the time-side terminal state), settled, closed

**Monthly Close**:
The single monthly finance task that approves and confirms payment for **both** time and expenses per employee: aggregated time total (weekly Timesheets rolled up) + reimbursable expense total, both QuickBooks match statuses, and open obligations (approved-but-not-yet-confirmed-paid). Where the manual payment steps are validated as complete. Its existence makes time **payment** monthly (weekly capture → monthly pay — an ADR-0082 amendment), while time capture stays weekly.
_Avoid_: month-end (unqualified), payroll run, close (unqualified)

### Marketing & events

**Event**:
A scheduled gathering Imperion hosts — a webinar or a live event — with its own registration and attendance. An event is a thing that happens; campaigns are how it gets filled.
_Avoid_: meeting (that's a per-contact interaction record), webinar campaign

**Event Registration**:
One contact's signup for an event, arriving through the capture inbox like any other lead. Attendance (attended / no-show) is recorded after the event and can drive nurture.
_Avoid_: RSVP, attendee (before the event has happened)

**Campaign Send**:
One schedulable blast — email or SMS — from a campaign to an audience or to an event's registrants, fired at a set time or relative to the event's start. Always consent-gated per recipient at send time.
_Avoid_: blast (in UI copy), broadcast, workflow (that's a per-contact journey)

**Builder**:
A guided, per-channel form that produces a previewable, typed configuration — for an ad, an email, an SMS, or an event. Not a drag-drop canvas.
_Avoid_: designer, editor (unqualified)

### Board of Directors (ADR-0054)

**Influence Profile**:
A board persona's character: a reasoning lens built from named thinkers' published frameworks, cited by work. A persona never impersonates or speaks as a real person.
_Avoid_: impersonation, AI clone, digital twin

**Anchor / Lens**:
An influence profile's structure — one dominant anchor framework that sets the persona's voice, plus named secondary lenses it invokes when relevant.
_Avoid_: blend, mixture

**Board Packet**:
The pre-deliberation written brief (reporting, knowledge pulls, posture, pipeline data) composed once per session; every persona deliberates over the same packet, persisted for audit.
_Avoid_: context dump, snapshot (that's the legacy thin input)

**Advisor Seat**:
A convene-time invited board persona (≤2 per session). Advisors speak in deliberation but are counsel, not votes.
_Avoid_: board member (advisors are not members), guest

**Deputy Draft**:
The CISO Staff Analyst's security position, drafted from posture gold data *for* the human CISO. It stands only when the human CISO hasn't spoken, and is then labeled unreviewed staff analysis.
_Avoid_: CISO position (that's the human's), AI CISO

**CISO Position**:
The human CISO's stated position in a session — convene-time field in v1, captured at the `awaiting_ciso` pause in v2. Carries veto weight on security matters in synthesis; supersedes the Deputy Draft wherever they conflict.
_Avoid_: convener context (that's general input), override (that's post-session)

**Ratify / Overrule**:
The human CISO's post-session review verdict on a board recommendation, with written rationale. An overruled recommendation never reads as board consensus.
_Avoid_: approve/reject (that vocabulary belongs to ADR-0033 action proposals)

### Security posture

**Customer Tenant**:
A Microsoft Entra tenant belonging to a customer, identified by its tenant GUID. The unit all Microsoft-sourced posture data is keyed by.
_Avoid_: tenant (unqualified, ambiguous with Imperion's own tenant), organization

**Client Mapping**:
The explicit, admin-curated link from a connector's external unit (company / tenant / site / domain) to an `account` — one reusable surface across every per-client connector (ADR-0112). Backed by two stores: `entity_xref` for orgs/tenants/sites (backend-written; the web role is SELECT-only by design, migration 0160) and `account_domain` for domains (GUI-written). Per-client connectors (m365, autotask, itglue, pax8, myitprocess, quotemanager, televy, darkwebid, unifi) expose it via an **Edit client mappings** button; system/company connectors (qbo, meta, docusign, apollo, plaud, user-scope) omit it. Every accepted suggestion or manual override is `match_method='manual'`; auto/fuzzy resolution stays the backend resolver's job (epic #1049).
_Avoid_: entity resolution (that's the backend resolver's automatic arm), connector mapping (unqualified)

**Tenant Mapping**:
The M365 instance of Client Mapping (ADR-0112): the explicit, admin-managed link from a Customer Tenant to an account. One account per tenant; an account may own several tenants. Never inferred from domains. The legacy `account_tenant` table is backfilled into `entity_xref` (migration 0165) and kept readable during a deferred cutover.
_Avoid_: tenant matching, domain mapping

**Imperion Secure Score**:
The composite 0–100 security score for an account, calculated across all Posture Pillars. "Secure score" unqualified always means Microsoft's number; this is always qualified as Imperion's.
_Avoid_: secure score (unqualified), composite score, total score

**Posture Pillar**:
One scored security domain feeding the Imperion Secure Score (M365 secure score, policy compliance, network, vulnerability, phishing, dark web). A pillar with no data for an account scores 0 — no coverage is not "fine" — and is rendered as "No coverage", never as a failure.
_Avoid_: category, dimension

**Posture Snapshot**:
An immutable, per-account record of the Imperion Secure Score and every pillar's normalized result, taken quarterly on a schedule or on demand. Snapshots store their Score Model version and their grade at capture time; neither is ever recomputed.
_Avoid_: posture report (that's the rendered document), score history

**Score Model**:
The versioned definition of which pillars exist and their weights. Composite trends are only compared within one model version; pillar trends span versions.

**Golden State**:
The human-approved baseline configuration for a tenant's security policies. Observed policies are classified against it as compliant, drift, ungoverned, or missing.
_Avoid_: baseline (unqualified), template

**Device Compliance**:
The per-device policy state reported by Intune (managedDevices). The only honest source for a device-level posture indicator; tenant-level classification is never proxied down to a device.

**DNS Zone (Azure)**:
A `Microsoft.Network/dnsZones` resource hosting a customer domain in Azure DNS — the manage plane, read via ARM. Distinct from what a domain publicly resolves to; an Azure zone can be overridden by registrar-level NS.
_Avoid_: domain (unqualified), hosted zone

**DNS Record Snapshot**:
One captured DNS recordset (type, name, value, ttl) tagged by `plane` — `azure` (authoritative zone config via ARM) or `public` (what the domain resolves to from the outside). Public is the only signal for domains not in Azure DNS.
_Avoid_: DNS entry, lookup

**DNS Golden State**:
The human-approved baseline DNS records for a domain. Captures are classified against it as compliant, drift, ungoverned, or missing — the same semantics as the policy Golden State (ADR-0051), scoped per domain.
_Avoid_: baseline (unqualified), correct DNS

**DNS Governance Verdict**:
The per-domain manageability ladder: `not-in-azure` (no Azure zone) -> `in-azure-readonly` (zone exists, no write role) -> `managed` (in Azure, write proven, live NS delegate to that zone). Only `managed` means "hosted in Azure and manageable".
_Avoid_: DNS status, managed (unqualified)

**DNS Posture Pillar**:
A future Posture Pillar scoring DNS health (drift + governance verdict). Not in Score Model v1; enters v2 behind an ADR-0051 amendment once the feed is populated.

### Personal knowledge (#966 / #968)

**Personal Knowledge Store**:
A per-employee, owner-scoped second brain spanning **two substrates** — the Synthesis Store (Postgres) and the Curated Vault (Azure Blob + a local synced folder). Owner-private by contract: one employee's store is invisible to every other employee and to admins via the app (enforced by the personal-axis RLS, ADR-0105). Six exist day-one (Mark, Derek, Nick, Luke, Brandon, Anna).
_Avoid_: personal brain (use Store), memory (unqualified)

**Capture**:
One immutable raw input to a Personal Knowledge Store — verbatim text (note, transcript, message) held in Postgres, or a binary (image/audio) held in the vault's Blob container with a routing record. The audit floor and the re-synthesis source; never silently edited, but an admin may explicitly purge garbage. Synthesis is derived from Captures.
_Avoid_: bronze (reserve for the company medallion), drawer (a vault file), raw (unqualified)

**Synthesis Store**:
The Postgres half of a Personal Knowledge Store — where personal input is **synthesized** into structured facts, a temporal knowledge graph, and pgvector embeddings (OpenBrain-style). The system of record and the queryable/retrievable substrate.
_Avoid_: silver/gold (those name the company-tier medallion), database (unqualified)

**Curated Vault**:
The **Azure Blob** half of a Personal Knowledge Store — a per-employee container (slug e.g. `vault-mark`) holding an agent-maintained filesystem of **markdown files only**, mirrored to a **real local folder** the owner edits in Obsidian/VS Code (synced over HTTPS by LocalPipeline; no server/SMB/VPN). A curated, human-readable representation of what the person knows. Rooms are blob path prefixes; binaries (images) also land here and are **routed** into Distillation. Not raw capture; a curated projection (ADR-0114 §8).
_Avoid_: bronze (it is curated, not raw), mounted drive (it is a synced local folder), Obsidian vault, second brain (that is the whole Store)

**Room Path**:
The scoping address a Capture and its Knowledge Facts carry (e.g. `mark/projects/imperion-os`), mirroring the Curated Vault folder tree 1:1 — wing = top segment (person/project), room = topic segment. Scoped retrieval is a path-prefix filter, not a flat-corpus scan. The vault folders are the canonical structure (MemPalace-style); Postgres mirrors, never re-defines. Promoted to a first-class table only if a real driver (per-room ACL/metadata) appears.
_Avoid_: wing/room as tables, folder (unqualified), namespace

**Knowledge Fact**:
A synthesized assertion in a Synthesis Store — an entity–relation–object triple carrying a **Validity Window**. Facts **expire** (are invalidated) rather than silently going stale; "freshness = correctness" is data, not convention. Derived from Captures; the nodes/edges of the personal temporal knowledge graph.
_Avoid_: triple (unqualified), memory, embedding (that is the retrievable form of a fact)

**Validity Window**:
A Knowledge Fact's `valid_from` / `valid_to`. **Invalidate** closes the window when a fact is superseded; **Timeline** queries a subject's facts across windows. The temporal axis of the knowledge graph.
_Avoid_: TTL, expiry (unqualified)

**Distillation**:
The agent process that turns a Capture into **several resolution levels**: literal (verbatim transcript), summary, and meaning (Knowledge Facts + embeddings). Uploads are distilled the same way. The Curated Vault presents the distilled, **current** state with cross-references; stale levels flush as their Validity Windows close. Multi-resolution by design — drill from summary to verbatim on demand.
_Avoid_: summarization (that is one level), extraction (unqualified), chunking

**Personal Curator**:
The owner-scoped agent routine that keeps a Personal Knowledge Store's two substrates in sync — projecting Synthesis Store changes into the Curated Vault, processing blob-first or human-edited markdown back into the Synthesis Store, and **hunting contradictions** between the two to surface for the owner's approval. Operates strictly within one owner's scope; it never crosses the personal→company wall (that is the separate promotion path, ADR-0105 §3c).
_Avoid_: curation service identity (that is the cross-wall promoter), sync job

**Knowledge Contradiction**:
A conflict the Personal Curator detects between the Synthesis Store and the Curated Vault (or between a new fact and an existing one) — never auto-resolved; bubbled up for the owner to approve a correction.
_Avoid_: conflict (unqualified), drift (that is a posture term)

### Agent automation (ICM, ADR-0061)

**ICM Workspace**:
One business workflow defined as files under `icm/domains/<domain>/<workflow>/` (the domain tier, ADR-0088) — Layer-1 routing CONTEXT.md, the `agent.yaml` manifest, composed `prose.md`, numbered stage contracts, workflow-local runtime skills. The factory; runs are platform records, never files. Reference: `icm/domains/sales/lead-response/`.
_Avoid_: workflow (unqualified — that's the in-app Workflows module), pipeline (that's data ingestion)

**Stage Contract**:
A stage's CONTEXT.md: Job, Inputs table, Process, Outputs, Audit, optional Checkpoint. The agent loads only what the Inputs table lists.
_Avoid_: prompt, stage config

**Checkpoint**:
A stage boundary where the run parks for human approval/edit in the approval queue. In `auto` mode a checkpoint may self-approve only what its contract explicitly allows.
_Avoid_: review step, gate (unqualified)

**Autonomy Dial**:
The per-workflow `draft` → `auto` setting — admin-only, audited, reversible; every workflow starts `draft`. Tiered mode is a future ADR.
_Avoid_: autopilot, trust level

**Runtime Skill**:
Knowledge the orchestration layer loads on demand — shared library `icm/skills/` or workflow-local. Distinct from Developer Skills (`plugins/imperion-skills/`, Claude Code's, ADR-0060).
_Avoid_: skill (unqualified where ambiguous), agent prompt
