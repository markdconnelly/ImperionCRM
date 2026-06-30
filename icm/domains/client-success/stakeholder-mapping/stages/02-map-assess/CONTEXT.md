# Stage 02 — map-assess

**Job:** for each contact, assess role / influence / sentiment / relationship_status from MEASURED
signals — labeling measured signal vs inference, recording `source=derived`, and never asserting a
role without evidence. (💤 propose-only / dormant until the BE executor + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Relationship read | `relationship.md` (stage 01 output) | full | contacts + interaction patterns + existing map + strategic frame |
| Engagement patterns | silver `interaction` · `okf:interaction` | recent for this account | the measured signals to classify from (read-only) |
| Stakeholder rubric | `./skills/stakeholder-rubric.md` | all | how to classify role/influence/sentiment + the no-role-without-evidence rule + champion-departure |

## Process

1. `[sonnet]` For each contact, assess **role / influence / sentiment / relationship_status** per
   `stakeholder-rubric.md` from MEASURED signals (interaction frequency, approval patterns, sentiment,
   departure cues). For every assessment, **label measured signal vs your inference** and record
   `source=derived` (a human's prior `curated` value is not overwritten by a weaker derived read).
2. `[sonnet]` Apply the HARD RULE: **never assert a `detractor` — or any role — without evidence.** No
   measured basis → `unknown`, not a guess (celeste.md guardrail 3). Record the basis in an
   `evidence_note` (a basis note, e.g. "N inbound approvals over 90d" — **never** a quoted private
   message or PII value).
3. `[sonnet]` Detect **champion-departure**: a contact mapped `champion`/`economic_buyer` gone silent
   with a corroborating departure cue → propose `relationship_status=departed` (+ `departed_at`) and
   mark it a **churn-risk signal** for routing in stage 03. Silence without corroboration → lower
   `influence` / flag for watch, never assert `departed`. A new champion-like contact is noted as a
   successor.
4. `[script]` Record the per-contact assessment delta against the existing map (new / changed /
   unchanged / departed), each with its measured signal, `source`, and `evidence_note`. No write —
   assessment only.

## Outputs

`assessment.md` — per contact: proposed role · influence · sentiment · relationship_status · `source`
· `evidence_note`, with measured signal vs inference labeled and the delta against the existing map.
Champion-departures flagged as churn-risk signals. The ordered input to the proposed map.

## Audit

- [ ] Every assessment labels measured signal vs inference and records `source=derived`/`curated`
- [ ] No role asserted without evidence — unsupported reads are `unknown`, not guesses
- [ ] No `detractor` (or any role) asserted without a measured basis in its `evidence_note`
- [ ] `evidence_note` carries a basis note only — no quoted private content, no PII value
- [ ] Champion-departure detected only with a corroborating cue (silence alone never flips `departed`)
- [ ] Only this client's data was read (no cross-client leakage); nothing written here
