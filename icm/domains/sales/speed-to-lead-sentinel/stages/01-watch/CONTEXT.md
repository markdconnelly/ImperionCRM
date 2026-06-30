# Stage 01 — watch

**Job:** turn the routed-but-unqualified leads into one grounded SLA watch-list — each
lead's elapsed time-since-routed computed against its speed-to-lead SLA target and
classified breached / imminent-breach / within-SLA, cited with its source and as-of,
with a dormant feed flagged stale rather than presented as live.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The schedule / sweep trigger | trigger payload | the sweep window | what sweep window to evaluate the SLA clock against |
| Routed leads | `` `okf:lead_score` `` | routed-but-unqualified leads in scope | the leads under SLA + the routed-at / SLA-target signal |
| Lead contacts | `` `okf:contact` `` | contacts on the in-scope leads | resolve each lead to its person for the watch-list |
| Owning accounts | `` `okf:account` `` | accounts on the in-scope leads | segment grouping + the SLA-target tier per lead |
| Last interaction | `` `okf:interaction` `` | last interaction per lead | the last-touch timestamp to compute time-since-routed |

## Process

1. `[script]` Enumerate the in-scope routed-but-unqualified leads; resolve each to its
   `lead_score`, its `contact`, and its owning `account`. A lead with no resolvable
   routed-at signal is carried forward as **unverifiable**, never assumed.
2. `[script]` From the last `interaction` and the routed-at signal, compute
   **time-since-routed** by date math, and read each lead's speed-to-lead **SLA target**
   (per its account segment/source). Date math is deterministic — never estimate the
   elapsed clock.
3. `[script]` Classify each lead against its target: **breached** (elapsed past the SLA
   target), **imminent-breach** (within the warning band before the target), or
   **within-SLA** (comfortably inside). A lead with no computable target stays
   **unverifiable**, never defaulted to a state.
4. `[haiku]` Stamp each lead with its **as-of** (A5); a dormant/empty feed (no routed
   leads, stale interaction stream) → **flag stale, never present as live** (A5c). Never
   fabricate an SLA state or a routed-at time.

## Outputs

`watchlist.md` — one entry per routed-but-unqualified lead keyed to its `lead_score` +
`contact` + `account` and as-of, with the computed time-since-routed, the SLA target,
the breached / imminent-breach / within-SLA / unverifiable classification, and any
stale-feed flags. Empty if the sweep finds no routed leads.

## Audit

- [ ] Each lead resolves to its `lead_score` + `contact` + `account`, cited with as-of (A5)
- [ ] Time-since-routed computed by date math against the SLA target — never estimated
- [ ] Every lead classified breached / imminent-breach / within-SLA / unverifiable (blank is not valid)
- [ ] Dormant/empty feed flagged stale, not presented as live (A5c); no SLA state fabricated
