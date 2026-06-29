# Stage 02 — flag-deadlines

**Job:** turn the watch-list into one deadline set — the notice-period and renewal
dates computed from verified terms, with each item flagged due / not-yet-due /
unverifiable.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Watch-list | `watchlist.md` (stage 01 output) | all | the grounded renewals/obligations to date |
| Deal | silver `opportunity` · `okf:opportunity` | the linked deal | scope/value to weigh the deadline's urgency |
| Term baseline | `knowledge.search` (gold, cited) | standard notice-period windows | judge a term's window against our baseline |

## Process

1. `[script]` For each watch-list entry with verified terms, compute the renewal date
   and the notice-period deadline (renewal date minus the notice window) by date math.
   No verified renewal/notice term → carry the item forward as **unverifiable**.
2. `[script]` Flag each item against the scan window: **due** (deadline within the
   window), **not-yet-due** (deadline beyond it), or **unverifiable** (no computable
   date). Date math is deterministic — never estimate or round a legal date.
3. `[sonnet]` For each **due** item, write a one-line urgency note grounded in the
   deal's scope/value (why this deadline matters now). Items marked unverifiable get a
   one-line note of what is missing, routed for a human to confirm — never assumed.

## Outputs

`deadlines.md` — per watch-list item: the computed renewal date and notice-period
deadline (or `unverifiable`), the due / not-yet-due / unverifiable flag, and the
urgency / missing-term note. No date is invented; unverifiable items stay unverifiable.

## Audit

- [ ] Every item has a computed renewal + notice deadline, or is flagged `unverifiable`
- [ ] No date is estimated, rounded, or fabricated — each is from a cited term or absent
- [ ] Due / not-yet-due / unverifiable flag set for every item (blank is not valid)
