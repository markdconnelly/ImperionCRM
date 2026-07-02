# Workflow: grc-compliance-rollup (Deputy CISO / Security & Compliance, executive)

**Job:** on a schedule, synthesize the cross-report compliance picture — Grace's
control evidence and gaps, Cyrus's detection coverage, Osiris's access hygiene —
into one audit-readiness brief for Mark, leading with the control gaps and the
evidence debt; where an evidence/remediation follow-up is grounded, delegate it
to Grace — never actuated here. Roman briefs Mark; he never changes a control,
sets a policy, or attests compliance on Mark's behalf.

**Trigger:** scheduled (weekly / ahead of an audit window). One run per cycle.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Pull the division run-ledger + handoff signals + posture/policy rooms + tenants in scope | — |
| 02 | synthesize | Roll up control state across the three reports; rank by gap severity and evidence debt | — |
| 03 | brief | Produce Mark's audit-readiness brief + the gap list; park | **Yes** |
| 04 | delegate-followups | OPTIONAL — propose a delegate to Grace / handoff to Nova; re-gate inside the sub-agent | **Yes** |

## Autonomy

Executive ceiling is **L2 delegate-only** (CONSTITUTION §9): Roman holds no
actuation tool (gate allow-list `{pg.read, knowledge.search, memory.recall,
delegate, handoff}`), so the ceiling is structural. This workflow runs at that
ceiling — it reads, rolls up, parks the brief for Mark, and MAY emit a
**proposed** `delegate()` to Grace for a grounded evidence/control-gap follow-up
or a `handoff()` to Nova when a gap spans divisions. Control changes,
remediations, and any client-facing action are **always-gated at the sub-agent
tier** (ADR-0128) and re-gate inside the owning report's gauntlet — never
Roman's lever. Compliance attestation and policy decisions are Mark's, framed
for him. Adjacency: platform-conformance *checking* is Vera's (Platform
Governance, reports to the CRO) — this workflow rolls up the Security division's
own outputs and never re-runs her rulebooks.

## Runtime skills

None (Tier 3 empty). The job is read + synthesize + brief + route; voice and
guardrails come from the composed Roman persona, including audit-by-reference.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
