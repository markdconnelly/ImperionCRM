# Stage 01 — ingest-posture

**Job:** ingest Vera's posture-findings handoff and frame the client relationship around it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture handoff | the triggering `relationship.posture.*` event from Vera (BE-W7 #437 bus) | full payload (Vera's scored findings, client id, entity refs) | the posture findings (measured by Vera, never read by Celeste directly) |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Contacts | silver `contact` · `okf:contact` | the account's contacts | who the report is for (relationship voice) |
| Engagement | silver `interaction` · `okf:interaction` | recent history for this account | relationship context for framing |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the standing strategic picture to frame the review in |

> The posture findings arrive **only** as Vera's handoff payload. Celeste does not read the
> Security-domain posture substrate and does not re-score it — measurement is Vera's segment of
> the measure→present→remediate seam (posture-reporting-rubric.md).

## Process

1. `[script]` Read the handoff: Vera's scored posture findings, the client id, and any entity
   refs. Missing a resolvable client id or empty findings → audit fail (nothing to present).
2. `[script]` Resolve the client `account` and pull its contacts, recent `interaction` history,
   and latest `strategic_business_review` for relationship framing. Stay within THIS client
   (strict confidential boundary — never read across clients).
3. `[haiku]` One-line restatement of the posture findings in plain relationship terms (what
   Vera observed about this client's posture) — the seed for the report. Restate, do not
   re-score.

## Outputs

`handoff.md` — Vera's scored posture findings (cited as hers), the resolved client id, the
contacts + relationship context, and the one-line plain-terms restatement.

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Vera's posture findings captured as the measured source (not re-scored or invented)
- [ ] Relationship context (contacts + QBR + recent engagement) pulled for THIS client only
- [ ] One-line plain-terms restatement present (not the raw payload)
