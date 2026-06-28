# Stage 01 — ingest-findings

**Job:** ingest Vera's posture/risk handoff, resolve its client, and frame the relationship.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Handoff event | the triggering governance/posture handoff from Vera (BE-W7 #437 bus) | full payload (posture/risk findings, client id, entity refs) | the measured findings to curate |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Contacts | silver `contact` · `okf:contact` | contacts for this account | who the register is for / who advises |
| Strategic picture | silver `strategic_business_review` · `okf:strategic_business_review` | latest for this account | frame the findings in the standing relationship |

Note: the posture/risk findings themselves arrive **in Vera's handoff payload** (Vera
measures them, this workflow curates). This stage does not read a posture source directly —
it reads only the rooms above to resolve and frame the client.

## Process

1. `[script]` Read the handoff: the posture/risk findings Vera measured, the client id, and
   any entity refs. Missing a resolvable client id, or an empty findings set → audit fail
   (no subject to curate; never fabricate a risk).
2. `[script]` Resolve the client `account` and its contacts; pull the latest
   `strategic_business_review` to frame the standing relationship.
3. `[haiku]` One-line restatement of what Vera handed off (which posture/risk findings, about
   this client) — the seed for the assessment. Restate, do not re-measure.

## Outputs

`findings.md` — the resolved client id, the contacts, the standing strategic frame, the
verbatim findings list from Vera's handoff, and the one-line restatement.

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Vera's findings carried through verbatim (none invented, none dropped)
- [ ] One-line restatement present (not the raw payload)
