# Stage 02 — resolve-owner

**Job:** resolve the captured hook to its owner via Client Mapping / contact dedupe —
and stop if the owner is an existing customer.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Capture | stage 01 output | all | the normalized hook to resolve |
| Contact kernel | `` `okf:contact` `` | candidate matches | dedupe the hook to an existing or new contact |
| Account kernel | `` `okf:account` `` | the matched contact's account | is this party an existing customer? |
| Social handle map | `` `okf:contact_social_identity` `` | DM/social-sourced hooks | resolve a social handle → contact |

## Process

1. `[script]` For a social/DM-sourced hook, resolve the handle → contact via
   `contact_social_identity`; otherwise key on the hook's email/identifier.
2. `[haiku]` **Client Mapping / contact dedupe:** match the hook against existing
   `contact` records; pick the existing contact or mark "new contact".
3. `[script]` Check the matched contact's `account`: if the party is an **existing
   customer**, this is **not a new lead** — **park** and route out (the 01-D customer
   rule; Celeste/Felix own the existing relationship). An **unresolved owner** → park.

## Outputs

`owner.md` — the resolved owner (existing `contact` id or "new contact" + the fields to
create), the dedupe decision, the existing-customer determination, and the cited
match basis + as-of.

## Audit

- [ ] Owner resolved to an existing `contact` or a clean "new contact" (dedupe ran)
- [ ] Existing-customer check ran against `account`; a customer match → parked (not a new lead)
- [ ] Unresolved owner → parked
- [ ] Match basis cited + as-of (A5)
