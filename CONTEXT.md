# Imperion Business Manager

The MSP business-management app (CRM + support + delivery + security posture) for Imperion. One app across four repos; this repo owns the database schema and the UI. Data flows bronze → silver → gold per source, merged into unified objects the app reads.

## Language

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
