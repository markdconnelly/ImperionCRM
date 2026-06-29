# Stage 02 — resolve-partner

**Job:** resolve the registering partner unambiguously and draft an honest,
evidence-cited attribution of what the partner did.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Ground record | stage 01 `ground.md` | all | the resolved context |
| Partner | silver `partner` · `okf:partner` | the resolved partner row (tier/program/status) | confirm identity + tier |
| Registered deals | silver `partner_deal` · `okf:partner_deal` | this partner's prior deals on this account | attribution evidence |

## Process

1. `[script]` Confirm the partner resolved to exactly one `partner` row; pull its
   `tier`, `program`, `status`. Ambiguous or `unresolved` → audit fail (park for a
   human to disambiguate — never guess the partner).
2. `[haiku]` Gather the attribution signals: how the deal reached us (registration,
   referral, co-sell motion), what the partner contributed, citing the source +
   as-of from `ground.md` and `partner_deal`.
3. `[sonnet]` Draft the attribution in one short paragraph — what the partner
   *actually did*, never inflated. No fabricated capability or tier; if the
   contribution can't be grounded, say so and mark the attribution `needs-human`.

## Outputs

`attribution.md` — the confirmed partner id + tier/program/status, the drafted
attribution paragraph (cited), and an `attribution_confidence` flag
(`grounded` | `needs-human`).

## Audit

- [ ] Exactly one partner resolved (else park)
- [ ] Attribution cites its source + as-of; no inflated or fabricated contribution
- [ ] `attribution_confidence` is set (`grounded` or `needs-human`)
