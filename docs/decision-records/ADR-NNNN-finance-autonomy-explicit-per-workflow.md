---
adr: NNNN
title: "Finance autonomy — explicit per-workflow, QBO-gated, no ladder inheritance"
status: proposed
date: 2026-06-29
repo: frontend
summary: "Finance is the one agent domain that does NOT inherit the canonical autonomy ladder (ADR-0128 D5). The permanent wall is QBO/money — no agent ever writes QuickBooks Online or moves money (financial-class = always_gate, ADR-0118 D5, dial-proof). Around that wall, each finance workflow defines its autonomy + human-in-the-loop gates EXPLICITLY in its own agent.yaml/CONTEXT: the human owns every finance decision (e.g. the admin-approve click), the agent automates everything else (prep, post-decision execution, reconciliation, internal reminders); nothing finance executes is gated on the global dial. Every finance workflow — including the read-only ones — carries an explicit declaration. Sharpens ADR-0123's blanket 'finance read-only' (the invariant is no MONEY action, not no action) and carves finance out of ADR-0128 D5's universal mapping."
tags: [finance, agents, governance]
---

# ADR-NNNN: Finance autonomy — explicit per-workflow, QBO-gated, no ladder inheritance

| Field | Value |
|---|---|
| **Repo** | frontend (owns the ICM factory + `agent.yaml` schema, ADR-0042) |
| **Status** | Proposed |
| **Date** | 2026-06-29 |
| **Issue** | #1740 (epic #1739 — Audrey write+notify expansion) |
| **Amends** | [ADR-0123](./ADR-0123-agent-first-build-doctrine.md) (finance-read-only clause → sharpened), [ADR-0128](./ADR-0128-canonical-agent-autonomy-ladder.md) D5 (universal ladder mapping → explicit finance exception) |
| **Cross-references** | [ADR-0118](./ADR-0118-data-class-third-rls-axis-action-ceiling.md) D5 (`financial` = always_gate), [ADR-0109](./ADR-0109-actuation-autonomy-dial.md) (per-workflow actuation dial), [ADR-0061](./ADR-0061-icm-business-process-automation.md) (ICM draft→auto), [ADR-0136](./ADR-0136-workflow-doctrine.md) (workflow archetypes / autonomy rows) |

> Number claimed at MERGE per system CLAUDE.md §10.3 / [ADR-0084](./ADR-0084-merge-time-number-assignment.md).
> `NNNN` is a placeholder — the branch that merges second renumbers to the next free slot and
> fixes every reference. Docs-only ADR; claims no migration number.

## Problem

