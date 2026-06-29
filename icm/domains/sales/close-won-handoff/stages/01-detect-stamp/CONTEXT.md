# Stage 01 — detect-stamp

**Job:** detect the opportunity is `won` and stamp it closed-won (close date + attribution).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Won opportunity | silver `opportunity` · `` `okf:opportunity` `` | this opportunity's status + line-items + links | the won signal + the record to stamp; which source wins (KQM-authoritative) |
| Account | silver `account` · `` `okf:account` `` | the linked account | the deal's account context for attribution |

## Process

1. `[script]` Confirm the **won crossing**: `opportunity.status == won` (KQM `status==3`
   ⇔ `salesOrderId>0`), **citing the KQM status + as-of** (A5). KQM is the order SoR — the
   agent mirrors, never sets the status (A9a). Not grounded / ambiguous → audit fail (park,
   never stamp a speculative close).
2. `[script]` Idempotency check: if the opportunity is already stamped closed-won for this
   close, this run is a no-op replay (at most one close stamp per won opportunity).
3. `[opportunity.write]` Stamp **closed-won + close date + attribution** (won source, owning
   rep/account link) via the approval-gated executor — an internal, reversible CRM write
   (Chase's L2 auto-internal rung; never a direct silver write). **L2 self-approve** per the
   autonomy contract; otherwise parks. No customer is contacted.

## Outputs

`close.md` — the won-detection (KQM status + as-of), the closed-won stamp (close date +
attribution), and the resolved `opportunity_id` / `account_id`. The `opportunity.write` is
the only effect; no customer-facing side effect.

## Audit

- [ ] Won crossing confirmed and cited (KQM `status==3` ⇔ `salesOrderId>0`, + as-of)
- [ ] At most one close stamp touched for this opportunity (idempotent, no duplicate)
- [ ] Close date + attribution stamped; `opportunity_id` / `account_id` resolved (not blank)
- [ ] No customer-facing side effect emitted (internal stamp only)

## Checkpoint

A human approves the closed-won `opportunity.write` (the stamp + attribution).
**`auto` (L2) may self-approve** ONLY when the won-detection audit above is green — the
stamp is internal and reversible. Any customer-facing action, the provisioning itself, or
any audit failure parks for a human in every mode.
