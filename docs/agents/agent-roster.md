# 👥 The agent roster — the staffed org chart

The canonical **org chart**: **1 orchestrator (Nova) + 5 C-suite + 21 domain agents**,
plus the **7 human staff** they report up to. Each agent has a persona, a voice, an
origin story, and policy-bound guardrails. The single SoT for the chart is
[`icm/org.yaml`](../../icm/org.yaml) (it feeds the `/org` view and the public promo
chart); this doc is the human-readable catalogue.

[← The AI suite](README.md) ·
[Orchestration & observability matrix](orchestration-matrix.md) ·
[The autonomy dial](autonomy-dial.md)

> **Workspace = department = ICM domain.** Each domain agent staffs one ICM domain
> (`icm/CONVENTIONS.md` §Vocabulary). The single agent a human talks to is **Nova**,
> the orchestrator (replaces the prior "Jarvis" working name, ADR-0131).

---

## 1. How an agent is defined (ADR-0135)

An agent is **three intertwining matrices joined on `agent_key`**, plus a metrics binding:

- **Personality** — the persona `.md` (the 7-section personality matrix; the domain-dir
  file that is not `room.md`). Persona = personality ONLY; it never originates rules.
- **Capabilities** — `agent.yaml` + workflow dirs + `room.yaml` (workflows · tasks ·
  skills · scope).
- **Autonomy ladder** — the hard-cap `ceiling` (in `org.yaml`, agent-level) + the
  per-workflow setting (`agent.yaml` `autonomy_rung`, ≤ ceiling).

**Authority is layered (the persona binds, never invents):** `org.yaml` owns the ceiling;
the **policy canon §5** (ADR-0134) owns the `always_gate` rules; the persona cites and may
only tighten. Every guardrail cites a policy § or the ceiling. A missing rule is fixed by
**updating policy** (only Mark + Derek) — see the two-origin gate taxonomy (policy-backed
vs [technical-limitation](../reference/technical-limitations.md), ADR-0135 §5). The
persona-file standard (7 sections + frontmatter) is `icm/CONVENTIONS.md` §Persona files.

---

## 2. The roster (27 agents)

