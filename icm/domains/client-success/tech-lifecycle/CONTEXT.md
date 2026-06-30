# Workflow: tech-lifecycle (client-success v1)

**Job:** Celeste's **technology lifecycle / refresh planning (vCIO)** advisory — review a
client's technology estate, identify end-of-life (EOL) / aging / at-risk assets, and draft
a **prioritized refresh plan**. This is a vCIO advisory artifact: recommendations only. The
refresh plan and any spend/budget within it park for a human — Celeste advises, a human
decides and commits.

**Trigger:** a `relationship.lifecycle.*` cue for an active client — a periodic vCIO/QBR
prep cadence, an approaching renewal where estate age matters, or a Felix/service signal
flagging an asset pattern (recurring incidents on aging hardware, an EOL warning). One run
per client lifecycle review.

**Asset/CMDB facts are a direct read (#1689).** The CMDB substrate (`cloud_asset` / `device`)
is read-only in client-success's `okf_rooms`; **Felix/Service owns the CMDB as system of
record** and Celeste reads it read-only — never writing or correcting a CI. So this workflow
grounds the estate by reading `cloud_asset`/`device` directly (resolved over the handoff-fed
option so 08-I runs before the #991 bus). A Felix/service handoff may still supply an estate
picture when one is pushed, but the read no longer depends on it; if the CMDB holds no CIs for
the client, the workflow states "estate unknown" and parks rather than fabricating one.

**What this is NOT:** no commitment, no client-facing send, no procurement, no remediation.
The plan is a parked recommendation; a human acts. NO-COMMITS-EVER and MSSP/vCISO
advisory-only are dial-proof (celeste.md guardrails 1–2). Security-posture findings stay
advisory (the MSSP boundary) — remediation is human / Datto.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | estate-context | Read the account + service history + strategic record + the `cloud_asset`/`device` CMDB directly | — |
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