Audrey (Finance) is `pg.read`-only. Three asks under epic #1739 — execute time/expense
**approvals**, and surface internal employee **reminders** — require her to gain actions. The
naive path maps her onto the canonical autonomy ladder (ADR-0128 D5: "every agent maps onto the
same ladder") at **L2 — auto-internal**, which would let the **global dial** auto-execute finance
writes. That over-rotates two ways:

1. It routes finance autonomy through a generic dial Mark does not want finance subject to —
   "finance does not automatically inherit the global ladder config."
2. ADR-0123 *also* states a blanket **"Finance is READ-ONLY,"** which contradicts giving Audrey
   any write at all.

Those two ADR-0123 sentences are themselves in tension: the headline says "read-only," but the
*justification* says "no **money-moving** agent / QBO is the system of record for **actions**."
Our whole epic lives in that gap. This ADR settles what finance autonomy actually is.

## Context

- **ADR-0123** (proposed): "Finance is READ-ONLY in Imperion. QBO is the system of record for
  finance **actions**. There is no money-moving agent — Audrey reads and proposes." The headline
  over-claims; the justification ("no *money-moving* agent") is the real containment fact.
- **ADR-0118 D5** (the enforced money firewall): `data_class = financial` actions are
  **`always_gate`** — dial-proof, never auto-execute at any level, regardless of track record.
- **ADR-0128** (accepted): the canonical L0–L5 ladder; D1 defines **L2 — auto-internal** as
  "internal, REVERSIBLE writes"; **D5** asserts "every agent maps onto the same ladder" and names
  Audrey among them.
- **The stream-09 catalog already anticipates the writes.** `09-03` (the post-approval Autotask
  attestation-artifact write) is specced "Autonomy ceiling **L2** … reversible," parked at the
  backend-executor seam and explicitly **"NOT Audrey's read-only catalog (A11 seam)."** Someone
  already classed the write as executor work held out of the catalog by the read-only invariant.
- **The actual human work today:** an admin approves a timesheet / expense report through a
  friction-removing GUI; the state transition, the idempotent Autotask write, and reconciliation
  are the mechanical follow-on to that human decision.

## Options considered

1. **Map Audrey onto the canonical ladder at L2** (the generic ADR-0128 D5 template, as Chase).
2. **Keep finance strictly read-only** (the literal ADR-0123 headline).
3. **Finance autonomy is explicit per-workflow, QBO-gated, no ladder inheritance** (chosen).

### Tradeoffs

| Option | Pro | Con |
|---|---|---|
| 1 Ladder map | uniform with the other agents; least work | the **global dial could auto-execute finance writes** — an ungoverned blast radius Mark explicitly rejects. |
| 2 Strictly read-only | simplest; no new capability | **bars the desired automation** (the whole ask) and is internally inconsistent with ADR-0123's own "no *money-moving*" justification. |
| 3 Explicit per-workflow (chosen) | finance never inherits dial behavior; each workflow's autonomy is an explicit, auditable contract; the money firewall (`financial` = always_gate) is **untouched** — we weaken nothing | more per-workflow declaration work (every finance workflow, including read-only, declares its stance) — accepted: "explicit" only holds if it holds everywhere. |

## Decision

### D1 — The wall is QBO/money; permanent `always_gate`
No agent ever writes QuickBooks Online or moves money. QBO is the read-only money
system-of-record, permanently; `financial`-class actions stay **`always_gate`** (ADR-0118 D5),
dial-proof. This **sharpens** ADR-0123's blanket "finance read-only": the invariant is **no money
action**, not **no action**.

### D2 — Finance does not inherit the canonical ladder
ADR-0128 D5's "every agent maps onto the same ladder" gains an explicit **finance exception**.
Raising the global autonomy dial **never** promotes a finance write — finance autonomy is not
dial-derived.

### D3 — Each finance workflow defines its autonomy + HITL gates explicitly
The per-workflow `agent.yaml` / `CONTEXT.md` is the authority for *what executes* and *where the
human-in-the-loop gate sits*. There is **no finance-wide auto-execution default**. The human owns
every finance **decision** (e.g. the admin-approve click); Audrey automates everything else up to
the QBO wall — prep, post-decision mechanical execution, reconciliation, internal reminders. A
write executing as the **deterministic consequence of a human decision** is *not* dial autonomy
and is permitted; **nothing finance executes is gated on a dial level**.

### D4 — Every finance workflow carries an explicit autonomy declaration
Including the read-only workflows, each of which gets an explicit `actions: none — read-only`
stanza. "Explicit" must hold **domain-wide** so *read-only-by-choice* is distinguishable from
*autonomy-not-yet-specified*, and the QBO/`always_gate` wall is auditable workflow-by-workflow.

## Consequences

This is the finance-domain autonomy contract. ADR-0123's finance clause and ADR-0128 D5 each gain
an "amended by" note pointing here. Audrey's persona (`audrey.md`) ceiling rationale changes from
"no action at all" to "QBO/money `always_gate` + explicit per-workflow autonomy." The capability
and workflow work — `time.write` / time-approval (#1741), `expense.write` / expense-approval
(#1742), `notify.internal` / attestation-reminder (#1743), and the all-workflow
explicit-declaration sweep (#1744) — lands under epic #1739.

### Security impact

The enforced money firewall is **unchanged and clarified**: `financial`-class actions stay
dial-proof `always_gate` (ADR-0118 D5) and finance gains **no** dial-promotable path. Every
finance write is downstream of an **explicit human decision** and is internal/reversible up to the
QBO wall; no agent writes QBO or moves money. Per-workflow explicit declarations make the
containment auditable workflow-by-workflow rather than resting on a single blanket sentence.
**Never commit secrets** — class names and role slugs only; no pay rates or client PII in any
finance contract.

### Cost impact

Negligible. Per-workflow declaration is documentation; no new runtime services, no model calls.

### Operational impact

Every finance workflow declares its autonomy explicitly — 3 new HITL contracts plus the 8
read-only stanzas. Nothing actuates until the backend delegate/handoff + action executor
(#695 / #1666) and the actuation dial (#990) are live; the factory artifacts are
**factory-complete + dormant** meanwhile (the epic #1394 posture).

## Future considerations

As more finance processes gain automatable mechanics (e.g. recurring-invoice precheck), each gets
its **own** explicit per-workflow autonomy contract — never a blanket finance default, never
ladder inheritance. The money/QBO wall is permanent; relaxing it would require a new ADR that
supersedes D1.
