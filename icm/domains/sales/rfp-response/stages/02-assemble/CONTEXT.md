# Stage 02 — assemble

**Job:** assemble the bid response — capability/approach + pricing (within the 02-C1 floor)
+ the Grace-supplied security/compliance section — into one complete, sourced draft.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Requirements | `requirements.md` (stage 01 output) | full | the grounded answers + gaps + `→ Grace` tags |
| Opportunity | the tied `opportunity` · `okf:opportunity` | this deal | the deal terms the bid prices against |
| Contact | silver `contact` · `okf:contact` | the bid's buying contact(s) | who the response is addressed to |
| Security/compliance content | Grace handoff (#1557, Stream 07) | the control/attestation section | Chase never authors security claims |
| Voice | `../../skills/voice-and-tone.md` | all | every sales draft sounds the same |
| RFP rules | `./skills/rfp-rules.md` | all | cite-or-refuse, the 02-C1 envelope, the Grace seam |

## Process

1. `[sonnet]` Assemble the **capability/approach** sections from the stage-01 grounded
   answers — every claim carries its cited source + as-of. A `gap`/`awaiting-evidence`
   section stays parked; it is **never filled with an invented capability** (A5b).
2. `[sonnet]` Assemble **pricing** within the **02-C1 rate-card floor**. A draft that
   **breaches the floor** (discount depth / non-standard term) is **routed to 02-C2 deal
   desk before submit** — flagged, not freelanced, never submitted on an unapproved breach.
3. `[script]` **SEAM → Grace (#1557):** take the security/compliance section as a handoff
   (control/attestation content, Stream 07) and assemble it into the response. **Chase
   authors no security claim** (A11). If the Grace content is **absent**, that section
   **parks** (refuse-precondition) — the bid does not proceed with a self-written security
   answer.
4. `[script]` Compose the full response; attach the source map (every claim → its
   citation + as-of) and the pricing-vs-floor / deal-desk flag.

## Outputs

`response-draft.md` — the assembled bid (capability/approach + pricing + the Grace security
section), the per-claim source map (source + as-of), the pricing-vs-02-C1 status (within
floor | breach → 02-C2), and any parked section. Nothing is submitted here.

## Audit

- [ ] Every asserted claim cites a source + as-of; no parked/gap section was fabricated
- [ ] The security/compliance section is Grace-supplied (#1557), not self-authored — or parked if absent
- [ ] Pricing is within the 02-C1 floor, OR the breach is flagged for 02-C2 (not freelanced)
- [ ] No PII / client-confidential data outside the addressed bid scope
