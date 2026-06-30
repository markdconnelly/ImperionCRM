# Stage 01 — read-posture

**Job:** read the client's MEASURED posture snapshot and frame the client relationship around it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture cue | the triggering `relationship.posture.*` event | client id + the review window | the subject |
| Posture finding | silver `posture_snapshot` · `okf:posture_snapshot` | this client's latest snapshot | the MEASURED finding (Secure Score + pillars + drift) — read audit-by-reference, no PII reproduction (#1689) |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Contacts | silver `contact` · `okf:contact` | the account's contacts | who the report is for (relationship voice) |
| Engagement | silver `interaction` · `okf:interaction` | recent history for this account | relationship context for framing |
| QBR substrate | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | the standing strategic picture to frame the review in |

> Celeste reads `posture_snapshot` **directly** (#1689) but the snapshot is the MEASURED
> artifact — Vera's segment of the measure→present→remediate seam owns the scoring. Celeste
> FRAMES the measured finding for the client; she never re-scores it (the MSSP/vCISO-advisory
> boundary, posture-reporting-rubric.md). `posture_snapshot` is `sec` data_class: read
> audit-by-reference — cite the snapshot by id/score, never reproduce per-asset PII.

## Process

1. `[script]` Read the client's latest `posture_snapshot` — the scored finding, the client
   id, and entity refs (by reference). Missing a resolvable client id or no snapshot → audit
   fail (nothing to present).
2. `[script]` Resolve the client `account` and pull its contacts, recent `interaction` history,
   and latest `strategic_business_review` for relationship framing. Stay within THIS client
   (strict confidential boundary — never read across clients).
3. `[haiku]` One-line restatement of the posture finding in plain relationship terms (what the
   snapshot says about this client's posture) — the seed for the report. Restate, do not
   re-score.

## Outputs

`posture-read.md` — the measured `posture_snapshot` (cited by id/score, audit-by-reference),
the resolved client id, the contacts + relationship context, and the one-line plain-terms
restatement.

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Posture finding captured from `posture_snapshot` as the measured source (not re-scored or invented)
- [ ] Posture read audit-by-reference — no per-asset PII reproduced (cited by id/score)
- [ ] Relationship context (contacts + QBR + recent engagement) pulled for THIS client only
- [ ] One-line plain-terms restatement present (not the raw snapshot)
