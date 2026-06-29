# Stage 01 — ingest

**Job:** normalize one inbound `lead_hook` — its source, UTM/campaign touch, and
consent state — each cited with its as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The lead hook | trigger payload | the one hook | the raw inbound to normalize |
| Raw capture | `` `okf:lead_hook` `` | the inbound hook | source · UTM · campaign touch · consent shape (meaning / authority) |
| Linked campaign | `` `okf:campaign` `` | the hook's campaign touch, if any | resolve the UTM/campaign to a real campaign |
| Consent state | `` `okf:consent_event` `` | this party | the consent basis the hook carries (no fabrication) |

## Process

1. `[script]` Parse the `lead_hook`: source type (Meta lead form | website form |
   DM-classified-lead | Apollo entry | Event Registration | gated content | list
   import), payload fields, the inbound timestamp.
2. `[script]` Extract the UTM / campaign touch and resolve it to a `campaign` id where
   present; capture the consent state carried by the hook (`consent_event` shape).
3. `[haiku]` Sanity-read the captured fields — **cite the source hook + as-of**. An
   **unparseable or empty** hook → **park** (never invent a source, a campaign, or a
   consent basis — A5).

## Outputs

`capture.md` — the normalized hook: source type, the UTM/campaign touch (resolved
`campaign` id or "none"), the consent state, the inbound timestamp, and the cited
source + as-of.

## Audit

- [ ] Source, UTM/campaign touch, and consent state each captured + cited with as-of (A5)
- [ ] Campaign touch resolved to a `campaign` id, or explicitly "none"
- [ ] Consent state taken from the hook, never fabricated
- [ ] Unparseable / empty hook → parked, not improvised
