# Stage 01 — read-queue

**Job:** read the open/unassigned ticket queue and the current technician
assignments as a snapshot.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Open dispatch queue | silver `ticket` · `okf:ticket` | open + unassigned onsite-eligible tickets, with priority + age | the queue to rebalance |
| Current assignments | silver `ticket` · `okf:ticket` | tickets already assigned to a technician | the current load per technician |
| Account site | silver `account` · `okf:account` | the account's site/location per queued ticket | proximity context for later proposals |

## Process

1. `[script]` Read the open/unassigned queue and the currently-assigned tickets;
   capture per ticket its priority, age, and (if assigned) its technician.
   Resolve each ticket's account site. Never write here.
2. `[script]` Assemble the snapshot: the open queue, the per-technician current
   load, and the site context. Deterministic — no interpretation at this stage.

## Outputs

`queue-snapshot.md` — the open/unassigned tickets (priority + age), the
per-technician current load, and the site context. No analysis and no write.

## Audit

- [ ] Open/unassigned queue captured with priority + age per ticket
- [ ] Current per-technician load captured
- [ ] Read-only — no assignment, note, or send occurred
