# Autonomy — the tiered dial

How much an agent may do on its own is **earned by track record and expressed as
data** — never hard-coded, never a prompt instruction. This guide covers the one
autonomy dial (`autopilot_policies`), the L0→L3 rungs, the T0–T3 action policy
they enforce, and the single human gate.

[← The AI suite](README.md) · Governing decision:
[ADR-0091](../decision-records/ADR-0091-agent-icm-platform-consolidated.md) (from
ADR-0055 the four-tier policy · ADR-0087 the one dial · ADR-0061 the ICM
draft→auto ramp).

---

## 1. The principle: autonomy is a mechanical control

Two rules make this safe rather than aspirational:

- **It lives in data.** Every tier reads its rung from **`autopilot_policies`**, so
  *gating an action, or ramping it after testing, is a data change, not a code
  change* (ADR-0087). This unifies the ICM draft→auto ramp (ADR-0061) with the
  coding-plane standing-OKs (system [CLAUDE.md §10.4](../../CLAUDE.md)).
- **It is enforced by the grant table.** The `agent_tool_grant` table (migration
  0056) is the enforcement point: every tool a sub-agent can invoke carries a tier
  in its grant `scope`, and the backend tool-use loop **refuses calls above the
  grant** (ADR-0055). A prompt that *says* "don't send" is not the control — the
  refused grant is.

---

## 2. The one dial: L0 → L3 → 🔒 (ADR-0087)

One dial spans both planes (the ICM product runtime and the coding plane):

```mermaid
flowchart LR
    L0["L0 · Observe<br/>read-only"] --> L1["L1 · Draft<br/>propose, hold for human"] --> L2["L2 · Act-gated<br/>idempotent write"] --> L3["L3 · Auto<br/>autonomous"]
    L3 -. "customer-facing · money · prod-migration · deploy · X.0.0" .-> GATE["🔒 Mark gate<br/>(one human queue)"]
    classDef rung fill:#111621,stroke:#5B8DEF,color:#E6EAF2
    classDef gate fill:#2a1414,stroke:#E2615A,color:#E6EAF2
    class L0,L1,L2,L3 rung
    class GATE gate
```

| Rung | Meaning |
|---|---|
| **L0 · Observe** | read-only — analyze, search, summarize |
| **L1 · Draft** | propose an action, **hold for a human** |
| **L2 · Act-gated** | perform an idempotent write within scope |
| **L3 · Auto** | act autonomously within the declared self-approve scope |
| **🔒 Mark gate** | regardless of rung, customer-facing actions · money · prod-migration · deploy · `X.0.0` route to **one human queue** |

An ICM workflow declares its rung in `agent.yaml` (`autonomy_rung` +
`auto_may_self_approve` — see [agent-yaml-schema.md](agent-yaml-schema.md)). The
sales `lead-response` workflow is **L1**: it drafts, but every customer-facing
send still parks until the workflow is admin-flipped to `auto`, and even then only
within its narrow self-approve clause.

---

## 3. The action policy the rungs enforce (ADR-0055)

The four-tier action policy applies to **every agent capability across all four
repos** — it is what the rungs map onto:

| Tier | Scope | Policy |
|---|---|---|
| **T0** | Read / analyze / search / summarize | Always autonomous. |
| **T1** | Internal, reversible writes (draft tasks, enrichment facts, AI-labeled notes, knowledge syncs) | Autonomous + audited, with undo. AI-authored rows are labeled as such. |
| **T2** | Client-visible actions (email, SMS, proposals — anything a client could see) | **Propose-only by default, forever.** From v3, an *individual workflow step* may be whitelisted for autonomy **only** after running in propose mode with a sustained near-100% human-approval streak (threshold recorded on the grant). Whitelisting is **per-step, never per-channel.** |
| **T3** | Irreversible / financial / permissions / production-data mutations | **Human-only.** Agents may recommend; they never hold an executing tool grant. |

> **T2 whitelisting is proposed for v3.** The ADR is accepted in v1; grant
> *enforcement* is wired by v3. Until then, treat every client-visible action as
> propose-only.

---

## 4. The draft → auto ramp (ICM)

Every ICM workflow **starts in `draft`** — every checkpoint requires a human.
Flipping a trusted workflow to `auto` is:

- **per-workflow** (never per-channel, never global),
- **admin-only** in the GUI,
- **audited**, and
- **reversible.**

In `auto`, checkpoints self-approve **only within the workflow's
`auto_may_self_approve` clause** — anything unstated parks for a human. A `tiered`
mode (auto for low-risk, approval for substantive) is *anticipated* but needs its
own ADR defining the boundaries before it exists (ADR-0061).

```mermaid
stateDiagram-v2
    [*] --> draft
    draft --> auto: admin flip (audited, reversible)
    auto --> draft: admin flip back / on incident
    note right of draft
        every checkpoint = human approval
    end note
    note right of auto
        self-approve ONLY within
        auto_may_self_approve scope;
        everything else still parks
    end note
```

---

## 5. The single human queue (the gate)

The **Gatekeeper** role routes every Mark-gated call to **one human queue**
([orchestration-matrix.md](orchestration-matrix.md)). The gate is rung-independent
— an L3 worker still hits it for anything customer-facing, money, prod-migration,
deploy, or an `X.0.0` declare (ICM Constitution §5.4). This is the real ceiling on
the whole system: many isolated sessions, one human reviewer (system
[CLAUDE.md §10.4](../../CLAUDE.md)).

---

## 6. How this shows up across the suite

- **Sub-agents** — the Sales/Outreach agent is T2 (propose-only); the Reporting
  agent is T0 (read-only). See [agent-platform.md](agent-platform.md).
- **ICM workflows** — the dial per workflow; sends always exit via ADR-0058.
- **The Board** — personas are tool-less (T0 by construction); recommendations are
  advisory, ratified/overruled by the human CISO. See
  [board-of-directors.md](board-of-directors.md).
- **Observe/Govern roles** — the Policy/guardrail role *enforces* rungs; the
  Gatekeeper routes the gated queue. See
  [orchestration-matrix.md](orchestration-matrix.md).

The thread through all of it: **autonomy is data + grants, the human gate is
single, and sends are always approval-gated.**
