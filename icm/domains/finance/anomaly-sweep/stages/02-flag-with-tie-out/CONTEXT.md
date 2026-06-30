# Stage 02 — flag-with-tie-out  ·  COCKPIT / STERLING LOOP

**Job:** tie out each candidate, confirm the anomalies that cross the threshold, and escalate
the flagged-anomaly set to the cockpit / Sterling. A flagged-anomaly set with tie-outs — never
a post, an entry edit / deletion, a duplicate fix, or a QBO push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Candidates | stage 01 `candidates.md` | all (candidates by class, signals, gaps, as-of date) | the candidates being tied out |
| Rubric | `./skills/anomaly-rubric.md` | all | the tie-out discipline + the confidence / materiality threshold |

This stage works off stage 01's output and the rubric — it does **not** re-read silver, so it
grounds on no OKF entity and carries no grounding marker (the scans happened in stage 01).

## Process

1. `[script]` For each candidate, assemble the tie-out: baseline / expected, actual, deviation,
   carrying the as-of date through.
2. `[sonnet]` Decide **confirmed anomaly** vs noise against the rubric's confidence /
   materiality threshold. For each confirmed anomaly write the tie-out and its class.
   Distinguish a **signal** (a measured fact) from an **inference**; never estimate into a data
   gap.
3. `[script]` Any stage-01 source gap becomes a **Gap** item — escalate it, do not guess. A run
   with any gap is not a clean sweep.
4. `[sonnet]` Set the sweep verdict per the rubric — **Clean** (no confirmed anomaly),
   **Anomalies flagged** (≥1 confirmed), or **Gap** — and write the one-line reason.
5. `[haiku]` Assemble the internal flag: the flagged-anomaly set (each with class + tie-out),
   the verdict, and the as-of date — for the cockpit / Sterling. Report only aggregate figures;
   never disclose an individual rate (salary non-disclosure, audrey.md). A flagged duplicate /
   aberrant entry is raised for a human (and QBO) to resolve — never corrected here.

## Checkpoint — cockpit / Sterling loop

The cockpit / Sterling reads the flagged-anomaly set (each anomaly's class, tie-out, the gaps,
the verdict, the as-of date) and decides how to resolve. **Audrey raises the flags; resolving,
correcting, deleting, posting — and any QBO push — stays a human (and QBO) call (ADR-0123).**

**`auto` mode may self-approve ONLY:** auto-raising this **internal** flagged-anomaly set to
the cockpit / Sterling (internal, reversible — a flag can be dismissed). It may **never** post,
alter or delete an entry, fix a duplicate, or push to QBO — no such action exists here to
self-approve. A **Gap** verdict still raises (the gap is the point); nothing else is unlocked.

## Outputs

`anomalies.md` — the flagged-anomaly set (each with class, tie-out, signal source), the Gap
items, the sweep verdict + reason, and the as-of date. An internal, reversible
`operational`-class flag; never a post, an entry edit, a duplicate fix, or an invoice change.

## Audit

- [ ] Every confirmed anomaly carries its class and tie-out (baseline / expected, actual, deviation)
- [ ] Each figure labelled measured or derived; no gap filled by an estimate
- [ ] Sweep verdict (Clean / Anomalies flagged / Gap) + one-line reason stated, with as-of date
- [ ] No individual rate disclosed; no entry posted / deleted / corrected, no duplicate fixed, no QBO push (read-only)
