# Stage 03 — flag-or-stamp  ·  CHECKPOINT

**Job:** draft the hygiene digest from the triaged findings (L1), and — only at
L2, once admin-flipped — apply the internal reversible data-quality stamp; never
do anything customer-facing here.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Triage | stage 02 `triage.md` | all | the classified, dispositioned findings |
| Scan | stage 01 `scan.md` | opportunity ids, current field values | the values a stamp corrects |
| Voice | `../../../skills/voice-and-tone.md` | all | the digest's register (domain-tier skill) |
| Hygiene rules | `./skills/hygiene-rules.md` | all | route-vs-stamp rule · stampable internal fields |
| Opportunities | silver `opportunity` · `okf:opportunity` | the stamp candidates only | the record a stamp writes to (reversible internal field) |

## Checkpoint

The approval item shows: the hygiene digest (findings by type with priorities),
the list of stamp candidates with the exact internal field + value each would set,
and the route candidates being handed to stage 04. Approver may edit the digest
and the stamp list before approving.

**`auto` mode may self-approve ONLY** the internal reversible data-quality stamp
via `opportunity.write` (`./skills/hygiene-rules.md`) at **L2** — disposition =
stamp candidate, an unambiguous internal field, no customer-facing effect, stage-02
audit fully green. **No customer-facing follow-up is composed or sent here** — it
is routed to `pursue-opportunity` (02-A3) by stage 04 and re-inherits that
workflow's always_gate. **Any pricing/discount/term assertion or send-for-signature
always parks** — Chase has no commitment send path (chase.md §6, BO-02 §5).

## Process

1. `[sonnet]` Draft the hygiene digest: findings grouped by type, prioritized,
   voice-compliant. State unknowns as unknowns; no fabricated finding.
2. Park until human-approved — or auto-approve the stamp set **only** if all stamp
   gates hold (above).
3. `[opportunity.write]` For each approved stamp candidate, set the unambiguous
   internal field on the opportunity — **internal, reversible, no customer-facing
   effect**. Never write a customer-facing field, a price/discount/term, or a
   send. Each write is idempotency-keyed (opportunity + field) so a replay is a
   no-op.
4. `[haiku]` Capture the stamp set applied (opportunity id, field, value,
   approver: human id or `auto`) and the route candidates passed forward.

## Outputs

`flag-or-stamp.md` — the approved hygiene digest, the applied internal stamps
(opportunity id, field, prior→new value, approver), and the route candidates for
stage 04. Rejection ends the run with the rejection reason captured.

## Audit

- [ ] Approver identity recorded (never blank; `auto` only for an internal stamp with all gates held)
- [ ] No customer-facing touch sent or composed here (routing only; always-gate enforced)
- [ ] No pricing/term field or customer-facing field written by `opportunity.write`
- [ ] Each stamp internal + reversible + idempotency-keyed; digest grounded, no fabrication
