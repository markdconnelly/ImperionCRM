# Stage 01 — margin-context

**Job:** read the historical invoice margin + license facts for the renewal subject, and
take in Chase's proposed renewal pricing.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Historical invoice | silver `invoice` · `okf:invoice` | the renewal subject's history | the realized revenue (QBO mirror) to ground historical margin |
| License facts | silver `license_assignment` · `okf:license_assignment` | the renewal subject's agreement | the seat/quantity + per-unit basis for both figures |
| Proposed renewal pricing | Chase handoff (NOT finance silver — Audrey does not read the opportunity) | the renewal subject | the proposed pricing to measure margin against |

## Process

1. `[script]` Resolve the renewal subject (the account / agreement under reprice) and its
   history window. No resolvable subject → audit fail.
2. `[script]` Read the historical invoice revenue and the agreement/true-up license facts.
   A missing or un-mirrored record is noted as a gap — not guessed.
3. `[haiku]` Take in Chase's proposed renewal pricing from the handoff (plain prose — it is
   not finance silver). Note plainly what is missing: the cost-allocation views are unbuilt
   (#1044), so the cost side of margin is partial — record that gap, do not fill it.

## Outputs

`margin-context.md` — the resolved renewal subject, the historical invoice revenue + license
facts, Chase's proposed renewal pricing, and any data gaps noted (notably the unbuilt
cost-allocation cost side).

## Audit

- [ ] Resolved renewal subject + history window stated (not blank)
- [ ] Historical invoice revenue + license facts read (or gaps noted, not guessed)
- [ ] Chase's proposed renewal pricing taken in from the handoff (plain prose)
- [ ] Cost-allocation gap (#1044) noted, not estimated
- [ ] No figure estimated into a data gap
