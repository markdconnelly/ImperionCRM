# Stage 05 — sign-and-backsync

**Job:** the post-signature tail (Stream 02-A8). Runs ONLY after the human-authorized
send-for-signature (stage 04) returns a signature. On signature → update the agreement,
read the Autotask record back, and stamp the renewal outcome (`renewed | repriced`). If
the renewal is declined or lapses → stamp `churned` and emit the relationship Handoff to
Celeste. No customer-facing action originates here — this is an internal mirror.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Send result | `sent.md` (stage 04 output) | full | only a `sent` result enters this stage |
| Renewal opportunity | silver `opportunity` (`kind=renewal`) · `okf:opportunity` | the renewing opportunity | the record whose outcome is stamped |
| Account | silver `account` · `okf:account` | the renewing account | the relationship owner for the churn Handoff |

## Process

1. `[script]` Gate on stage 04: proceed ONLY if `sent.md` is `sent`. A `parked` /
   `rejected` result is terminal at stage 04 — never advance a non-signed renewal.
2. `[automation]` **On signature** (DocuSign/`esign` callback, ADR-0071 — **dormant**,
   A5c): update the agreement; `autotask-writeback` mirrors it (Autotask = contract SoR,
   the agent mirrors — A9a), **idempotency-keyed** (renewal + period) so a replay is a
   no-op (A9b). **Read the Autotask record back** before stamping (A9c).
3. `[opportunity.write]` Stamp the terminal outcome on the `opportunity` —
   `renewed | repriced` — an internal, reversible write (L2). On partial failure of the
   mirror → **halt, no auto-rollback**; surface completed-vs-pending (A10).
4. `[automation]` **If declined / lapsed** → stamp `churned`; emit the relationship
   **Handoff to Celeste** (the A11 seam → Stream 08, feeding churn scoring #1046). The
   handoff is a governed event, not a send — no customer-facing action.

## Outputs

`backsync.md` — the signed outcome (`renewed` / `repriced` / `churned`), the Autotask
read-back confirmation (or `pending` if the mirror is dormant), and — on churn — the
Celeste Handoff reference. Terminal stage.

## Audit

- [ ] Entered ONLY on a stage-04 `sent` result (no non-signed renewal advanced)
- [ ] The outcome stamp matches the read-back Autotask record (no mirror drift, A9c)
- [ ] The write is idempotency-keyed — a replay is a no-op, not a double-stamp (A9b)
- [ ] On a churn outcome, the Celeste Handoff was emitted (no dropped relationship seam)

## Checkpoint

None — this stage originates no customer-facing action. It is the internal post-signature
mirror (update agreement + outcome stamp + churn Handoff), which runs at **L2** only after
the human authorized the signature at stage 04. The dial-proof commitment ceiling was
already honored at the gate; nothing here re-opens it. **Substrate (A5c):** the e-sign
callback and Autotask write-back are dormant — this stage ships propose-only until they land.
