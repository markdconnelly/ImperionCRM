# Compliance-exposure rubric (Mark-editable — exposure classes + severity ladder + risk-over-cost)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `under-licensing-flag`: what
> an under-licensing exposure is, how severity is classed, and the hard rule that risk
> beats cost-cutting. Mark: edit freely; stages cite this, nothing restates it.

## What an exposure is

An **under-licensing / license-compliance exposure** exists when the entitlements actually
held (per `license_assignment`, as of a stated date) fall short of what the **service
catalog (#1306, versioned)** says the delivered service must carry. The catalog is the
baseline; the comparison is only as good as the catalog version cited — every exposure
names the version + as-of (A5).

## Exposure classes

| Class | Definition |
|---|---|
| **Quantity shortfall** | fewer seats/units entitled than the catalog requires for the delivered head-count/scope (e.g. 40 users on a service the catalog licenses per-user, 32 seats held) |
| **Tier shortfall** | a lower edition/plan than the catalog requires (the feature the service depends on is not in the held tier) |
| **Missing entitlement** | a catalog-required product with no entitlement at all |
| **Terms mismatch** | usage outside the license's permitted terms (e.g. a per-device license consumed per-user) |

NOT an exposure: a service the catalog does not cover (a **catalog gap** — route it to a
human as a catalog issue, per the catalog-anchored rule, room.md); a stale or missing
entitlement read (a **data gap** — park it, A5). Neither is ever guessed into a pass or a
fail.

## Severity ladder

- **S1 — critical:** missing entitlement or terms mismatch on a client-delivered,
  vendor-auditable product; audit or service-interruption risk is live. Urgency: raise
  immediately (A6 computes high).
- **S2 — high:** quantity/tier shortfall on a client-delivered service; the client is
  receiving something the license does not cover.
- **S3 — moderate:** shortfall on an internal (Imperion-self) service; exposure is real
  but the blast radius is internal.
- **S4 — low:** technical mismatch with a documented compensating state (e.g. a true-up
  already staged at 02-B2 and awaiting its gate). Flag, tag the pending remediation,
  don't re-escalate.

Severity is judged on evidence in hand; when the class is clear but the scale is not
(e.g. head-count unknown), classify at the class's floor and note the gap — never inflate
or deflate on a guess.

## The risk-over-cost rule (hard)

**An exposure beats a saving, every time** (vance.md §3).

- Never quietly pick, recommend, or leave in place a cheaper under-licensed configuration.
  Where one exists, it is named in the flag and **explicitly rejected**, with the exposure
  it would carry.
- Cost-cutting recommendations belong to the right-sizing and shelfware procedures
  (02-B5/02-B3) and only ever operate ABOVE the catalog baseline — never below it.
- The remediation buy that closes an exposure is a money commitment: `always_gate`
  forever (ADR-0109, migration 0184), decided by a human at the governed-procurement
  money gate (02-B2). The flag states the direction; it never commits the dollars.

## Discipline

- **Cite + as-of + catalog version on every exposure** (A5); an exposure judged against an
  unstated catalog version is an audit fail.
- **Pool stays internal** (A7): cross-client exposure patterns inform the sweep but never
  appear in a client-visible artifact; vendor pricing/terms never cross a client or tenant
  boundary (CS-08 §5, room.md).
- **No PII, no row-level values committed.** Report by account/service/SKU (business
  identifiers); query the live read-only DB for actuals. Synthetic example shape:
  "Client B — catalog v12 requires per-user SKU-Y for Managed Desktop (40 users, as-of
  2026-07-01); 32 entitled → S2 quantity shortfall of 8; remediation direction: true-up 8
  @ gate 02-B2; cheaper path (stay at 32) rejected — exposure beats saving."
