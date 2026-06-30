# Stage 02 — project-runway-and-flag  ·  COCKPIT / STERLING LOOP

**Job:** project the runway from the grounded inputs — showing method + assumptions — flag
material runway risk with its tie-out, and raise it to the cockpit / Sterling. A runway
projection + risk flags — never a post, an invoice change, a budget edit, or a QBO push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Grounded inputs | stage 01 `inputs.md` | all (inflow basis, outflow basis, baseline, gaps, as-of date, horizon) | the grounded basis to project from |
| Rubric | `./skills/forecast-rubric.md` | all | the projection method, the assumptions to show, the risk threshold, the D3 discipline |

This stage works off stage 01's output and the rubric — it does **not** re-read silver, so it
grounds on no OKF entity and carries no grounding marker (the re-reads happened in stage 01).

## Process

1. `[script]` If stage 01 recorded a missing forecast **input**, the projection is **gapped** —
   escalate the gap; do **not** guess the input to complete the projection (D3). Propose-only /
   dormant until the input grounds (e.g. the AR mirror, #1580).
2. `[sonnet]` Project the runway from the grounded inputs per `forecast-rubric.md`: state the
   **method**, make every **assumption** explicit (collection timing, run-rate, opening basis,
   scenario toggles), and compute the runway across the horizon. Label every projected figure
   **inference / scenario**, distinct from the measured inputs.
3. `[sonnet]` Decide **material runway risk** vs not against the rubric threshold. For a
   material risk write the tie-out: opening basis, projected net flow, the period the floor is
   crossed, the assumptions. Distinguish a **measured input** from a **projected figure**.
4. `[sonnet]` Set the runway verdict per the rubric — **Runway clear**, **Risk flagged**, or
   **Gap** — and write the one-line reason.
5. `[haiku]` Assemble the internal flag: the runway projection (with method + assumptions), the
   risk tie-out, the verdict, the measured-vs-projected labels, and the as-of date — for the
   cockpit / Sterling. Report only aggregate outflow; never disclose an individual rate (salary
   non-disclosure, audrey.md).

## Checkpoint — cockpit / Sterling loop

The cockpit / Sterling reads the runway projection (method, assumptions, the risk flags, the
gaps, the verdict, the as-of date) and decides whether to act. **Audrey raises the projection;
any treasury action, post, invoice change, budget edit, or QBO push stays a human (and QBO)
call (ADR-0123).**

**`auto` mode may self-approve ONLY:** auto-raising this **internal** runway projection +
material-risk flags to the cockpit / Sterling (internal, reversible — a flag can be dismissed),
always with method + assumptions and measured-vs-projected labels. It may **never** post, alter
an invoice, edit the budget, or push to QBO — no such action exists here to self-approve. A
**Gap** verdict still raises (the gap is the point); nothing else is unlocked, and a missing
input is **never** guessed.

## Outputs

`runway.md` — the runway projection (method, assumptions, period-by-period across the horizon),
the material-risk flags each with a tie-out, the Gap items, the runway verdict + reason, the
measured-vs-projected labels, and the as-of date. An internal, reversible `operational`-class
flag; never a post, an invoice change, or a budget edit.

## Audit

- [ ] Method + every assumption shown; projection horizon stated
- [ ] Every projected figure labelled inference / scenario, distinct from the measured inputs
- [ ] Material runway risk (if any) carries its tie-out (opening basis, projected net flow, floor-cross period)
- [ ] A missing forecast input is escalated as a gap, NEVER guessed (D3); verdict + reason stated with as-of date
- [ ] No individual rate disclosed; no post / invoice change / budget edit / QBO push taken (read-only)
