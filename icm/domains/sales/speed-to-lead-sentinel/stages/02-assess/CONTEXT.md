# Stage 02 — assess

**Job:** turn the breached and imminent-breach watch-list entries into one assessed set
— each with its severity, its owner, and the "why still unqualified" signal — with any
cross-account breach pattern pooled across the lead base internally only, anonymized
and aggregated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Watch-list | `watchlist.md` (stage 01 output) | breached + imminent-breach entries | the SLA-flagged leads to assess |
| Routed leads | `` `okf:lead_score` `` | the flagged leads | the score/routing detail behind severity + owner |
| Owning accounts | `` `okf:account` `` | accounts on the flagged leads | segment cut for severity + the owner assignment |
| Last interaction | `` `okf:interaction` `` | last interaction per flagged lead | the "why still unqualified" signal (no first-touch yet) |

## Process

1. `[script]` Take only the **breached** and **imminent-breach** entries forward; carry
   each one's resolved `lead_score` + `account` and as-of. Within-SLA and unverifiable
   entries do not enter the assessment.
2. `[sonnet]` For each entry, assess **severity** (how far past / how close to the SLA
   target, weighted by lead value/segment), name the **owner** of record, and read the
   **"why still unqualified"** signal from the last `interaction` (never routed-on, no
   first-touch, stalled). Cite the contributing lead; a state with no clean signal stays
   uncomputed and is noted, not invented (A5). No fabricated SLA state.
3. `[script]` Build any **cross-account breach pattern** (e.g. one owner or one segment
   running chronically late) **pooled across the lead base internally only — anonymized
   + aggregated** (A7): no client identifier, no row-level personal data, no single
   client's specifics bleeding into another's view. **Pool, never bleed.**

## Outputs

`assessment.md` — per breached / imminent-breach lead: severity, owner of record, and
the cited "why still unqualified" signal, plus any anonymized/aggregated cross-account
breach pattern. Keyed to each `lead_score` + `account` by id.

## Audit

- [ ] Only breached + imminent-breach entries assessed; within-SLA / unverifiable excluded
- [ ] Each entry carries severity + owner + a cited "why unqualified" signal (A5); none fabricated
- [ ] Cross-account pattern anonymized + aggregated only — no client identifier / no bleed (A7)
