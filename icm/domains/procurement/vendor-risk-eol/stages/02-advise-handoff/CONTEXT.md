# Stage 02 — advise-handoff

**Job:** characterize the confirmed signal with its exposure quantified, pool-correlate it internally, and hand the advisory to Celeste.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Confirmed signal | `signal.md` (stage 01 output) | full | the cited, classified signal to characterize |
| Exposure per client | silver `license_assignment` · `okf:license_assignment` | entitlement counts on the affected vendor/SKU, per account | sizes each client's exposure for the internal correlation |
| Client spine | silver `account` · `okf:account` | accounts holding the affected vendor/SKU | who the advisory is ultimately about — Celeste's relationship map |
| Risk/EOL rubric | `./skills/risk-eol-rubric.md` | characterization fields + A7 rule + handoff shape | what a complete advisory carries, what stays internal |

## Process

1. `[automation]` Characterize the signal on the rubric's fields: class, vendor/SKU,
   evidence (cited + as-of, A5), exposure (entitlement count + dollars at stake), timeline
   (announced/effective dates), and the **catalog-anchored replacement posture** — options
   only from the product/service catalog; off-catalog is a catalog gap routed to a human,
   never an improvised SKU (room.md structural rule 2).
2. `[automation]` **Pool-correlate the exposure across the client base — INTERNALLY ONLY**
   (A7 pool-never-bleed): which accounts hold the affected vendor/SKU and at what scale.
   The aggregate view sharpens the advisory (one client's EOL is a data point; twelve is a
   fleet posture problem) — but **no client ever learns another's exposure**, and vendor
   pricing/terms never cross a client or tenant boundary (CS-08 via room.md; vance.md §6).
3. `[automation]` **SEAM → hand the advisory to Celeste** as a vCIO / client-relationship
   signal [→ Stream 08]: she owns the client-facing framing and the per-client
   conversation. **Never auto-actuate a vendor switch** (B9): no cancel, migration, or
   replacement buy from here — any commit the advisory motivates is the governed
   procurement sequence's (02-B2), behind its `always_gate` money gate (0184).

## Outputs

`advisory.md` — the characterized advisory (class, vendor/SKU, evidence cited + as-of,
exposure quantified, timeline, catalog-anchored replacement posture); the **internal-only**
cross-client correlation (accounts affected + scale, marked internal — never client-facing);
and the Celeste handoff record (what was handed, when). Terminal stage; ends handed to
Celeste, actuation parked.

## Audit

- [ ] Every characterization field populated and cited + as-of (A5), or its gap escalated — never estimated
- [ ] Cross-client correlation computed and marked INTERNAL ONLY (A7); no client-facing artifact carries another client's exposure or any cross-boundary vendor terms
- [ ] Replacement posture catalog-anchored; off-catalog routed to a human, not improvised
- [ ] Advisory handed to Celeste (seam recorded); no actuation / no money commitment emitted (no switch, cancel, migration, or buy — B9)

## Checkpoint

The Celeste-seam handoff loop: Celeste takes the advisory as a vCIO/client-relationship
signal (→ Stream 08) and owns the client conversation; any replacement buy or cancellation
executes only through the governed procurement sequence (02-B2, 0184). **`auto` (L2) may
self-approve characterizing the advisory and handing it to Celeste ONLY** — there is no
vendor action in this workflow's catalog at any rung (sentinel, not buyer — room.md;
vance.md §6).
