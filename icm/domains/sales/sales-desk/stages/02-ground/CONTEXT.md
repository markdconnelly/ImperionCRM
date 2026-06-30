# Stage 02 — ground

**Job:** pull the cited facts the grounding plan calls for from the structured rooms and
attempt semantic recall, keying every reading to its source id + as-of, flagging dormant
recall as stale and any gap as unknown — never inventing a fact to fill it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Interpretation + grounding plan | stage 01 output | the question + caller scope | which rooms to read + recall to attempt, bounded to the caller |
| Opportunities | `` `okf:opportunity` `` | the in-scope deal(s) | stage/status/close-reason facts behind the judgment |
| Owning accounts | `` `okf:account` `` | accounts on the in-scope deals | segment/relationship facts |
| Contacts | `` `okf:contact` `` | contacts on the in-scope deals | who the deal is with |
| Interaction history | `` `okf:interaction` `` | interactions on the in-scope deals | the engagement/touch history the deal-risk read leans on |
| Consent events | `` `okf:consent_event` `` | consent on the in-scope contacts | suppression/cadence state relevant to a next-touch judgment |
| Lead score | `` `okf:lead_score` `` | scores on the in-scope leads | the qualification-threshold signal |
| Source campaigns | `` `okf:campaign` `` | campaigns attributed to the deals | the source/demand attribution behind the deal |

## Process

1. `[script]` Pull the structured facts the plan calls for from the in-scope rooms via
   `pg.read`; key each reading to its source id (`opportunity` / `account` / `interaction` /
   `contact` / …) and stamp its **as-of** (A5). Stay inside the caller's scope from stage 01.
2. `[haiku]` Attempt semantic recall (`knowledge.search` / `memory.recall`) per the plan.
   Recall is **dormant** until the retrieval tier + Voyage seed hydrate — an empty recall is
   **absence of memory, not absence of fact** (A5c): flag it stale and rely on the structured
   rooms; never present an empty recall as "nothing exists".
3. `[script]` Assemble the cited evidence set, each fact keyed to its source id + as-of. Any
   fact the plan needs but the rooms don't ground is flagged **"unknown — would need X"** (A5b)
   — never invented. Any cross-deal context is **pooled internally only — anonymized +
   aggregated** (A7): no client identifier, no row-level bleed.

## Outputs

`evidence.md` — the cited evidence set (each fact keyed to its source id + as-of), the recall
result with any dormant/stale flag, the gaps flagged "unknown — would need X", and any
cross-deal context anonymized/aggregated only.

## Audit

- [ ] Every pulled fact keyed to its source id + as-of (A5); none fabricated
- [ ] Empty/dormant recall flagged stale — absence of memory, not absence of fact (A5c)
- [ ] Gaps flagged "unknown — would need X", routed not invented (A5b)
- [ ] Cross-deal context anonymized + aggregated only — no client identifier / no bleed (A7)
- [ ] Reads stayed within the caller's permission scope — never-exceed-caller (§5.2); no side effect
