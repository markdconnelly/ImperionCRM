# Workflow: doc-gap-audit (knowledge v1)

**Job:** find the documentation gaps in the estate — cross-reference the asset
estate (`account` / `device` / `cloud_asset`) against the existing docs
(`knowledge.search` over gold) and propose a **documentation backlog** of assets and
procedures that lack current docs (no runbook, stale entry). Lexicon audits and
proposes the backlog; she never publishes and never notifies.

**Trigger:** the periodic documentation-coverage audit (the scheduled estate sweep).
A whole-estate or per-account audit run — one backlog per audit scope.

**Posture:** read-only audit. Lexicon reads the asset estate (`account` / `device` /
`cloud_asset`) and the existing docs (`knowledge.search` over gold), and produces a
**proposed backlog** of documentation gaps for a human. **No write, no publish, no
notify** — this workflow holds no write tool; publishing the backlog to the SoR
(IT Glue) and notifying anyone are gated and park for a human. No send path, no
secrets, no PII.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | inventory-assets | Enumerate the in-scope estate (account / device / cloud_asset) | — |
| 02 | match-docs | Match each asset to its existing doc; classify covered / stale / missing | — |
| 03 | propose-backlog | Assemble the documentation-gap backlog; surface to a human | **Gated** |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1** (propose-only). When flipped to
`auto`, the workflow may self-approve **only the internal documentation-gap backlog**
— assembling and surfacing the proposed backlog (stages 01–03's output) is
propose-only and reversible. **Every publish-to-SoR (IT Glue) and every notify parks
for a human** — there is no write tool here, so the backlog never auto-publishes and
no one is auto-notified in any mode (ADR-0128 hard ceiling). Any audit failure parks
the run.

## Runtime skills

None in v1 (`skills: []`). The inventory rubric and the coverage classification live
in the stage contracts; promote a shared doc-coverage rubric to a Tier-2
`../skills/` file the moment a second knowledge workflow needs it (the doc-sync drift
rubric is the sibling). Rules of the format: `../../../CONVENTIONS.md`. The structured
manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
