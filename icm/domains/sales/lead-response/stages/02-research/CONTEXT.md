# Stage 02 — research

**Job:** assemble what we already know about this lead into a dossier the
drafting stage can use without further lookups.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Triage record | stage 01 `triage.md` | all | who/what we're researching |
| Dossier data | silver/gold: `contact_enrichment`, `interaction` timeline, account history · `okf:contact` `okf:account` `okf:interaction` | matched contact/account only | prior relationship |
| Public form answers | the lead payload | message/answers text | what they actually asked |
| ICP | `../../skills/icp.md` | segment notes | angle selection |

## Process

1. `[haiku]` If dedupe matched an existing contact: pull prior interactions
   (last 5), open opportunities, any active services. New lead → company-level
   only (no fabrication; absence is information).
2. `[sonnet]` Summarize: who they are, what they asked, what we know, one
   suggested response angle tied to an `offer-catalog.md` entry id.
3. Strictly tenant-isolated reads; never enrich from another tenant's data.

## Outputs

`dossier.md` — ≤300 words + the suggested angle (offer id). Unknowns stated
as unknowns.

## Audit

- [ ] Every claim traceable to an input row or the lead payload (no invention)
- [ ] Exactly one suggested angle, referencing an offer id that exists
- [ ] No client PII beyond this lead/contact's own data
