# Stage 03 — record-posture-verdict

**Job:** surface the verdict + evaluation to the governance dashboard and route it to Celeste
for client presentation. No write, no remediation, no client contact.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Evaluation | `evaluation.md` (stage 02) | verdicts + score + band + evaluation | the finding content |
| Scoring input | `scoring-input.md` (stage 01) | the (account, version, snapshot) triple by reference | the verdict's identity + idempotency key |

## Process

1. `[script]` Assemble the verdict record: the (account, standard version, snapshot) triple
   by reference, `overall_score`, `conformance_status`, the per-criterion verdicts, and the
   get-back-in-shape evaluation. This is the exact shape the backend persists — an
   idempotent INSERT into `posture_score` where the 0256 UNIQUE is the arbiter (BE #439);
   Vera hands over the evaluation, she never writes the row.
2. `[script]` Auto-surface the verdict + evaluation to the governance dashboard (internal,
   reversible). At L2 this raises without being asked.
3. `[script]` Route the evaluation to **Celeste** for client presentation — a recommendation
   to present, never a send. A `critical` band is flagged for Mark's visibility alongside
   the Celeste routing. Nothing here remediates, contacts a client, or files into the A9
   deviation queue (#1467 — that lane is internal agent-process deviations, not client
   posture).

## Outputs

`verdict.md` — the verdict record (triple by reference + score + band + evaluation),
surfaced to the dashboard and routed to Celeste; critical bands flagged to Mark.

## Checkpoint — Celeste seam

The evaluation parks on the **measure → present → remediate** seam: Vera measured; **Celeste
presents to the client; a human/Datto remediates** (the MSSP boundary, vera.md). `auto` at
L2 may self-approve the surfacing + the Celeste routing (internal, reversible); the client
presentation itself is Celeste's, the persistence is BE #439's, and any remediation is
always a human's/Datto's.

## Audit

- [ ] Verdict record complete (triple by reference + score + band + evaluation)
- [ ] Surfaced to the dashboard and routed to Celeste; critical flagged to Mark
- [ ] Nothing written, remediated, or client-contacted; nothing filed to the A9 queue
