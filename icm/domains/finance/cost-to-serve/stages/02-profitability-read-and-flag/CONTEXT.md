# Stage 02 — profitability-read-and-flag  ·  COCKPIT / STERLING LOOP

**Job:** assemble the per-client / per-service-line margin picture, flag thin / compressing
margin with its tie-out, raise the profitability read to the cockpit / Sterling, and supply
note-only context to the line agents. A read + margin flags — never a post, an invoice change, a
metric-definition edit, or a QBO push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Cost + margin | stage 01 `cost-margin.md` | all (governed cost / margin per line, gaps, as-of date) | the figures being read |
| Rubric | `./skills/cost-to-serve-rubric.md` | all | the read structure, the thin-margin / compression threshold, the advise-never-block discipline |

This stage works off stage 01's output and the rubric — it does **not** re-read silver, so it
grounds on no OKF entity and carries no grounding marker (the reads happened in stage 01).

## Process

1. `[script]` For each client / service line, assemble cost-to-serve, revenue, margin, and the
   derived margin %, carrying the as-of date through; compute margin direction vs the prior
   snapshot only where one exists.
2. `[sonnet]` Decide **thin / compressing margin** vs healthy against the rubric threshold. For
   each flagged line write the tie-out: cost-to-serve, revenue, margin, margin %, as-of date.
   Distinguish a **signal** (a measured / governed fact) from an **inference**; never estimate into
   a data gap.
3. `[script]` Any stage-01 gap becomes a **Gap** item — escalate it, do not guess. A run with any
   gap is not a clean "healthy".
4. `[sonnet]` Set the read verdict per the rubric — **Healthy**, **Margin flagged**, or **Gap** —
   write the one-line reason, and assemble the **note-only** profitability context for the line
   agents (Pierce / Celeste / Vance).
5. `[haiku]` Assemble the internal flag: the per-client / per-service-line margin picture, each
   flagged line's tie-out, the verdict, the as-of date, and the note-only line-agent context — for
   the cockpit / Sterling. Report only aggregate figures; never disclose an individual rate that
   enters a cost figure (salary non-disclosure, audrey.md).

## Checkpoint — cockpit / Sterling loop

The cockpit / Sterling reads the profitability read (the per-line margins, the thin / compression
flags, the gaps, the verdict, the as-of date). The read also supplies **note-only** context to the
line agents (Pierce / Celeste / Vance) — **advise-never-block: the block / approve is theirs and a
human's**, never Audrey's (audrey.md "advises, never blocks"). **Audrey raises the read; any post,
invoice change, metric-definition edit, or QBO push stays a human (and QBO) call (ADR-0123).**

**`auto` mode may self-approve ONLY:** auto-raising this **internal** profitability read +
thin-margin / compression flags to the cockpit / Sterling and supplying note-only context to the
line agents (internal, reversible — a flag can be dismissed). It may **never** post, alter an
invoice, edit a metric definition, push to QBO, or block / approve a line agent's action — no such
action exists here to self-approve. A **Gap** verdict still raises (the gap is the point); nothing
else is unlocked.

## Outputs

`profitability.md` — the per-client / per-service-line margin picture (cost-to-serve, revenue,
margin, margin %), the thin / compression flags each with a tie-out, the note-only line-agent
context, the Gap items, the read verdict + reason, and the as-of date. An internal, reversible
`operational`-class flag; never a post, an invoice change, or a metric edit.

## Audit

- [ ] Each client / service line carries cost-to-serve, revenue, margin, margin %, with the as-of date
- [ ] Every flagged line carries its tie-out; trend only asserted where a prior snapshot exists
- [ ] Each figure labelled measured / governed or derived; no gap filled by an estimate
- [ ] Read verdict (Healthy / Margin flagged / Gap) + reason stated, with as-of date; line-agent context is note-only (advise-never-block)
- [ ] No individual rate disclosed; no post / invoice change / metric-definition edit / QBO push / line-agent block-or-approve taken (read-only)
