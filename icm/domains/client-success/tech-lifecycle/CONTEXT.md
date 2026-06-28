# Workflow: tech-lifecycle (client-success v1)

**Job:** Celeste's **technology lifecycle / refresh planning (vCIO)** advisory — review a
client's technology estate, identify end-of-life (EOL) / aging / at-risk assets, and draft
a **prioritized refresh plan**. This is a vCIO advisory artifact: recommendations only. The
refresh plan and any spend/budget within it park for a human — Celeste advises, a human
decides and commits.

**Trigger:** a `relationship.lifecycle.*` cue for an active client — a periodic vCIO/QBR
prep cadence, an approaching renewal where estate age matters, or a Felix/service handoff
flagging an asset pattern (recurring incidents on aging hardware, an EOL warning). One run
per client lifecycle review.

**Asset/CMDB facts arrive as a handoff, not a direct read.** The CMDB substrate
(`device` / `cloud_asset`) exists, but those rooms are **not** in the client-success
`okf_rooms`. So this workflow treats asset/lifecycle facts as **service-domain / Felix
handoff context** folded into the account picture — never a direct CMDB device/cloud-asset
read. The estate is read through the relationship rooms Celeste owns plus
the handoff payload; the workflow states what it has and parks if the asset picture is
absent rather than fabricating one.

**What this is NOT:** no commitment, no client-facing send, no procurement, no remediation.
The plan is a parked recommendation; a human acts. NO-COMMITS-EVER and MSSP/vCISO
advisory-only are dial-proof (celeste.md guardrails 1–2). Security-posture findings stay
advisory (the MSSP boundary) — remediation is human / Datto.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | estate-context | Read the account + service history + strategic record; fold the asset/CMDB facts that arrive as service/Felix handoff context | — |
| 02 | assess-lifecycle | Identify EOL / aging / at-risk assets; label measured signal vs inference | — |
| 03 | draft-refresh-plan | Draft the prioritized refresh plan; spend/budget parks as a recommendation | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2**, the internal lifecycle assessment and the refresh-plan **draft** auto-execute
(reversible, signal-labeled). **The plan itself parks** — every refresh recommendation, any
spend / refresh-budget, any roadmap or SLA implication, and every client-facing touch parks
for a human in every mode. The NO-COMMITS-EVER and MSSP/vCISO advisory-only ceilings are
dial-proof (celeste.md) — no rung crosses them. Strict client-confidential boundary: one
client's estate never enters another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `lifecycle-rubric.md` (how to read asset lifecycle /
EOL, prioritize refreshes by client-risk × business value, the signal-vs-inference
discipline, and the vCIO advisory framing). Mark-editable; stages cite, never restate.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
