---
adr: 0136
title: "Workflow Doctrine — cross-cutting rules + archetype step-templates for all Operating Procedures"
status: accepted
date: 2026-06-29
repo: frontend
summary: "The normative doctrine that governs ALL Operating Procedures (ADR-0133) across all 26 agents — inherited, not re-decided per procedure. Eleven cross-cutting rules (universal always_gate set, L0 ship-dial, easy-button bar, evidence floor, computed notification, pool-never-bleed, one uniform dual-audience document, idempotent actuation, reversibility→derived-ceiling, obligation/action separation, value-stream spine) plus nine archetype step-templates every procedure instantiates. Extends ADR-0128/0109/0118; builds on ADR-0133/0134."
tags: [agents, workflows, autonomy, doctrine, catalog]
---

# ADR-0136: Workflow Doctrine — cross-cutting rules + archetype step-templates

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-29 |
| **Cross-references** | ADR-0133 (Operating Procedure catalog) · ADR-0134 (policy canon) · ADR-0128 (autonomy ladder) · ADR-0109 (earned autonomy) · ADR-0118 (data_class always-gate) · ADR-0081 (ProposedAction) · ADR-0096 (sale→delivery) |

## Problem

The Operating Procedure catalog (ADR-0133) enumerates ~174 procedures across 11 value streams
and 26 agents. Each procedure has an autonomy ceiling, `always_gate` flags, a notification
posture, an evidence obligation, a failure contract, a human-runbook obligation, and a
cross-client boundary. Authored procedure-by-procedure, these decisions would be **re-made (and
silently diverge) up to 174 times** — one forgotten money gate, one fabricated figure, one
client-data bleed is a production incident. The catalog needs a single normative home for the
rules that are the same everywhere, so a procedure **inherits** them and declares only what is
genuinely procedure-specific.

A second, related gap: the procedures cluster into a small number of **archetypes** (triage,
gated actuation, synthesis, audit, identity-lifecycle, money, client-send, provisioning,
deadline-watch). Without a canonical step-template per archetype, every procedure's step list is
hand-improvised, producing inconsistent gates and inconsistent quality.

## Context

Settled inputs this doctrine builds on (not re-argued here): the **L0–L5 autonomy ladder** +
dial-proof `always_gate` (ADR-0128, extends ADR-0109); the **policy canon**, dual-audience,
CS/IT/BO (ADR-0134); the **catalog** D2 value-stream-first spine, D3 sizing, D5 ICM-Workspace
realization, D8 ownership rulings, D9 (P1–P4) principles (ADR-0133); **ProposedAction**
approve-once/run-all, halt-on-fail, no auto-rollback (ADR-0081); the **data_class** always-gate
axis + RLS (ADR-0118). The decisions below were locked with Mark in two `grill-with-docs` sessions
on 2026-06-29 (doctrine, then steps-by-archetype).

## Options considered

1. **Per-procedure declaration (status quo).** Each procedure states its own gates/floors.
   Rejected: 174 divergence points; no provable consistency; the highest-risk rules (money,
   identity, client data) are exactly the ones a single omission turns into an incident.
2. **A normative Workflow Doctrine the catalog inherits (this ADR).** One home for the
   cross-cutting rules + archetype templates; procedures inherit and declare only deltas.
3. **Encode the rules only in code (the gauntlet / agent.yaml).** Rejected as the *sole* home:
   the rules must be human-trainable and policy-bound (ADR-0134), not only machine-enforced; the
   doctrine is the dual-audience source the gauntlet config derives from.

### Tradeoffs

Inheriting from a doctrine raises the build bar (every gated step must meet the 4-part
easy-button bar; every assertion must cite a source) and centralizes a change surface (editing
the doctrine moves 174 procedures at once). We accept both: the bar is the point (P3), and a
single audited change surface is safer than 174 drifting copies.

## Decision

