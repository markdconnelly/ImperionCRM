# Stage 02 — create-document

**Job:** write and document the internal `opportunity` record for the qualified lead.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Qualification | `qualification.md` (stage 01 output) | full | the SQL verdict + linked ids + logic |
| Opportunity shape | silver `opportunity` · `okf:opportunity` | the record's fields + which source wins | write the right shape, no duplicate |

## Process

1. `[script]` Guard: proceed only if stage 01 verdict is `sql`. Anything else → park
   (never reachable on a clean run, but fail-closed).
2. `[script]` Idempotency check: look up an existing open `opportunity` for this lead /
   `contact_id`+`account_id`. Found → this is an UPDATE, not a create (at most one
   opportunity per qualifying lead).
3. `[sonnet]` Assemble the record: stage (`new` / first pipeline stage), amount **only if
   grounded** (else leave unset — never invent a number, Chase's guardrail), source, the
   `contact`/`account` link, and a documentation note carrying the stage-01 qualification
   rationale.
4. `[opportunity.write]` Create or update the `opportunity` via the approval-gated executor
   (internal, reversible; never a direct silver write). **L2 self-approve** per the autonomy
   contract; otherwise parks.

## Outputs

`opportunity.md` — the created/updated opportunity (id, stage, amount-if-known, links) +
the documentation note. The `opportunity.write` is the only external effect; no customer is
contacted.

## Audit

- [ ] Stage 01 verdict was `sql` (else parked)
- [ ] At most one opportunity touched for this lead (create XOR update, idempotent)
- [ ] Amount is either grounded or unset — never an invented figure
- [ ] No customer-facing side effect emitted (this stage writes the internal record only)

## Checkpoint

A human approves the `opportunity.write` (the created/updated record + documentation note).
**`auto` (L2) may self-approve** ONLY when stage 01's audit is green and the verdict is
`sql` — the write is internal and reversible. Any pricing, quote, customer-facing action, or
audit failure parks for a human in every mode.
