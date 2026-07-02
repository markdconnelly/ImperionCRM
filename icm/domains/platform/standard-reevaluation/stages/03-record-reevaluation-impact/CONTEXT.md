# Stage 03 — record-reevaluation-impact

**Job:** assemble the ratification impact, surface the fleet impact to Mark, and route each
client's evaluation to Celeste. No write, no remediation, no client contact.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Re-score | `rescore.md` (stage 02) | per-client new verdicts + newly-non-compliant + fleet summary | the impact content |
| Ratification event | `ratification-event.md` (stage 01) | the new + superseded version ids | the impact's framing (which ratification) |

## Process

1. `[script]` Assemble the ratification impact: the new + superseded version ids, the fleet
   summary (count moved band, the **newly-non-compliant** list by reference), and per client
   the new-version verdict — each carrying the note that the change is **the standard's, not
   the client's** (B5's framing; client drift is B3). All by reference (version ids, snapshot
   id, criterion id) — never posture values.
2. `[script]` Surface the **fleet impact** to **Mark** (the ratification's blast radius across
   the fleet) and auto-surface the impact to the governance dashboard (internal, reversible).
   At L2 this raises without being asked.
3. `[script]` Route each client's evaluation to **Celeste** for client presentation — a
   recommendation to present, never a send. Nothing here re-scores in place beyond the run's
   verdicts, remediates, contacts a client, writes, or files into the A9 deviation queue
   (#1467 — internal agent-process deviations, not client posture).

## Outputs

`reevaluation-impact.md` — the ratification impact (version ids + fleet summary +
newly-non-compliant list + per-client new verdicts, all by reference), surfaced to the
dashboard + Mark and routed per client to Celeste.

## Checkpoint — Celeste/Mark loop

The impact parks on the **measure → present → remediate** seam: Vera re-measured the fleet
against the moved bar; **Celeste presents each client's picture; a human/Datto remediates**
(the MSSP boundary, vera.md). Mark sees the fleet-level blast radius of his ratification.
`auto` at L2 may self-approve the surfacing + the Celeste routing + the Mark fleet-impact
(internal, reversible); each verdict's persistence is BE #439's, and any remediation is a
human's/Datto's — never Vera's.

## Audit

- [ ] Impact complete (version ids + fleet summary + newly-non-compliant + per-client verdicts, by reference)
- [ ] Fleet impact surfaced to Mark; per-client evaluations routed to Celeste
- [ ] Newly-non-compliant framed as the standard moving, not client drift; nothing written/remediated/client-contacted; nothing filed to A9
