# Stage 03 — corrective-actions

**Job:** name the contributing factors and derive corrective/preventive actions.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Root-cause review | stage 02 `root-cause-review.md` | all | the confirmed/challenged cause + timeline |
| PIR base | stage 01 `pir-base.md` | all | the known_error workaround/permanent_fix + affected CIs/account |
| Known_error detail | silver `known_error` · `okf:known_error` | the linked known_error (workaround + permanent_fix) | what the durable fix currently says |

## Process

1. `[sonnet]` Name the contributing factors: what let the incident happen, what
   delayed detection, what made the workaround necessary. Distinguish the root cause
   from the conditions that amplified it.
2. `[sonnet]` Derive the actions — **corrective** (stop the cause recurring) and
   **preventive** (catch the next one earlier). Tie each to a contributing factor or
   the root cause; an action with no factor behind it is dropped.
3. `[script]` Classify each action's blast radius: `reversible-no-prod` vs
   `production-or-irreversible` (drives the stage-04 propose/park routing).

## Outputs

`corrective-actions.md` — the contributing factors, the corrective and preventive
actions (each tied to a factor/cause), and each action's blast-radius classification.

## Audit

- [ ] Contributing factors named and distinguished from the root cause
- [ ] Each corrective/preventive action tied to a factor or the root cause
- [ ] Every action classified (`reversible-no-prod` | `production-or-irreversible`)
