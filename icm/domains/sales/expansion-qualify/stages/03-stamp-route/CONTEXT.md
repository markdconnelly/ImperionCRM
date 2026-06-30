# Stage 03 — stamp-route  ·  CHECKPOINT

**Job:** apply the internal reversible qualification stamp, then route the
expansion — qualified into the pursuit motion, disqualified back to the
relationship owner. No customer-facing touch happens here.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Qualification | stage 02 `qualification.md` | all | the decision + carrying signals being approved |
| Grounding | stage 01 `ground.md` | expansion opp id, as-of | what the approver is deciding on |
| Expansion rules | `./skills/expansion-rules.md` | route-vs-park rule | where qualified vs disqualified goes |

## Checkpoint

The approval item shows: the decision (qualify/disqualify), the four signals
(signal-vs-inference), the rationale, and the expansion opp id + as-of. Approver
may edit the decision before approving; the approved decision is recorded.

**`auto` mode may self-execute ONLY** the INTERNAL reversible qualification stamp
(`opportunity.write`) at **L2** — no customer-facing effect, fully reversible,
stage-02 audit fully green. Routing and the handoff record are non-actuating.
**Every customer-facing touch routes to `pursue-opportunity` (02-A3) and
re-inherits its always_gate** — no pricing/discount/term assertion and no
send-for-signature ever happens here, dial-proof in every mode (ADR-0128, BO-02 §5;
Chase has no commitment send path, chase.md §6).

## Process

1. Park until human-approved — or, in `auto`, apply the stamp **only** if the L2
   internal-stamp gates hold (above).
2. `[opportunity.write]` Apply the INTERNAL reversible qualification stamp on the
   expansion opportunity (internal CRM write, no customer-facing effect). This is
   the only actuating write in the workflow.
3. `[script]` Route by decision:
   - **qualified** → hand the opportunity to `pursue-opportunity` (02-A3) as a
     **parked proposal** — the customer-facing motion is gated there, not here.
   - **disqualified** → park back to Client Success (the relationship owner) with
     the rationale.

## Outputs

`stamp-route.md` — the stamp result (internal write id), approver (human id or
`auto`), and the route taken (pursue-opportunity proposal | parked-to-Client-Success)
with the rationale. One routing outcome.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only for the internal L2 stamp)
- [ ] Only the internal reversible stamp written; no customer-facing touch sent here
- [ ] Exactly one route recorded (02-A3 proposal | parked-to-Client-Success)
