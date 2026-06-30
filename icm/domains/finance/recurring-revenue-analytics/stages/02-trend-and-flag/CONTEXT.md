# Stage 02 — trend-and-flag  ·  COCKPIT / STERLING LOOP

**Job:** compute the period-over-period trend, flag material movement with its tie-out, raise
the recurring-revenue read to the cockpit / Sterling, and park it as intel into the renewal
motion. A read + trend flags — never a post, an invoice change, a metric-definition edit, or a
QBO push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Metric levels | stage 01 `metrics.md` | all (governed levels, gaps, as-of date) | the levels being trended |
| Rubric | `./skills/rr-analytics-rubric.md` | all | the trend read, the material-movement threshold, the advise-only + D3 discipline |

This stage works off stage 01's output and the rubric — it does **not** re-read silver, so it
grounds on no OKF entity and carries no grounding marker (the reads happened in stage 01).

## Process

1. `[script]` For each metric, compute the period-over-period delta and direction vs the prior
   snapshot (trend only when a prior snapshot exists — a single snapshot has no trend), carrying
   the as-of date through.
2. `[sonnet]` Decide **material movement** vs not against the rubric threshold. For each material
   movement write the tie-out: prior, current, delta, as-of date. Distinguish a **signal** (a
   measured / governed fact) from an **inference**; never estimate into a data gap. Any
   forward-looking element (e.g. an ARR run-rate projection) follows **D3** — show method +
   assumptions, label inference / scenario, never gap-fill.
3. `[script]` Any stage-01 gap becomes a **Gap** item — escalate it, do not guess. A run with any
   gap is not a clean "stable".
4. `[sonnet]` Set the read verdict per the rubric — **Stable**, **Movement flagged**, or **Gap**
   — write the one-line reason, and package the read as **advise-only intel** for the renewal
   motion (it feeds the renewal decision; it never makes it).
5. `[haiku]` Assemble the internal flag: the metric levels, the trend, each material movement's
   tie-out, the verdict, the as-of date, and the renewal-motion intel — for the cockpit /
   Sterling. Report only aggregate figures; never disclose an individual rate (salary
   non-disclosure, audrey.md).

## Checkpoint — cockpit / Sterling loop

The cockpit / Sterling reads the recurring-revenue read (the levels, the trend, the material
flags, the gaps, the verdict, the as-of date). The read is also **advise-only intel into the
renewal motion** — **the renewal block / approve / send-for-signature stays a human (and Chase)
call**, never Audrey's (audrey.md "advises, never blocks"). **Audrey raises the read; any post,
invoice change, metric-definition edit, or QBO push stays a human (and QBO) call (ADR-0123).**

**`auto` mode may self-approve ONLY:** auto-raising this **internal** recurring-revenue read +
trend flags to the cockpit / Sterling and parking the intel into the renewal motion (internal,
reversible — a flag can be dismissed). It may **never** post, alter an invoice, edit a metric
definition, push to QBO, or block / approve a renewal — no such action exists here to
self-approve. A **Gap** verdict still raises (the gap is the point); nothing else is unlocked.

## Outputs

`rr-read.md` — the recurring-revenue read (MRR / ARR / NRR levels, the period-over-period trend,
material-movement flags each with a tie-out, any D3-labeled forward-looking element), the
renewal-motion intel, the Gap items, the read verdict + reason, and the as-of date. An internal,
reversible `operational`-class flag; never a post, an invoice change, or a metric edit.

## Audit

- [ ] Trend computed only where a prior snapshot exists; each metric carries prior, current, delta, as-of date
- [ ] Every material movement carries its tie-out; any forward-looking element follows D3 (method + assumptions, labeled inference)
- [ ] Each figure labelled measured / governed or derived; no gap filled by an estimate
- [ ] Read verdict (Stable / Movement flagged / Gap) + reason stated, with as-of date; intel is advise-only to the renewal motion
- [ ] No individual rate disclosed; no post / invoice change / metric-definition edit / QBO push / renewal block-or-approve taken (read-only)
