# Stage 01 — scan

**Job:** pull every open opportunity and compute its hygiene findings —
staleness, missing next-action/close-date, and data-quality gaps — each cited and
as-of'd, so triage works from a grounded inventory.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Trigger | the scheduled-sweep event | full payload | which window / portfolio to sweep |
| Open opportunities | silver `opportunity` · `okf:opportunity` | all open deals in scope | stage, owner, amount, close_date, next_action, last stage change |
| Owning accounts | silver `account` · `okf:account` | accounts on the open deals | owner/segment context for data-quality + stamp candidates |
| Primary contacts | silver `contact` · `okf:contact` | primary contact per open deal | who a routed follow-up would address |
| History | `interaction` timeline · `okf:interaction` | last touch per open opportunity | last-movement timestamp for staleness |

## Process

1. `[script]` Resolve the sweep window/portfolio from the trigger; enumerate all
   open `opportunity` ids in scope, tenant-isolated, with their owning `account`
   and primary `contact` by known key.
2. `[script]` For each opportunity pull stage, owner, amount, close_date,
   next_action, source/attribution, and last stage change; pull the last
   interaction for last-movement. Absence is information, not a gap to fill.
3. `[script]` Compute staleness against the thresholds in `./skills/hygiene-rules.md`
   (deterministic date math), missing next-action/close-date, and each missing
   required field on the data-quality checklist. Key every finding to its
   opportunity id.
4. `[haiku]` Stamp each opportunity reading with its **as-of** (A5); a
   dormant/empty feed (no open deals returned, stale read) → **flag stale, never
   present as live** (A5c). No fabricated field or finding.

## Outputs

`scan.md` — each open opportunity id + as-of, its computed findings (stale /
missing next-action / missing close-date / data-quality gaps with the named
fields), last-movement summary, and any stale-feed flag. Unknowns stated as
unknowns.

## Audit

- [ ] Each opportunity + finding cites its `opportunity` id + as-of (A5); none fabricated
- [ ] Staleness, missing next-action/close-date, and data-quality gaps computed per `hygiene-rules.md`
- [ ] Dormant/empty feed flagged stale, not presented as live (A5c)
- [ ] In-scope open opportunity set fully enumerated for triage
