# Workflow: renewal-margin (finance v1)

**Job:** the Audrey side of the Chase renewal-reprice seam (#1415). Read the historical
margin (invoice + cost-allocation when built) and Chase's proposed renewal pricing →
compute proposed margin vs the floor vs historical → **flag if the proposed margin is
below floor or well below historical**, and supply that margin intel to Chase.
**Advise-only:** Audrey informs the decision; the block/approve stays a human call.

**Trigger:** a Chase renewal-reprice in progress — Chase hands Audrey the proposed renewal
pricing and asks for margin grounding. One run per renewal subject (account / agreement).

**What this is NOT:** no block, no approve, no posting, no money move, no QBO push, no send.
Audrey does **not** gate Chase — the renewal send-for-signature is already `always_gate` on
the Chase side and the block/approve is a human decision. Audrey lights up the margin; a
human (and Chase) acts. She reads invoice margin; cost-allocation views are unbuilt (#1044)
and she notes that gap rather than estimating into it.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | margin-context | Read the historical invoice margin + license facts; take in Chase's proposed renewal pricing (handoff) | — |
| 02 | flag-margin | Compute proposed vs floor vs historical; flag below-floor / well-below-historical (signal vs inference) | — |
| 03 | supply-chase | Park the margin intel + flag as a handoff back to Chase | **Chase / human loop** |

## Autonomy

Read-only; **tops out at L2** (Audrey has no higher rungs — no send, no money action, no
block). Default rung **L1** (draft the margin flag → park for review). At **L2**, the
internal **margin flag + intel auto-raises** to the cockpit and is parked for Chase
(reversible — a flag can be dismissed). No block, no approval, no posting, no money move at
any rung. **Advise-only** — the renewal block/approve is a human call (audrey.md "advises,
never blocks"; the renewal send-for-signature is already `always_gate`, Chase side, #1415).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `margin-rubric.md` (how to compute historical margin
from invoice [+ cost-allocation when built], the margin floor, the below-floor /
well-below-historical flag thresholds, the tie-out discipline, and the advise-only
discipline). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
