# Stage 03 — record-drift-finding

**Job:** assemble the advisory drift finding, surface it to the governance dashboard, and
route it to Celeste for client presentation; a critical drift also surfaces to Mark. No
re-score, no write, no remediation, no client contact.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Drift | `drift.md` (stage 02) | the drift signals + noise/gap notes + severity | the finding content |
| History | `history.md` (stage 01) | the compared verdict pair (ids) by reference | the finding's identity + the same-version pairing |

## Process

1. `[script]` Assemble the advisory drift finding: per drift signal, its kind (downgrade /
   band drop / new failure), the driving criteria and the compared verdict pair **by
   reference** (verdict ids + criterion ids), measured-vs-inferred labels, and the finding
   severity. A no-baseline run records "no comparison possible" and stops — nothing to route.
2. `[script]` Auto-surface the finding to the governance dashboard (internal, reversible). At
   L2 this raises without being asked.
3. `[script]` Route the finding to **Celeste** for client presentation — a recommendation to
   present, never a send. A **critical** drift is additionally surfaced to **Mark** alongside
   the Celeste routing. Nothing here re-scores (the ledger is append-only, 0256), remediates,
   contacts a client, or files into the A9 deviation queue (#1467 — that lane is internal
   agent-process deviations, not client posture).

## Outputs

`drift-finding.md` — the advisory drift finding (signals + driving criteria by reference +
measured-vs-inferred labels + severity), surfaced to the dashboard and routed to Celeste;
critical drift flagged to Mark.

## Checkpoint — Celeste/Mark loop

The finding parks on the **measure → present → remediate** seam: Vera measured the slide;
**Celeste presents to the client; a human/Datto remediates** (the MSSP boundary, vera.md).
`auto` at L2 may self-approve the surfacing + the Celeste routing (internal, reversible) and
the Mark surfacing on a critical drift; the client presentation itself is Celeste's, and any
remediation is always a human's/Datto's — never Vera's.

## Audit

- [ ] Finding complete (drift signals + driving criteria by reference + measured-vs-inferred + severity)
- [ ] Surfaced to the dashboard and routed to Celeste; critical drift flagged to Mark
- [ ] Nothing re-scored, written, remediated, or client-contacted; nothing filed to the A9 queue
