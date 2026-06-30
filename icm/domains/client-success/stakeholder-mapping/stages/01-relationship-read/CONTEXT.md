# Stage 01 — relationship-read

**Job:** resolve the client `account` and read its contacts, recent interaction patterns, the
strategic frame, and the EXISTING stakeholder map. (💤 propose-only / dormant until the BE
executor + #1369/#1370 hydrate the signals, ADR-0123.)

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Account | silver `account` · `okf:account` | the triggering client | resolve + confirm the subject |
| Contacts | silver `contact` · `okf:contact` | contacts for this account | the people the map is over |
| Engagement patterns | silver `interaction` · `okf:interaction` | recent for this account | who communicates, who approves, who has gone silent / departed |
| Strategic frame | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | frame the map in the standing relationship |
| Existing map | silver `stakeholder` · `okf:stakeholder` | current rows for this account | the prior map to refresh (champion-departure is a delta against it) |

## Process

1. `[script]` Resolve the client `account`. A missing or unresolvable account → audit fail; the
   run parks with the reason (no subject to map; never fabricate a stakeholder).
2. `[script]` Pull this account's `contact`s, its recent `interaction` patterns, the latest
   `strategic_business_review`, and the **existing** `stakeholder` rows. Stay within THIS client
   (strict confidential boundary — never read across clients; celeste.md guardrail 5).
3. `[haiku]` One-line restatement of the trigger (periodic refresh, or which signal — new contact /
   sentiment shift / departure cue — prompted this run) as the seed for the assessment. Restate, do
   not classify here.

## Outputs

`relationship.md` — the resolved client id, the contact list, the recent interaction patterns
(communication / approval / silence-or-departure cues), the strategic frame, the EXISTING
stakeholder map, and the one-line trigger restatement. Unresolvable account → run ends parked.

## Audit

- [ ] Resolved client `account` id stated (not blank); unresolvable parks the run
- [ ] Only this client's data was read (no cross-client leakage)
- [ ] The EXISTING `stakeholder` map was loaded (the assessment refreshes it, not a blank slate)
- [ ] One-line trigger restatement present (not the raw payload)
- [ ] No role classified and nothing written here (read only)
