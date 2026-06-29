# Workflow: partner-deal-routing (partnerships v1)

**Job:** every co-sell / partner-sourced opportunity that comes in gets its
partner resolved, its deal classified, clean attribution stamped, and a managed
hand-off to Sales — drafted by Bridget, the close owned by Chase.

**Trigger:** a partner-sourced or co-sell signal lands — a partner registers a
deal, a partner-influenced lead arrives, or a marketplace/co-sell notification is
routed to Bridget. One run per partner-sourced opportunity.

**Note:** SELL-side, read + propose only. Bridget never binds a partner agreement,
commits terms, moves money, or closes the deal — Chase owns the close (the
Bridget→Chase seam). No send path in this workflow (ADR-0058; nothing external
exits here).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Assemble the partner + account + opportunity context | — |
| 02 | resolve-partner | Resolve the partner; stamp drafted attribution | — |
| 03 | classify-route | Classify co_sell / referral / direct; check channel conflict | — |
| 04 | handoff-chase | Park the attributed opportunity as a proposal for Chase | **Yes** |
| 05 | summary | Write the work-note; record the partnership touch | — |

## Autonomy

Starts `draft` (ADR-0061). When flipped to `auto`, the run may self-approve ONLY:
resolving the partner, classifying the deal, stamping a drafted attribution, and
preparing the parked hand-off — when every audit is clean and the partner resolves
unambiguously. A **channel-conflict collision** (a registered-deal overlap on the
account), any commitment/money, an unresolved partner, or any audit failure parks
for a human, in every mode. Bridget's L3 ceiling never lets the close, the bind,
or the payout self-execute.

## Runtime skills

None in v1 (`skills: []`). Domain-shared (Tier 2) channel/attribution skills are
promoted into `../skills/` the moment a second partnerships workflow needs them
(CONVENTIONS §skills). Mark-editable business content; stages cite, never restate.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is
`agent.yaml`; the composed workflow prose is `prose.md`.
