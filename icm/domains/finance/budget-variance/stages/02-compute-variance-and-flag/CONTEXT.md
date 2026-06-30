# Stage 02 — compute-variance-and-flag  ·  COCKPIT / STERLING LOOP

**Job:** turn the gathered plan-and-actuals into the plan-vs-actual variance read, flag each
material variance with its tie-out, and raise it to the cockpit / Sterling. A variance read +
material-variance flags — never a budget edit, a post, an invoice change, or a QBO push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Plan + actuals | stage 01 `plan-actuals.md` | all (plan lines, actuals, gaps, as-of date) | the figures being compared |
| Rubric | `./skills/variance-rubric.md` | all | the alignment, the material-variance threshold, the tie-out discipline |

This stage works off stage 01's output and the rubric — it does **not** re-read silver, so it
grounds on no OKF entity and carries no grounding marker (the re-reads happened in stage 01).

## Process

1. `[script]` For each plan line, compute the **delta** (actual − plan) and the **% of plan**,
   carrying the as-of date through.
2. `[sonnet]` Decide **material** vs immaterial for each line against the rubric threshold.
   For each material variance write the tie-out: plan, actual, delta, % of plan, signal
   source. Distinguish a **signal** (a measured fact) from an **inference**; never estimate
   into a data gap.
3. `[script]` Any stage-01 gap becomes a **Gap** item — escalate it, do not guess. A run with
   any gap is not a clean "on plan".
4. `[sonnet]` Set the variance verdict per the rubric — **On plan** (no material variance),
   **Variance flagged** (≥1 material), or **Gap** — and write the one-line reason.
5. `[haiku]` Assemble the internal flag: the variance distribution, each material variance's
   tie-out, the verdict, and the as-of date — for the cockpit / Sterling. Report only
   aggregate labor figures; never disclose an individual rate (salary non-disclosure,
   audrey.md).

## Checkpoint — cockpit / Sterling loop

The cockpit / Sterling reads the plan-vs-actual variance read (each line's plan / actual /
delta, the material flags, the gaps, the verdict, the as-of date) and decides whether to
re-plan or act. **Audrey raises the flag; the re-plan — and any post, invoice change, budget
edit, or QBO push — stays a human (and QBO) call (ADR-0123).**

**`auto` mode may self-approve ONLY:** auto-raising this **internal** plan-vs-actual variance
read + material-variance flags to the cockpit / Sterling (internal, reversible — a flag can be
dismissed). It may **never** edit the budget, post, alter an invoice, or push to QBO — no such
action exists here to self-approve. A **Gap** verdict still raises (the gap is the point);
nothing else is unlocked.

## Outputs

`variance.md` — the plan-vs-actual variance distribution (per account / period), the material-
variance flags each with a tie-out, the Gap items, the variance verdict + reason, and the
as-of date. An internal, reversible `operational`-class flag; never a budget edit, a post, or
an invoice change.

## Audit

- [ ] Each plan line carries plan, actual, delta, % of plan, with the as-of date
- [ ] Every material variance flagged carries its tie-out (plan, actual, delta, signal source)
- [ ] Each figure labelled measured or derived; no gap filled by an estimate
- [ ] Variance verdict (On plan / Variance flagged / Gap) + one-line reason stated, with as-of date
- [ ] No individual rate disclosed; no budget edit / post / invoice change / QBO push taken (read-only)
