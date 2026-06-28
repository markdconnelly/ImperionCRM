# IT-10 — Provisioning, Asset & CMDB Management

> Distinct Information Technology policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [IT Operations Program umbrella](IT-00-it-operations-program.md). **New policy** (no
> legacy IM source): it formalizes how Imperion provisions services, tracks assets, and maintains
> the Configuration Management Database (CMDB) across its own and managed client estates, aligned
> to Autotask and Intune and the silver `cloud_asset` model (ADR-0078). Governance terms
> (autonomy ladder, dial, gauntlet, `always_gate`, easy-button, pool principle) are defined ONCE
> in the top umbrella; this policy localizes them.

| Field | Value |
| --- | --- |
| **Policy ID** | `IT-10` |
| **Title** | Provisioning, Asset & CMDB Management |
| **Category** | Information Technology |
| **Tier** | distinct |
| **Human owner** | Chief Technology Officer (Derek / Mark; chief architect Luke) |
| **Governing for (agents)** | Pierce (Projects/Provisioning) — primary · Marshall (Change/Release — CI changes) · Ozzie (NOC — discovery/drift) |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [IT-00 IT Operations Program](IT-00-it-operations-program.md) + [IT-02 Change & Configuration Management] + [CS-12 Data Classification & Handling] |

**Framework Alignment:** NIST CSF 2.0 (ID.AM-01–08 Asset Management, PR.PS) · AICPA SOC 2 (CC6.1,
CC8.1 Change Management) · ITIL (Service Asset & Configuration Management, Service Request
Fulfilment).

---

## 1. Purpose

This policy governs how IT services and resources are provisioned, how physical, virtual, and
cloud assets are inventoried, and how the Configuration Management Database (CMDB) is maintained as
an accurate, authoritative record of Configuration Items (CIs) and their relationships — for
Imperion and every managed client. An accurate CMDB is the foundation for change impact analysis,
incident triage, licensing, and security posture. A technician (or a provisioning agent) reads
this and knows how a service is stood up under least privilege, what must be recorded, and how the
asset record stays true to reality.

## 2. Scope

**Who:** all IT delivery actors — human technicians and the agents that provision and track assets
(Pierce, Marshall, Ozzie). **What:** provisioning, asset inventory, and CMDB maintenance for ALL
Imperion and Imperion-managed resources — workstations, servers, network devices, mobile/endpoint
(IT-07), cloud workloads and the silver `cloud_asset` model, licenses, and the CI relationships
between them; the Operating Procedures in Stream 03 (Sold → Live, provisioning) and Stream 06
(Change → Release, CI changes), plus the asset-lifecycle steps elsewhere. This policy binds humans
and agents identically except where §5 narrows or gates an agent's authority. No business unit is
excluded.

## 3. Definitions

Only terms unique to this policy; canonical and governance terms defer to CONTEXT.md and the top
umbrella.

- **Configuration Item (CI)** — Any component (asset, service, relationship) tracked in the CMDB
  because it must be managed to deliver a service.
- **CMDB** — The Configuration Management Database: the authoritative record of CIs and their
  relationships. Imperion's CMDB is realized as the silver `cloud_asset` / asset model (ADR-0078),
  reconciled against Autotask and Intune.
- **Provisioning** — Standing up a service, account, or resource for Imperion or a client.
- **Discovery** — Automated detection of assets/CIs from source systems (Intune, Autotask,
  Microsoft Graph, network scans).
- **Drift** — A divergence between the CMDB record and the observed real-world state of a CI.

## 4. Policy Statements

1. **Provisioning is least-privilege and contract-gated.** No resource is provisioned for a client
   without a signed contract/SOW authorizing it. Provisioning grants only the access and capacity
   the service requires (least privilege); standing access beyond the service scope is prohibited.
   Every provisioning action is reversible or has a documented undo path.
2. **Single asset/CMDB system of record.** The CMDB (the silver `cloud_asset`/asset model,
   ADR-0078) is the authoritative inventory. Assets are reconciled against **Autotask** (the
   service-management/contract system of record) and **Intune** (the endpoint posture source);
   where sources disagree, the reconciliation rules in the OKF concept resolve authority — the
   CMDB does not hold a competing, hand-maintained copy.
3. **Every asset is recorded with required attributes.** At minimum: identifier, type, owner,
   responsible client/tenant, classification (CS-12), lifecycle state (provisioned → in-service →
   retired → disposed), location/host, and relationships to other CIs. Assets are tagged to a
   client within the pool boundary so client-facing data never bleeds across tenants (top-umbrella
   §5.3).
4. **Discovery and drift reconciliation.** Assets are discovered automatically from source systems
   on a defined cadence. Detected drift between the CMDB and reality is raised as a finding and
   reconciled; an unrecorded asset in production is a finding, not an accepted state.
