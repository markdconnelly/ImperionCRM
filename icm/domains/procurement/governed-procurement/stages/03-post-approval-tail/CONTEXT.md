# Stage 03 — post-approval-tail

**Job:** document + verify the backend-executed operational tail (Stream 02-B2 steps
3–5). Runs ONLY after the stage-02 human approval; the backend executor actuates
`m365_provision_license` → `agreement_attach` → `bill_attach` at L3 — this stage reads
its run state and verifies the mirrors, it never emits the calls.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gate record | `gate-record.md` (stage 02 output) | full | only an `approved` record enters this stage |
| Executor run state | the backend 0184 sequence run ledger via `pg.read` | this run's sequence | per-step state (placed / provisioned / attached / billed), keys, and errors |
| Pax8 state | bronze `pax8_*` (read-only) | this order + subscription | the Pax8 read-back — order placed, subscription live (A9c; Pax8 is SoR, A9a) |
| Provisioned license | silver `license_assignment` · `okf:license_assignment` | the provisioned entitlement | verify the M365 provision landed in the mirrored license record |
| Agreement | silver `contract` · `okf:contract` | the subject's agreement | verify `agreement_attach` bound the purchase to the right agreement |
| Bill | silver `invoice` · `okf:invoice` | the attached bill | verify `bill_attach` — the billing consequence of the approved purchase |
| Gate rules | `./skills/money-gate-rules.md` | halt-no-rollback + approve-once | how partial failure is surfaced; why nothing is re-prompted |

## Process

1. `[script]` Gate on stage 02: proceed ONLY on an `approved` gate record. A `rejected` /
   `parked` record is terminal at stage 02 — never advance an unapproved buy.
2. `[automation]` The **backend executor** (0184, postured `withheld` v1 — **dormant**,
   A5c) runs `m365_provision_license` → `agreement_attach` → `bill_attach` at L3
   post-approval — each step **idempotency-keyed** so a replay is a no-op + audit note
   (A9b), each **read back** from Pax8/M365 before close (A9c). Approve-once holds: no
   mechanical step is re-prompted to the human (vance.md §6). This stage READS that run
   state; the actuation is the backend's.
3. `[script]` Verify the mirrors, each cited + as-of (A5): the placed order and live
   subscription against the bronze `pax8_*` read-back; the provisioned entitlement
   against `license_assignment`; the attach against `contract`; the bill against
   `invoice`. The bill is the **billing consequence** of the approved purchase
   [→ **SEAM** Audrey, Stream 09] (A11 — Vance verifies it exists; the money clock is
   Audrey's).
4. `[script]` On partial failure: **HALT — no auto-rollback** (A10/B6). Surface
   **completed-vs-pending** per step, plainly; a re-run is idempotent from the top
   (A9b makes a replay converge — no double-buy, no double-bill). Never improvise a
   compensating action.

## Outputs

`fulfillment.md` — per-step state (placed / provisioned / attached / billed), each
read-back confirmation cited + as-of (or `pending` while the substrate is dormant),
completed-vs-pending on any partial failure, and the Audrey Stream-09 seam reference.
Terminal stage; procurement fulfilled.

## Audit

- [ ] Entered ONLY on an `approved` gate record; no mechanical step re-prompted to a human (approve-once, 0184)
- [ ] Every completed step verified by read-back from Pax8/M365 mirrors (A9c), cited with source + as-of (A5)
- [ ] Replays confirmed idempotent — keyed no-op + audit note, never a double actuation (A9b)
- [ ] Partial failure HALTED with completed-vs-pending surfaced; nothing auto-rolled-back (A10/B6)
- [ ] No money actuation emitted from ICM — the backend executor acted; this stage documented

## Checkpoint

None — this stage originates no actuation. It is the documented, verified tail of a
purchase a human already approved at stage 02; the dial-proof money ceiling was honored
at the gate and nothing here re-opens it. It runs at **L3** (the one Vance L3, vance.md
§1) only downstream of that ONE approval. **Substrate (A5c):** 0184 is postured
`withheld` v1 and Pax8-bronze / Autotask write-back / trigger-sync #119 are dormant —
this stage ships propose-only until they land.
