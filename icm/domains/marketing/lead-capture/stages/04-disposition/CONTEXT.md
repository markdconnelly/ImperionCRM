# Stage 04 — disposition

**Job:** disposition the captured, attributed lead — enqueue it for scoring, or, if the
source already implies MQL-grade fit, emit the threshold-crossing score that routes to
Chase (the A11 seam).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Capture | stage 01 output | all | source/intent that may already imply MQL-grade fit |
| Owner | stage 02 output | all | the resolved contact to disposition |
| Attribution | stage 03 output | all | the stamped touch the disposition carries |
| Score fact | `` `okf:lead_score` `` | this contact | where the score is read/written; the MQL threshold |

## Process

1. `[haiku]` Read the source/intent: does the hook (e.g. a high-intent Meta lead form,
   a qualified Apollo entry) already imply **MQL-grade** fit, or does it need scoring first?
2. `[script]` **Default path** — enqueue the lead for scoring (→ lead-scoring / 01-G):
   an internal, reversible write (L2). Scoring owns the threshold evaluation.
3. `[script]` **Seam path** — if the source already implies MQL-grade fit, **emit the
   threshold-crossing `lead_score`** that routes the lead to Chase (→ lead-response /
   Stream 02). **This is an explicit step, not a co-owned handoff: Chase owns qualify,
   Belle owns capture (A11)** — the crossing is a deterministic route, not an external
   actuation. Idempotent on the hook/contact so a replay does not double-route (A9b).

## Outputs

`disposition.md` — the disposition decision (enqueued-for-scoring | MQL-grade →
Chase), the score reference, and the cited basis + as-of.

## Audit

- [ ] Disposition is one of: enqueued-for-scoring | MQL-grade → Chase (the A11 seam)
- [ ] MQL-grade routing taken only when the source/intent justifies it, cited + as-of (A5)
- [ ] All writes internal + reversible (L2); no external send occurs in this workflow
- [ ] Disposition idempotent on the hook/contact (a replay does not double-route, A9b)
