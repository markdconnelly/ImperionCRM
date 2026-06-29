# Stage 02 — assess-sla

**Job:** classify each in-window ticket against its SLA target and roll the
results up by account.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Window record | stage 01 `window.md` | all in-window tickets | the subjects to assess |
| SLA detail | silver `ticket` · `okf:ticket` | SLA target + actual/elapsed clock + timeline for each in-window ticket | the evidence to assess against |
| Owning account | silver `account` · `okf:account` | the account each ticket belongs to | group SLA performance by client |

## Process

1. `[script]` For each ticket, classify **SLA-adherence** `met | breached |
   at-risk | unknown` from the SLA target vs the actual (closed) or elapsed (open)
   clock in the window record — a deterministic clock comparison. `at-risk` is an
   open ticket whose elapsed clock is approaching target; `unknown` is a missing
   target.
2. `[sonnet]` For each `breached` or `at-risk` ticket, write one sentence of
   grounded reasoning naming the SLA signal (target, the clock, the gap) — by
   reference, never the verbatim resolution text.
3. `[script]` Roll the classifications up **by account**: count `met` / `breached`
   / `at-risk` / `unknown` per account.
4. `[sonnet]` Flag low confidence + name anything in the SLA record you could not
   reconcile (e.g. a target you could not source). A verdict you cannot ground is
   not a verdict — say so rather than guess. On an empty window (per stage 01),
   carry the empty result forward — assess nothing, invent nothing.

## Outputs

`assessment.md` — one row per ticket: id, account (by reference), SLA-adherence
verdict + (for breach/at-risk) one sentence of reasoning, confidence note; plus a
per-account roll-up of the four counts. PII reported **by reference** — never the
verbatim resolution text or client identifiers. An empty window passes through as
an explicit empty assessment.

## Audit

- [ ] Every in-window ticket has an SLA-adherence verdict (or the window is
      explicitly empty)
- [ ] Each `breached` / `at-risk` carries one sentence of grounded reasoning;
      `unknown`/low-confidence states a reason
- [ ] A per-account roll-up of the verdict counts is present
- [ ] No verbatim PII / client identifier in the output (audit-by-reference)