Adopt the **Workflow Doctrine**: eleven cross-cutting rules (§A) every Operating Procedure
inherits, and nine archetype step-templates (§B) every procedure instantiates. The stream files
(ADR-0133) **stop restating** D9/`always_gate`/evidence rules and inherit them from here; a
procedure's entry declares only its procedure-specific deltas. The canonical terms enter
`CONTEXT.md`; the policy bindings remain the `Driving policy` field (D4, #1586).

### §A — The eleven cross-cutting rules

**A1 — Value-stream spine (extend, don't fork).** The 11 value streams remain the closed set of
"what the MSP does." Scale-up depth (GTM/RevOps, enterprise risk/strategy) **extends** streams
02/09/10/11 via section headers — it does **not** create new streams 12/13. Procedures project
onto their one owning agent (D2); the agent tree is a derived view.

**A2 — Universal `always_gate` set.** Six action classes are dial-proof at every level, for every
agent, inherited by every procedure (a procedure declares only *additional* gates):
1. **Money out** — payment, payout, spend commit, refund, credit memo, discount/term commitment.
2. **External client-facing send/commitment** — send/quote/contract/SLA/roadmap/pricing commitment.
3. **Identity/JML destructive** — disable*/delete/privilege-grant/MFA-reset/license-deprovision
   (*see A10: account *disable* is reversible and is the named exception).
4. **Production-destructive** — irreversible infra/data change with no clean undo.
5. **Security containment** impacting a client's operations.
6. **Binding commitment / legal** — sign/bind an agreement, partner deal, vendor order.

Plus the ADR-0118 always-gate `data_class`es (inherited, not restated). "No clean undo ⇒
`always_gate`" (A10) is *why* these are gated — they are the irreversible row of the reversibility
table.

**A3 — Ship-dial = L0.** Every procedure is **built capability-complete** to its agent's ceiling,
but its autonomy **dial ships at L0 (observe-only)**. Autonomy is earned per-workflow upward
(L0→L1 propose→…), admin-only, audited, reversible (ADR-0109/0121). The dial only ever raises the
floor between L0 and the ceiling; it **never** touches an `always_gate` step.

**A4 — Easy-button bar (the definition of "done" for a gated step).** A human gate satisfies the
bar IFF it presents all four: (1) the **drafted artifact, complete**; (2) the **grounded why** —
evidence + as-of date + driving policy (A5); (3) the **one-click commit** (approve-once/run-all,
ADR-0081) **+ its one-click inverse** where reversible; (4) the **consequence preview** ($ amount
+ irreversibility flag for money/legal). A step that cannot present all four is **not ready past
L0** and stays draft-only. The *exact* easy-button is concretized per-procedure when it is
policied/realized; the bar is the conformance contract.

**A5 — Evidence floor (cite-or-abstain).** (a) Every factual assertion an agent puts in a
draft/recommendation/work-note carries its **source reference + as-of date** (OKF entity/room, DB
row, policy doc, external SoR) — no claim without provenance, no exemption. (b) On **empty
retrieval the agent parks or delegates, never fabricates** (refusal-class, enforced by the eval
goldens, #1538). (c) **Staleness honesty:** when the freshest source is dormant (e.g. #389
semantic recall down, a collector unhydrated) the agent says so rather than presenting dormant
data as live.

**A6 — Notification routing.** Urgency is **computed, not hand-set**: an event is **urgent** IFF
(a) an `always_gate` action is blocking a clock (SLA breach imminent, cancellation window closing,
containment pending), (b) a security/availability incident (sev-high), or (c) a money/legal
deadline inside its grace window — else it is a Teams tag (D9-P4). When the paired human is absent
(no response within the urgency window), escalation **walks up the `icm/org.yaml` `reports_to`
chain** (paired human → division exec's human → **Nova's single-human gatekeeper queue** as the
terminal backstop). Never dropped, never auto-actuated past the gate.

**A7 — Pool, never bleed.** An agent **may cross-correlate signals across the whole client pool
internally** to improve a recommendation (a threat at client A checked against B; a vendor EOL
across clients; service patterns across the base) — a core advantage of one platform. It may
**never** let one client's identifiable data/identity/specifics surface in another client's
context (draft, reply, report, QBR, benchmark); external cross-client insight is delivered
**only anonymized/aggregated** ("peers in your size band average X"), enforced structurally by
`data_class`/RLS (ADR-0118), not agent discretion. Refusal-class. The same rule applies on the
**partner** axis (one partner's data never crosses into another's).

**A8 — One uniform dual-audience document.** A realized procedure has **one** canonical document,
readable and usable by **both** a human (training) and an agent (execution) — mirroring the
policy-canon dual-audience model (ADR-0134). This **revises ADR-0133 D5**: there is no separate
human-runbook + agent-prose. The **prose is single-sourced** in the uniform document; the ICM
Workspace's **machine config** (`agent.yaml`/`room.yaml`/stage I/O) remains the execution/config
SoR that the document's steps bind to. A fully-human procedure lives natively as
`docs/runbooks/<stream>/<proc>.md` until it graduates. The exact document↔workspace mechanics are
a build-wave design (#1616); the IT Glue back-sync path is open (#1615). Dogfood: `subject =
client | imperion` is a parameter, never a duplicate; one document trains both.

**A9 — Idempotent actuation.** (a) The **external SoR is authoritative; the agent mirrors, never
owns** (Autotask=tickets/contracts, QBO=money, Pax8=licensing, M365=identity, DocuSign=signatures)
— it moves SoR-owned state only through that system's API. (b) Every actuating write carries a
**deterministic idempotency key** (procedure + entity + intent + period) so a retry/replay is a
**no-op with an audit note**, never a double-send/charge/order (the write-side complement to the
gauntlet's Refuse-on-replay). (c) **Reconcile, don't assume:** the agent **reads back** from the
SoR to confirm the state landed before declaring the step done (close-on-verification, never
close-on-fire).

**A10 — Reversibility → undo obligation → derived ceiling.** Reversibility is the single knob that
sets both a step's undo obligation and its maximum auto-ceiling:

| Reversibility | Undo obligation | Max auto-ceiling (dial-proof) |
|---|---|---|
| Internally reversible (silver flag / internal state) | none | **L2** |
| Externally reversible, clean undo (unpublish, reassign, cancel-before-send, account disable) | declare undo **+ undo window** | **L4** |
| Externally reversible but costly/visible (client saw it; money moved then refunded) | declare undo **+ notify** | **L3** (never silent) |
| No clean undo (money settled, identity deleted, contract bound, prod data destroyed) | none possible → `always_gate` | **never auto — gated forever** |

A procedure's ceiling is **derived from its most-irreversible step**, not hand-set. **Failure
contract:** a failed step **halts** the ProposedAction; **no auto-rollback**; the partial state is
left as-is and surfaced to the gate with a completed-vs-pending breakdown; a human decides
remediation; the agent never improvises a compensating action.

**A11 — Obligation/action separation.** The agent that owns a **clock, commitment, or standard**
is distinct from the agent (or step) that performs the mechanical act it governs (SLA adherence =
Celeste vs assignment = Felix/Scout; the Client Security Standard = Vera vs measurement = Cyrus vs
remediation = human/Datto; the transaction/close = Chase vs the relationship = Celeste; the
deadline = Vance's sentinel vs the actuation = human). They meet at an **explicit Procedure Step
(the seam)**, never co-own — one owner per unit, coverage provable (D3). The obligation-owner sets
urgency (A6).

### §B — Archetype step-templates

Every procedure instantiates one of nine archetype templates. Each template already inherits §A
(evidence floor on every ground step; ceiling derived from the most-irreversible step; easy-button
at every gate; P2 thought-attribution on log steps; close-on-verification on actuating steps).
The per-archetype **resolving rule** is what each procedure must honor.

**B1 — Triage / Route** (Felix triage, Belle inbox, Nova intake, Cyrus/Ozzie alert-triage,
Marshall change-intake). Steps: Ground → Classify → Resolve-owner → Disposition → Log.
**Rule:** mechanical **routing auto-executes at L2** (assignment is internally reversible); two
carve-outs gate regardless of dial — (a) **Escalate** of a high-risk symptom (identity/backup/DC)
emits a proposal that *parks*; (b) cross-client correlation in classification is internal-only (A7).

**B2 — Gated-actuation** (Felix governed-remediation, Phoenix recovery, Cyrus containment,
Marshall→executor). Steps: Ground → Plan (assemble ProposedAction) → **GATE** → Actuate
(plan_seq, halt-on-fail) → Reconcile → Log. **Rule:** on partial failure, the resume contract is
**re-run the whole bundle from the top on one re-approval** — completed steps no-op via their
idempotency key (A9), the failed step retries, downstream proceeds. No resume-from-N bookkeeping.

**B3 — Synthesis-brief** (the 5 C-suite tracers; Celeste QBR/account-plan; BI reports) —
delegate-only, L2, **no actuation**. Steps: Gather (cross-division, cite) → Synthesize (anonymize
cross-client, flag dormancy) → Narrate (P2) → Deliver (A6) → Log. **Rule:** the brief is a
**launchpad, not a readout** — an actionable item **auto-spawns the owning worker procedure in a
parked/draft state** (attributed, easy-button-ready) for one-click launch from inside the brief;
the C-suite agent never actuates (it delegates down by pre-staging the worker's gated procedure).

**B4 — Audit-attest** (Grace control-evidence + attestation, Tess quality-audit, Vera
conformance, Phoenix backup-verify, SOC2/security-questionnaire). Steps: Scope (cite standard
version) → Collect-evidence → Evaluate → Compose → Route-gaps → Sign-off (conditional).
**Rule:** split measurement from assertion by **audience** — **internal** audit/finding
(measure+route) auto-runs at L2; an **external-facing attestation** (auditor, regulator, SOC2/CMMC
package, **client security questionnaire**) is `always_gate`, human-signed, with the full
evidence-backed package pre-staged.

**B5 — JML (Joiner-Mover-Leaver)** (Osiris). Steps: Ground (cite HR/M365) → Compute-delta vs
role template → Plan → **GATE (scoped)** → Actuate (idempotent, read-back) → Log+notify.
**Rule:** split on **disable ≠ delete** — Leaver **auto-disable + session/token revoke at L4**
(disabling is reversible → fast termination containment without a gate) while
**delete/deprovision/license-removal (irreversible) stays `always_gate`** as the human-approved
cleanup; **Joiner grants gate** (privilege grant is class-3, over-grant prevention > speed); a
Mover is the net delta of both.

**B6 — Money-gate** (Vance procurement, Audrey AR/AP, Bridget MDF/referral,
rev-rec/commissions/recurring-invoice/payroll). Money out is `always_gate` class-1 forever. Steps:
Ground → Compute → Draft → **MONEY GATE** (exact $, SoR, irreversibility) → Actuate (idempotent,
reconcile) → Log+mirror. **Rule (batch):** **approve-once for the steady-state, per-item gate for
exceptions** — the batch is one easy-button (total-$ + count + diff/exception view); one approval
runs items **within tolerance** vs the prior period; any item tripping a variance guard (new
recipient, >X% change, first-time amount) **splits out and gates individually**. The variance
threshold is per-procedure policy.

**B7 — Client-facing-send** (Chase quote/renewal, Belle reply/post/DM, Celeste proactive updates,
Felix client reply, campaign send). Steps: Ground → Compose (no fabricated capability/timeline/
price; opt-out + frequency hard stops) → **SEND GATE** → Send (idempotent) → Log+back-sync.
**Rule:** client-facing send is `always_gate` class-2 **except** a tightly-bounded
**transactional-acknowledgement** sub-class that may reach **L3** (execute-then-notify) IFF all
four hold — (a) templated, zero free-form agent claims; (b) non-committal (no price/timeline/
capability/commitment); (c) deterministic trigger (ticket-created → "we got it", appointment
confirmed); (d) respects opt-out/frequency. Everything communicative or committal (free-text
reply, quote/renewal, 1:1 customer DM, net-new outreach) stays `always_gate`.

**B8 — Provision-with-undo** (Pierce kickoff/provision-from-won, Easy Mode, M365 tenant
provisioning). Steps: Ground (**`contract_state='signed'` = refuse-precondition**, not a waivable
gate) → Scaffold-select (catalog-anchored, #1306) → Plan → Provision (L4, behind an undo window,
idempotent, close-on-verification) → Emit-tasks+Log. **Rule:** the undo window is a per-procedure
policy duration; the **reversible scaffold** tears down cleanly during it and **hardens at
expiry** (later teardown is a new gated change/offboard); **irreversible or client-visible
sub-steps peel off to their own gates** (welcome-email → client-send, setup-fee → money,
delete-prior-data → `always_gate`).

**B9 — Deadline-sentinel** (Vance renewal/cancel sentinel, contract-renewal radar,
breach-notification clock, cert-expiry, SLA clocks, freeze-calendar, business-insurance/EOL).
Watches a clock; **never actuates** (A11). Steps: Watch (cadence, cite dates) → Detect → Quantify
($/risk) → Draft-rec → Route (parked, easy-button) + notify (A6). **Rule:**
**escalate-to-terminal, never auto-actuate, log the miss** — alert at policy-set lead times
(T-30/T-7/T-1); escalate up `reports_to` with rising urgency → Nova's gatekeeper queue; **never**
auto-actuate renew/cancel/buy even under deadline pressure (a missed deadline does not license an
autonomous commitment); make the inaction consequence explicit and keep the easy-button pre-staged
at every level; a passed deadline is a **logged escalation failure** surfaced in the owning
C-suite synthesis-brief.

## Consequences

The stream files (ADR-0133) are edited in the deepen wave to inherit (and stop restating) §A;
each procedure's steps are conformed to its §B template; the 38 gap-fill procedures and the
Partnerships agent (Bridget) are authored against this doctrine from the start. CONTEXT.md gains
seven terms and the "Operating Procedure" D5 wording is revised (A8). The eval goldens (#1538)
already encode A5; conformance checks for A2/A3/A10 are a follow-on.

### Security impact

Strongly positive. The universal `always_gate` set (A2), the reversibility ceiling (A10), the
identity disable≠delete split (B5), the pool-never-bleed boundary (A7), and the evidence floor
(A5) are the highest-leverage safety rules in the system, now inherited rather than per-procedure
optional. The L0 ship-dial (A3) means no procedure auto-acts on day one. Risk introduced: a single
doctrine edit moves all procedures — mitigated by ADR review + the audited change surface.

### Cost impact

Minimal direct cost (docs). Indirect: the easy-button bar (A4) and read-back reconciliation (A9)
add agent work per gated/actuating step (more tokens, an extra SoR round-trip) — accepted as the
price of "prep-to-one-click" and no silent failed actuations.

### Operational impact

Procedures become consistent and human-trainable from one source (A8). The deepen wave and the
per-procedure `icm/` build (#1534) author against fixed templates instead of improvising. Dormancy
(A5c) is surfaced honestly: deepened procedures still ship propose-only until their substrate
hydrates (#389/#991/#119).

## Future considerations

Conformance automation for A2/A3/A10 (gate the catalog the way `icm-conformance` gates manifests);
the document↔workspace mechanics (#1616) and IT Glue back-sync (#1615); per-procedure policy
constants (money variance thresholds, undo-window durations) as the procedures are policied
against the canon (#1586); whether the transactional-ack carve-out (B7) ever widens once trust is
established.