`Agent mgr` = the C-suite agent it reports to. `Human` = the human it ultimately answers
to (may differ from its agent-manager's human — a deliberate hybrid). `Ceiling` = its
persona hard-cap on the canonical L0–L5 ladder (ADR-0128); C-suite are L2-delegate-only
(structural).

### Orchestrator
| Agent | Role | Ceiling | Human | Persona |
|---|---|---|---|---|
| **Nova** | Orchestrator | L2-delegate-only | Derek | [nova.md](../../icm/executive/orchestrator/nova.md) |

### C-suite (report to Nova; delegate-only)
| Agent | Role | Division | Human | Persona |
|---|---|---|---|---|
| **Rachel** | Chief of Staff | Internal Ops / G&A | Derek | [rachel.md](../../icm/executive/chief-of-staff/rachel.md) |
| **Dexter** | CTO | Service Delivery & Eng | Luke | [dexter.md](../../icm/executive/cto/dexter.md) |
| **Roman** | Deputy CISO | Security & Compliance | Mark | [roman.md](../../icm/executive/deputy-ciso/roman.md) |
| **Sterling** | Deputy CFO | Revenue / Client / Finance | Nick | [sterling.md](../../icm/executive/deputy-cfo/sterling.md) |
| **Jessica** | Chief Risk Officer | Platform & Assurance | Mark | [jessica.md](../../icm/executive/cro/jessica.md) |

### Domain agents (20)
| Agent | Domain | Agent mgr | Ceiling | Human | Persona |
|---|---|---|---|---|---|
| **Holly** | People / HR | Rachel | L3 | Derek | [holly.md](../../icm/domains/people/holly.md) |
| **Laurel** | Legal | Rachel | L2 | Mark | [laurel.md](../../icm/domains/legal/laurel.md) |
| **Felix** | Service | Dexter | L1 | Brandon | [felix.md](../../icm/domains/service/felix.md) |
| **Ozzie** | NOC | Dexter | L4 | Brandon | [ozzie.md](../../icm/domains/noc/ozzie.md) |
| **Sage** | Problem Mgmt (L3) | Dexter | L3 | Luke | [sage.md](../../icm/domains/problem-mgmt/sage.md) |
| **Marshall** | Change & Release | Dexter | L2 | Brandon | [marshall.md](../../icm/domains/change-release/marshall.md) |
| **Scout** | Dispatch | Dexter | L3 | Brandon | [scout.md](../../icm/domains/dispatch/scout.md) |
| **Phoenix** | Business Continuity & DR | Dexter | L3 | Brandon | [phoenix.md](../../icm/domains/bcdr/phoenix.md) |
| **Pierce** | Projects | Dexter | L2 | Anna | [pierce.md](../../icm/domains/projects/pierce.md) |
| **Cyrus** | SOC | Roman | L4 | Mark | [cyrus.md](../../icm/domains/soc/cyrus.md) |
| **Grace** | GRC | Roman | L2 | Mark | [grace.md](../../icm/domains/grc/grace.md) |
| **Osiris** | Identity & Access | Roman | L3 | Mark | [osiris.md](../../icm/domains/identity/osiris.md) |
| **Chase** | Sales | Sterling | L3 | Derek | [chase.md](../../icm/domains/sales/chase.md) |
| **Belle** | Marketing | Sterling | L3 | Derek | [belle.md](../../icm/domains/marketing/belle.md) |
| **Celeste** | Client Success | Sterling | L4 | Caity | [celeste.md](../../icm/domains/client-success/celeste.md) |
| **Vance** | Procurement | Sterling | L2 | Nick | [vance.md](../../icm/domains/procurement/vance.md) |
| **Audrey** | Finance | Sterling | L2 | Nick | [audrey.md](../../icm/domains/finance/audrey.md) |
| **Bridget** | Partnerships | Sterling | L3 | Nick | [bridget.md](../../icm/domains/partnerships/bridget.md) |
| **Vera** | Platform Governance | Jessica | L2 | Mark | [vera.md](../../icm/domains/platform/vera.md) |
| **Tess** | Service Quality | Jessica | L2 | Mark | [tess.md](../../icm/domains/service-quality/tess.md) |
| **Alivia** | Knowledge | Jessica | L3 | Mark | [alivia.md](../../icm/domains/knowledge/alivia.md) |

---

## 3. The humans (the org the agents report into)

All report to **Derek (CEO)** except Brandon (→ Luke). Employee personas live in
[`icm/employees/`](../../icm/employees/) (schema 1b — the same 7 personality sections +
decision-authority/ownership/agent-pairing/knowledge + a metrics binding).

| Human | Role | Reports to | Manages (agents) |
|---|---|---|---|
| **Derek** | CEO | — | Nova, Rachel, Holly, Chase, Belle |
| **Mark** | CISO | Derek | Roman, Jessica, Cyrus, Grace, Osiris, Laurel, Vera, Tess, Alivia |
| **Nick** | CFO | Derek | Sterling, Vance, Audrey, Bridget |
| **Luke** | Senior Systems Architect | Derek | Dexter, Sage |
| **Brandon** | Cloud Engineer | Luke | Felix, Ozzie, Marshall, Scout, Phoenix |
| **Anna** | Senior Project Manager | Derek | Pierce |
| **Caity** | Account Manager | Derek | Celeste |

Decision & commitment authority (the approver-side of every agent `always_gate`) is bound
to policy §5 classes in each employee persona (ADR-0135 §4): Derek = final / milestones /
policy edits · Mark = security/identity/risk/data-governance / policy edits / break-glass ·
Nick = money/pricing/payroll · Luke = production/destructive/change · Brandon = routine
infra · Anna = project scope · Caity = client-success commitments.

---

## 4. Governing decisions

[ADR-0135 persona schema + three-matrix model](../decision-records/ADR-0135-persona-schema-and-three-matrix-org.md) ·
[ADR-0134 policy canon (the rule SoT)](../decision-records/ADR-0134-policy-canon-architecture.md) ·
[ADR-0131 executive-suite tier](../decision-records/ADR-0131-executive-suite-tier.md) ·
[ADR-0128 canonical autonomy ladder](../decision-records/ADR-0128-canonical-agent-autonomy-ladder.md) ·
[ADR-0109 actuation dial](../decision-records/ADR-0109-actuation-autonomy-dial.md) ·
[ADR-0091 agent & ICM platform](../decision-records/ADR-0091-agent-icm-platform-consolidated.md)
(impersonation clause overridden for the internal matrix by ADR-0135) ·
[ADR-0088 self-hosted Managed Agents runtime](../decision-records/ADR-0088-icm-self-hosted-managed-agents-runtime.md).
No secrets, no client PII (ADR-0060) — these files replicate to every agent machine; the
org chart's names/roles/titles are classified public-approved.
