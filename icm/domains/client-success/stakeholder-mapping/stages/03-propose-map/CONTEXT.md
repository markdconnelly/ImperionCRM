# Stage 03 — propose-map  ·  CHECKPOINT

**Job:** produce the PROPOSED stakeholder-map update as a parked draft for the backend executor to
persist, and route champion-departure to 08-D — propose-only, nothing is written here. (💤
propose-only / dormant until the BE stakeholder-mapping executor + #1369/#1370, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Assessment | `assessment.md` (stage 02 output) | full | the per-contact assessed map delta + churn-risk flags |
| Stakeholder rubric | `./skills/stakeholder-rubric.md` | all | the propose-only posture + champion-departure routing + confidentiality |

## Process

1. `[sonnet]` Build the **PROPOSED** stakeholder-map update — one entry per contact: `account_id` ·
   `contact_id` · role · influence · sentiment · relationship_status · `source=derived` ·
   `evidence_note` · `as_of` (+ `departed_at` where departed). Carry the measured-signal-vs-inference
   label through to every entry (celeste.md guardrail 3); a `curated` human value is preserved, not
   overwritten by a weaker derived read.
2. `[sonnet]` For each **champion-departure**, emit a **churn-risk signal routed to 08-D**
   health-intervention (the champion left = the leading churn signal). Note the map's feeds for the
   downstream workflows: 08-A client-360 (the map is part of the whole picture), 08-C QBR targeting
   (route the QBR to the right stakeholder), and advocacy/reference targeting (#1692 — a `champion` is
   a reference candidate). This stage **routes** those signals; it does not act on them.
3. `[script]` Mark the disposition: the proposed map is a **parked** artifact for the backend
   **stakeholder-mapping executor** to persist (approval-gated, server-side, never a direct silver
   write — propose-only). **Nothing is written here.** Terminal stage; the run ends parked.

## Outputs

`proposed-map.md` — the proposed `stakeholder` update (each entry: account · contact · role ·
influence · sentiment · relationship_status · `source` · `evidence_note` · `as_of`/`departed_at`),
the champion-departure churn-risk signals routed to 08-D, and the map's feeds to 08-A / 08-C / #1692.
Marked **parked** for human approval, then the backend executor. Terminal stage.

## Checkpoint

The Teams loop: a human co-shapes and approves the proposed stakeholder map before the backend
executor persists it. **`auto` (L2) may self-approve the PROPOSED map draft ONLY** (internal,
reversible, signal-labeled — `source=derived` vs `curated`). **No silver write happens here in any
mode** — the write is the backend stakeholder-mapping executor's (propose-only, backend-owed). **No
role is ever asserted without evidence**, and champion-departure is routed (to 08-D), not acted on.
NO-COMMITS-EVER and the signal-vs-inference discipline are dial-proof (celeste.md guardrails 1, 3).

## Audit

- [ ] Every proposed entry labels measured signal vs inference and records `source`
- [ ] No role asserted without evidence; a `curated` human value is preserved, not overwritten
- [ ] The map is **parked** for the backend executor — NO silver write emitted from this workflow
- [ ] Champion-departure routed to 08-D as a churn-risk signal (routed, not acted on)
- [ ] Map feeds noted to 08-A / 08-C / advocacy #1692; no client-facing send emitted
- [ ] Only this client's stakeholders appear (no cross-client leakage); no PII value surfaced
