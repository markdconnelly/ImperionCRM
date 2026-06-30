# Stage 02 — synthesize

**Job:** turn the gather record into a per-report business-outcome scorecard, and
separate a business gap from a governance/quality/risk concern.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all six reports | the raw material |

## Process

1. `[sonnet]` Score each report against the **business outcome it owns** (pipeline
   moved, demand generated, renewals held, vendor spend controlled, AR cleared,
   partner ROI earned) — is the outcome moving, at what first-time-success and
   rejection rate, at what autonomy rung. Activity is context, the outcome is the
   measure.
2. `[sonnet]` Separate the flags into two lists: **business gaps** (a report not
   advancing its outcome) and **governance concerns** (sliding eval scores, a mis-set
   dial, conformance/quality drift). The second list is **not Sterling's to
   adjudicate** — it is tagged for handoff.
3. `[sonnet]` Rank each list by exposure (the business cost of the gap; the severity
   of the concern). Pool-never-bleed: correlate internally across reports, never
   client-facing.

## Outputs

`scorecard.md` — a per-report scorecard (outcome · trend · rung) plus two separate
flag lists: **business gaps** (each naming the report, the outcome, the exposure) and
**governance concerns** (each naming the report and the concern, marked handoff).

## Audit

- [ ] Each report is scored against the business OUTCOME it owns, not raw activity
- [ ] Flags are split into business gaps vs governance concerns; the two are not mixed
- [ ] Every governance concern is marked for handoff, not for Sterling to adjudicate
- [ ] No item restates the gather row verbatim (it must be synthesized)
