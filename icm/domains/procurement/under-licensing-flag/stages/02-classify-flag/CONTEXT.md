# Stage 02 — classify-flag

**Job:** classify each shortfall's exposure severity and raise the compliance-exposure flag.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Cross-referenced shortfalls | `crossref.md` (stage 01 output) | full | the cited shortfalls to classify and flag |
| Exposure rubric | `./skills/compliance-exposure-rubric.md` | severity ladder + risk-over-cost rule | how exposure is classed, why risk beats saving |

## Process

1. `[automation]` Classify each shortfall into an **exposure class and severity** per
   `compliance-exposure-rubric.md`, carrying every evidence citation (catalog version +
   as-of) forward unchanged (A5). Severity drives **computed urgency** (A6) — a
   compliance-audit-facing exposure outranks a cosmetic one; escalate by clarity, not
   alarm (vance.md §4).
2. `[hybrid]` Compose the flag: per exposure, the class, the severity, the evidence line,
   and the **remediation direction** (what would close it — e.g. true-up N seats of SKU-X)
   stated WITHOUT commitment. Apply the **risk-over-cost rule**: where a cheaper
   under-licensed configuration exists, name it and reject it explicitly — never quietly
   pick it (vance.md §3).
3. `[automation]` Raise the **compliance-exposure flag** internally (auto at L2,
   reversible, A10 row 1). Any remediation buy **splits out → the governed-procurement
   money gate (02-B2)** — staged as a gate item, never actuated here (B4:
   assertion-with-spend ≠ measurement, A11).

## Outputs

`exposure-flag.md` — the as-of date + catalog version, exposures by severity (class,
evidence citation, remediation direction, rejected cheaper alternative where one exists),
the gate items staged for 02-B2, and the carried-forward gaps. Terminal stage; ends parked
for the budget owner.

## Audit

- [ ] Every exposure carries its catalog version + as-of citation (A5) and a rubric severity
- [ ] Risk-over-cost honored: no cheaper under-licensed path chosen; any such alternative named and rejected
- [ ] Remediation stated as direction only; every buy staged to 02-B2, none actuated
- [ ] No actuation, no money commitment, no external message emitted

## Checkpoint

The exposure-flag loop: a human (the budget owner / service owner) reads the exposure
flag; any remediation buy is decided at the **governed-procurement money gate (02-B2)** —
`always_gate` forever (ADR-0109, migration 0184; BO-03 Procurement §5). **`auto` (L2) may
self-approve raising the internal compliance-exposure flag ONLY** — no buy, true-up, or
license change runs in this workflow at any rung, and no exposure is ever traded away for
a saving (vance.md §3).
