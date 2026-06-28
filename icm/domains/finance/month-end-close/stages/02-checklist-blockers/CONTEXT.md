# Stage 02 — checklist-blockers  ·  CFO LOOP

**Job:** turn the gathered close-state into the close-readiness checklist, flag
each unmet item as a blocker with its tie-out, and raise the checklist to the CFO.
A checklist + blocker flags — never the close, a post, an invoice edit, or a QBO
push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Close state | stage 01 `close-state.md` | all (counts, verdicts, gaps, as-of date) | the facts being checked |
| Rubric | `../../skills/close-checklist-rubric.md` | all | the checks, blocker conditions, signal sources, tie-out discipline |

This stage works off stage 01's output and the rubric — it does **not** re-read
silver, so it grounds on no OKF entity and carries no grounding marker (the
re-reads happened in stage 01).

## Process

1. `[script]` Map each stage-01 figure onto its rubric row (checks 1–5),
   carrying the as-of date through.
2. `[sonnet]` For each row, decide **clear** (blocker condition not met) or
   **blocker** (condition met). For each blocker write the tie-out: expected,
   actual, delta, signal source. Distinguish a **signal** (a measured fact) from
   an **inference**; never estimate into a data gap.
3. `[script]` Any stage-01 gap becomes a **Gap** item — escalate it, do not guess.
   A run with any gap is not "Ready".
4. `[sonnet]` Set the readiness verdict per the rubric — **Ready** (all rows
   clear), **Blocked** (≥1 blocker), or **Gap** — and write the one-line reason.
5. `[haiku]` Assemble the internal flag: the checklist, each blocker's tie-out,
   the verdict, and the as-of date — for the cockpit / CFO. Report reconciliation
   results as verdicts only; never disclose an individual rate (salary
   non-disclosure, audrey.md).

## Checkpoint — CFO loop

The CFO reads the close-readiness checklist (each row's clear/blocker state,
tie-outs, gaps, verdict, as-of date) and decides whether to close the period.
**Audrey raises the flag; the close — and any post, invoice change, or QBO push —
stays a human (and QBO) call (ADR-0123).**

**`auto` mode may self-approve ONLY:** auto-raising this **internal**
close-readiness checklist + blocker flags to the cockpit / CFO (internal,
reversible — a flag can be dismissed). It may **never** close the month, post,
alter an invoice, or push to QBO — no such action exists here to self-approve. A
**Gap** verdict still raises (the gap is the point); nothing else is unlocked.

## Outputs

`close-readiness.md` — the checklist (5 rows, each clear/blocker with tie-out),
the Gap items, the readiness verdict + reason, and the as-of date. An internal,
reversible `operational`-class flag; never a close, a post, or an invoice change.

## Audit

- [ ] All five rubric rows present, each marked clear or blocker
- [ ] Every blocker carries a tie-out (expected, actual, delta, signal source)
- [ ] Each figure labelled measured or derived; no gap filled by an estimate
- [ ] Readiness verdict (Ready / Blocked / Gap) + one-line reason stated, with as-of date
- [ ] No individual rate disclosed; no close/post/invoice/QBO action taken (read-only)
