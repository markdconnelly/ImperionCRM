# Stage 03 — record-remediation-recommendation

**Job:** assemble the advisory remediation plan, surface it to the governance dashboard, and
route it to Celeste for client presentation. No actuation, no ticket, no write, no client
contact.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Plan | `plan.md` (stage 02) | the severity-ordered steps + data-gaps + band/target | the recommendation content |
| Gap | `gap.md` (stage 01) | the client + verdict by reference | the plan's identity |

## Process

1. `[script]` Assemble the advisory remediation plan: the client + verdict **by reference**,
   the severity-ordered steps (each: gap + target + recommended action, by reference,
   measured-vs-inferred labeled), the data-gaps-to-close list, and the band being closed with
   its labeled-inference target outcome. The plan carries **no "done" state** — it is a
   recommendation, not a tracked work order (`remediation-planning.md`).
2. `[script]` Auto-surface the plan to the governance dashboard (internal, reversible). At L2
   this raises without being asked.
3. `[script]` Route the plan to **Celeste** for client presentation — a recommendation to
   present, never a send, never a work order. Nothing here actuates a remediation, opens a
   ticket, touches a client tenant, contacts a client, or files into the A9 deviation queue
   (#1467 — internal agent-process deviations, not client posture).

## Outputs

`remediation-recommendation.md` — the advisory plan (client + verdict by reference,
severity-ordered steps, data-gaps, band/target), surfaced to the dashboard and routed to
Celeste.

## Checkpoint — Celeste seam

The plan parks on the **measure → present → remediate** seam: Vera measured the gap and
charted the way back; **Celeste presents it to the client; a human/Datto remediates** (the
MSSP boundary, vera.md). `auto` at L2 may self-approve the surfacing + the Celeste routing
(internal, reversible); the client presentation is Celeste's, and every remediation step is a
human's/Datto's to actuate — never Vera's. The gap's closure is confirmed by a future
snapshot + B2 re-score, never by this workflow.

## Audit

- [ ] Plan complete (client + verdict by reference, severity-ordered steps, data-gaps, band/target)
- [ ] Surfaced to the dashboard and routed to Celeste; no "done" state asserted
- [ ] Nothing actuated, ticketed, written, or client-contacted; nothing filed to the A9 queue
