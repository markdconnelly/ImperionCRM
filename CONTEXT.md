# Imperion Business Manager

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

**Tenant Mapping**:
The explicit, admin-managed link from a Customer Tenant to an account. One account per tenant; an account may own several tenants. Never inferred from domains.
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

### Agent automation (ICM, ADR-0061)

**ICM Workspace**:
One business workflow defined as files under `icm/workspaces/<slug>/` — Layer-1 routing CONTEXT.md, numbered stage contracts, workflow-local runtime skills. The factory; runs are platform records, never files.
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
