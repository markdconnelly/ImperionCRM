# Stage 01 — ingest-gaps

**Job:** frame the client and restate the awareness-gap / posture finding Vera handed off.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Handoff event | the triggering `relationship.posture.*` / awareness-gap event (BE-W7 #437 bus) | full payload (source agent = Vera, finding, client id, entity refs) | the gap finding to act on |
| Client | silver `account` · `okf:account` | the referenced account | resolve + confirm the client |
| Referenced contact | silver `contact` · `okf:contact` | the contacts the finding cites, if any | who the awareness gap is about |

## Process

1. `[script]` Read the handoff: confirm it is Vera's posture / awareness-gap finding, and
   read the client id and any entity refs. The posture/awareness-gap finding arrives *in
   the handoff payload* — this workflow never measures posture itself (security measurement
   is Vera's seam, celeste.md). A missing resolvable client id → audit fail (no subject).
2. `[script]` Resolve the client `account` and note the cited `contact`(s), if any.
3. `[haiku]` One-line restatement of the awareness-gap / posture finding in plain terms
   (what security-awareness concern Vera flagged) — the seed for the assessment.

## Outputs

`handoff.md` — resolved client id, the cited contact refs, and the one-line restatement of
the awareness-gap / posture finding (Vera's, in plain terms — not the raw payload).

## Audit

- [ ] Resolved client `account` id stated (not blank)
- [ ] Finding confirmed as Vera's posture / awareness-gap handoff (not self-measured)
- [ ] One-line restatement of the finding present (not the raw payload)
