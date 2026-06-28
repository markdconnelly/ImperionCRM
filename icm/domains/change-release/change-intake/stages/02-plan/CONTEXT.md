# Stage 02 — plan

**Job:** schedule the change, draft the rollback, draft the client comms.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Risk record | stage 01 `risk.md` | all | drives window + rollback rigour |
| CIs in scope | silver `device` · `okf:device` | the in-scope device(s) | rollback steps |
| Cloud CIs in scope | silver `cloud_asset` · `okf:cloud_asset` | the in-scope cloud resource(s) | rollback steps |
| Affected account | silver `account` · `okf:account` | the impacted account(s) | who the comms address |

## Process

1. `[sonnet]` Schedule the change into an appropriate maintenance window for its
   risk score and the affected account's profile.
2. `[sonnet]` Draft the rollback plan: the exact steps to undo the change, and a
   one-line confirmation it actually restores prior state. No workable rollback →
   flag as a finding (the package is not ready).
3. `[sonnet]` Draft the client comms (notice of the change/window) — a draft only;
   the send is gated and exits through ADR-0058.

## Outputs

`plan.md` — proposed window, rollback plan (+ undo confirmation or a no-rollback
finding), and the comms draft. Nothing is scheduled in a real calendar or sent
here — these are proposals.

## Audit

- [ ] Proposed window present and matched to the risk score
- [ ] Rollback plan present with an undo confirmation, OR a no-rollback finding raised
- [ ] Comms is a DRAFT only — no send occurred
