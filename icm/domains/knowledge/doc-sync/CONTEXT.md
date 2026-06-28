# Workflow: doc-sync (knowledge v1)

**Job:** keep IT Glue (the documentation SoR) accurate — detect stale,
contradictory, or missing docs against the real CI, draft/update them, and propose
a diff. Lexicon drafts and proposes; the publish is gated until trusted.

**Trigger:** the scheduled documentation poll (the cadence sweep), or a change
event on a CI (`device` / `cloud_asset` / `account`) or an L3 fix landing (e.g.
Sage resolves a ticket → author the runbook). One run per doc-unit in scope.

**Posture:** read + draft. Lexicon reads the CI surface (`account` / `device` /
`cloud_asset`) and the existing docs (`knowledge.search` over gold), drafts the fix,
and proposes a diff. **Publish-to-IT-Glue is gated** — the customer-facing
documentation of record changes only through the gated publish path; until earned,
a human approves the diff. No send path, no secrets, no PII.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | detect-drift | Poll the CI + docs; find stale / contradictory / missing | — |
| 02 | draft-update | Draft the corrected/new doc grounded in the CI | — |
| 03 | propose-diff | Produce the IT Glue diff; publish gated until trusted | **Gated** |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L3**. When flipped to `auto`, the
workflow may self-approve the **poll + drift detection + working-copy draft/update
+ stale-flag** (stages 01–02 and the flag) — low-risk and reversible. **Publishing
the diff to IT Glue (the SoR, stage 03) parks for a human until the publish action
is earned** — an un-earned publish never auto-executes in any mode (ADR-0128 hard
ceiling). Any audit failure parks the run.

## Runtime skills

None in v1 (`skills: []`). The runbook structure and the drift rubric live in the
stage contracts; promote a shared doc-style rubric to a Tier-2 `../skills/` file the
moment a second knowledge workflow needs it. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
