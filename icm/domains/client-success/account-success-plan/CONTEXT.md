# Workflow: account-success-plan (client-success v1)

**Job:** assemble and maintain a client's **Account Success Plan** — the living,
internal account-management artifact that states where the relationship is going:
goals, the health picture, the strategic initiatives, the open risks, and the next
actions (each owned, each dated). It is the standing companion to the per-handoff
[`client-360`](../client-360/CONTEXT.md) aggregation — the 360 reacts to a single
signal; the success plan is the durable plan the signals roll into.

**Trigger:** a CS cadence (quarterly refresh) or an on-demand request from a human
("build/refresh the success plan for ACME"). One run per account per refresh.

**What this is NOT:** no commitment, no client-facing send, no remediation. The plan
is an internal artifact + parked recommendations; a human owns every commitment in it
(roadmap · SLA · pricing · spend · security-remediation). NO-COMMITS-EVER and
MSSP-advisory-only are dial-proof (celeste.md guardrails 1–2). The plan is not a QBR
deck (that is [`qbr-prep`](../qbr-prep/CONTEXT.md)) and not a churn-save outreach (that
parks for a human).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather-context | Read the whole account: relationship, transactions, engagement, service, QBR substrate | — |
| 02 | assess-trajectory | Health/risk + where the relationship is heading (signal vs inference) | — |
| 03 | draft-plan | Assemble the plan: goals · initiatives · risks · next actions (owner · due) | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal plan **assembly** and health/trajectory compute auto-execute
(reversible, signal-labeled). **Every** recommendation, binding commitment
(roadmap/SLA/pricing/spend/security-remediation), and client-facing touch in the plan
parks for a human in every mode — the NO-COMMITS-EVER ceiling is dial-proof (celeste.md).
Strict client-confidential boundary: one client's plan never enters another's context.

## Persistence (#1688 — workspace-as-SoR, A8)

The Account Success Plan is a **living, versioned document**: the **ICM Workspace IS its
source of record** (ADR-0136 A8 — the one uniform dual-audience document, not a tabular
silver entity). The plan must persist, version, and be referenced across QBRs (08-C reads
it; 08-L feeds it) — it is no longer an ephemeral run-row. The **persist · version ·
attest-preserve write path is backend-owed** (the doc executor — approval-gated, never a
direct silver write; the cross-repo twin). **Persistence ≠ commitment:** every binding line
inside the plan (roadmap/SLA/pricing/spend/remediation) still routes to a human
(NO-COMMITS-EVER, dial-proof). Graduates 08-B from procedure-only → realized (the workspace
is the SoR), dormant on the backend doc executor.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `success-plan-rubric.md` (the plan structure +
the goal-quality / initiative-prioritization discipline + the signal-vs-inference rule).
Mark-editable; stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
