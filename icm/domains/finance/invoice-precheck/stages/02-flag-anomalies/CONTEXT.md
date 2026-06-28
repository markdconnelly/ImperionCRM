# Stage 02 — flag-anomalies

**Job:** cross-check the draft against its signals, find the anomalies, and raise
one pre-push flag — before the Mark-gated QBO push.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft + signals | stage 01 `draft-and-signals.md` | all | the figures to cross-check |
| Rubric | `../../skills/precheck-rubric.md` | all | the four anomaly classes + tie-out discipline |

> This stage cross-checks only the figures stage 01 already read; it grounds on no
> new silver entity, so it carries no `okf` marker (the entities were grounded in
> stage 01). Loading more here is a contract violation, not thoroughness.

## Process

1. `[script]` Math check (rubric class 4): for each line confirm
   `quantity × rate = line amount`, and that the line amounts sum to the draft
   total. Any mismatch is a math-error anomaly with its arithmetic.
2. `[sonnet]` Cross-check each line against its signals (rubric classes 1–3):
   hours vs. attested time, rate vs. contract rate, and any expected line absent
   from the draft. For each line emit `ties out` | `anomaly: <class>` |
   `cannot verify (gap)`.
3. `[sonnet]` For every anomaly, write the tie-out: inputs, expected, actual,
   delta (with direction), and the as-of date of each figure. Label the flag
   **measured** (both sides have a signal) or **derived** (one side inferred).
   **Never estimate a missing figure** to force a verdict — a line with a missing
   signal stays `cannot verify (gap)` and the gap is escalated, not guessed
   (audrey.md, precheck-rubric).
4. `[script]` Assemble the pre-push flag: per-line verdicts + the tie-out for each
   anomaly + an overall verdict (`clear to push` only if every line ties out;
   `hold — anomalies` if any anomaly; `hold — gaps` if any line cannot be
   verified). This is an **internal** flag — it informs the human's push decision;
   it never edits the draft and never pushes (ADR-0123 / ADR-0085).

## Outputs

`precheck-flag.md` — per-line verdicts, the tie-out arithmetic for each anomaly
(measured vs. derived labelled), the escalated data gaps, and one overall verdict.
Internal, reversible; addressed to the human who owns the Mark-gated QBO push.

## Audit

- [ ] Every draft line has exactly one verdict (`ties out` / `anomaly` / `gap`)
- [ ] Every anomaly shows its tie-out (inputs, expected, actual, delta, as-of)
- [ ] Every flag labelled measured or derived; no gap filled by an estimate
- [ ] Overall verdict is `clear`, `hold — anomalies`, or `hold — gaps`, consistent
      with the per-line verdicts
- [ ] No QBO push, no invoice edit, no entry posted — flag only (read-only ceiling)
- [ ] No per-person Pay Rate disclosed (salary non-disclosure, audrey.md)

## Checkpoint

A human reviews the flag and owns the Mark-gated QBO push decision (hold or push).
`auto` may self-approve ONLY the raising of this **internal** flag — and only when
every line's tie-out is fully **measured** and at least one anomaly is found
(reversible internal escalation, audrey.md L2 ceiling). Any `cannot verify (gap)`
line, or a draft that is otherwise clean, parks for a human in every mode. The QBO
push itself is external and Mark-gated — never self-approved, never in this
workflow's reach.
