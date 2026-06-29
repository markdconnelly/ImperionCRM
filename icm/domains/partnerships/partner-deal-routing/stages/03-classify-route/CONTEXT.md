# Stage 03 — classify-route

**Job:** classify the deal `co_sell | referral | direct` and check the account for
a channel-conflict collision before any hand-off.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Ground record | stage 01 `ground.md` | all | the resolved context |
| Attribution | stage 02 `attribution.md` | all | the partner + contribution |
| Registered deals | silver `partner_deal` · `okf:partner_deal` | ALL deals registered against this account | conflict detection |
| Account | silver `account` · `okf:account` | the target account | the collision axis |

## Process

1. `[sonnet]` Classify the deal type from the attribution + signal: `co_sell`
   (joint pursuit), `referral` (partner hands the lead, we close), or `direct`
   (partner is reseller of record). One sentence of reasoning.
2. `[script]` Channel-conflict check: read every `partner_deal` already registered
   against this account (`okf:partner_deal` on `account_id`). If another partner
   holds a registered, non-closed deal on the same account → flag
   `channel_conflict = true` with the colliding partner/deal ids.
3. `[sonnet]` If `channel_conflict`, draft a proposed resolution (who registered
   first, the fair-dealing read) — **as a proposal for a human, never a decision**
   (BO-02 §5). No conflict → note `clear`.

## Outputs

`routing.md` — the deal-type classification + reasoning, the channel-conflict flag
(`clear` | colliding ids + proposed resolution).

## Audit

- [ ] Exactly one deal type (`co_sell`/`referral`/`direct`) with reasoning
- [ ] Channel-conflict check ran; result is `clear` or names the colliding deal(s)
- [ ] If `channel_conflict`, the resolution is framed as a proposal (the run parks at stage 04 regardless; a conflict never self-resolves)
