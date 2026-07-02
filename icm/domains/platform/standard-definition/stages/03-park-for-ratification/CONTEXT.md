# Stage 03 — park-for-ratification

**Job:** assemble the ratification packet and park it for Mark. No ratification, no scoring,
no persistence here.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Draft | `draft.md` (stage 02) | the draft version + diff + rationale | the thing Mark ratifies |
| Landscape | `landscape.md` (stage 01) | the fleet summary | the impact context for the ratify call |
| Authoring rules | `./skills/standard-authoring.md` | the ratify gate + versioning discipline | what the gate requires |

## Process

1. `[script]` Assemble the ratification packet: the draft (criteria + `version_number`), the
   explicit diff with flagged weakenings, the rationale, and a landscape impact sketch (which
   clients the diff would plausibly move between bands — labeled inference, not a verdict;
   the authoritative re-score is B5, #1472, after ratification).
2. `[script]` Park the packet for **Mark** (`always_gate` — the draft→ratified conditional
   UPDATE is the backend's Mark-gated act, BE #439; 0256 grants Vera no write). Vera never
   ratifies, never scores against the draft.
3. `[script]` Note the downstream chain for Mark: on ratify, the prior version supersedes and
   `standard-reevaluation` (B5, #1472) re-scores the fleet and reports the impact.

## Outputs

`ratification-packet.md` — the parked packet (draft + diff + rationale + impact sketch),
addressed to Mark. Nothing ratified, nothing persisted, nothing scored.

## Checkpoint — Mark ratify gate

The draft parks for **Mark's ratification** — `always_gate` at every rung; Vera never
ratifies her own draft (vera.md), and the ratify UPDATE executes in the backend (BE #439).
`auto` may self-approve nothing here: drafting-and-parking IS the terminal act; the packet
waits for Mark.

## Audit

- [ ] Packet complete (draft + explicit diff + rationale + impact sketch labeled inference)
- [ ] Parked for Mark — nothing ratified, persisted, or scored by Vera
- [ ] Downstream B5 re-evaluation chain noted for the ratify decision
