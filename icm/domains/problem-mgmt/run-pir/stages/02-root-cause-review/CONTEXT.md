# Stage 02 — root-cause-review

**Job:** reconstruct the timeline and confirm (or challenge) the recorded root cause.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| PIR base | stage 01 `pir-base.md` | all | the assembled review subject |
| Problem detail | silver `problem` · `okf:problem` | the resolved problem's recorded `root_cause` + status history | the cause to test |
| Incident detail | silver `ticket` · `okf:ticket` | the contributing incident, full detail | the symptom/resolution timeline |

## Process

1. `[sonnet]` Reconstruct the timeline: order the incident from first symptom →
   detection → workaround → resolution, against the problem's status advance
   (`open → investigating → known_error → resolved`).
2. `[sonnet]` Test the recorded `root_cause` against the timeline. Confirm it where
   the evidence supports it; where it does not, flag the gap and state what the
   evidence actually shows — a cause the evidence does not confirm is challenged, not
   rubber-stamped.

## Outputs

`root-cause-review.md` — the reconstructed timeline, the verdict on the recorded root
cause (`confirmed` | `challenged`), and, where challenged, the gap + what the evidence
shows. A challenged cause is carried forward as a finding, not silently overwritten.

## Audit

- [ ] Timeline reconstructed from first symptom to resolution
- [ ] Recorded root cause verdict stated (`confirmed` | `challenged`)
- [ ] A challenged cause states the evidence gap (not asserted as fact)