5. **CI changes follow change management.** Any change to a CI (configuration, relationship,
   lifecycle state) is governed by IT-02 — risk-classified, approved, and recorded. The CMDB is
   updated as part of the change, never after the fact.
6. **Decommissioning and disposal.** Retired assets are sanitized (CS-12; physical/environmental
   controls), their access and licenses reclaimed (IT-08/IT-09), and their CI moved to retired/
   disposed state with the disposal recorded. Licenses freed on decommission are returned to the
   pool.

## 5. Application to Autonomous Agents

For provisioning, asset recording, and CMDB maintenance:

- **Autonomy ceiling.** Pierce (Projects/Provisioning) operates at an **L4** ceiling (ADR-0128):
  it may **auto-provision with undo** — standing up the approved service/resource and writing the
  CI — provided the action is **contract-signed-gated** and **least-privilege**. Marshall
  risk-classifies and gates CI changes at L2; Ozzie discovers assets and raises drift at its
  ceiling.
- **`always_gate` actions.** Provisioning without a signed contract, any grant of privileged or
  cross-tenant access, and irreversible decommission/disposal are **`always_gate` at every dial
  level** — they touch billing/permissions or are irreversible (top-umbrella §4). The CTO or
  project owner approves via the easy-button. Pierce's L4 auto-provision applies only to
  reversible, contract-backed, least-privilege actions; anything outside that envelope gates.
- **Human-in-loop & easy-button.** As the dial climbs, Pierce auto-assembles the full provisioning
  plan (resources, access, CI records, undo path) and either executes within its undo window or
  hands the human a **one-click** apply (top-umbrella P3). The contract-signed precondition and any
  irreversible step stay human at every level.
- **Escalation & refusal.** Agents escalate (top-umbrella P4) on missing contract authorization,
  detected drift on a security-relevant CI, or a provisioning request exceeding least privilege.
  Pierce **refuses** to provision without a signed contract or beyond least privilege, even if a
  dial setting would technically allow it (top-umbrella §5.5).
- **Evidence.** Every provisioning, CI write, and decommission action writes an audit record to the
  `agent_run` / `agent_message` ledger — the resource, the authorizing contract, the
  least-privilege scope, the CI/relationship changes, the undo path, and the approve/decline
  attributed to the accountable human.

## 6. Roles & Responsibilities

| Role / Agent | Responsibility |
| --- | --- |
| CTO (human) | Owns provisioning/asset/CMDB practice and this policy; approves privileged/cross-tenant and irreversible actions |
| Project owner / technician (human) | Confirms contract authorization; validates least privilege; approves disposal |
| Asset/CI owner (human) | Keeps assigned CIs accurate; reconciles drift findings |
| Pierce — Projects/Provisioning (agent, L4 + undo) | Auto-provisions contract-signed, least-privilege, reversible services; writes CIs; never provisions un-contracted or beyond least privilege |
| Marshall — Change/Release (agent, L2) | Risk-classifies and gates CI changes |
| Ozzie — NOC (agent) | Runs discovery; raises drift and unrecorded-asset findings |

## 7. Enforcement & Audit

Adherence is enforced structurally (the contract-signed gate, least-privilege budget, change
control on CIs, the gauntlet's billing/irreversible floor) and verified continuously (discovery/
drift reconciliation, asset-record completeness checks, the agent eval goldens, and the
conformance/audit sweep run by Grace/Vera). The [coverage-matrix](../coverage-matrix.md) proves
every provisioning/asset procedure is bound to this policy, and the `cloud_asset` OKF concept keeps
the asset model's meaning in sync (ADR-0086). Provisioning without authorization, or an unrecorded
production asset, is a finding; for an agent, an un-contracted or over-privileged provisioning
attempt parks the work, escalates, and lowers the dial or trips the kill-switch.

## 8. Related

**Procedures governed:** Stream 03 (Sold → Live — provisioning) · Stream 06 (Change → Release — CI
changes) + asset-lifecycle steps. **Related policies:**
[IT-00 IT Operations Program](IT-00-it-operations-program.md) ·
[IT-02 Change & Configuration Management] ·
[IT-07 Endpoint & Device Baseline](IT-07-endpoint-and-device-baseline.md) ·
[IT-08 Account & Access Lifecycle](IT-08-account-and-access-lifecycle.md) ·
[IT-11 Documentation & Knowledge Management](IT-11-documentation-and-knowledge-management.md) ·
[CS-12 Data Classification & Handling]. **ADRs:** ADR-0078 (CMDB) · ADR-0128 (autonomy ladder) ·
ADR-0109 (dial + hard ceilings) · ADR-0058 (gauntlet) · ADR-0086 (OKF semantic layer) · ADR-NNNN
(policy-canon architecture).
