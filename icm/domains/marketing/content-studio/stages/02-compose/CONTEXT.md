# Stage 02 — compose

**Job:** author the content_asset for its type and audience, every claim substantiated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 01 output | the one asset | the objective, angle, audience, type, shape norm |
| Content types | `./skills/content-types.md` | the asset's type | the shape/length norm to compose to |
| Substantiation rules | `./skills/substantiation-rules.md` | all | cite-or-cut for every claim |

## Process

1. `[sonnet]` Compose the single `content_asset` per its `type`
   (blog/case_study/whitepaper/battlecard/one_pager/press_release/announcement) ×
   `audience` (prospect/seller/press) — on-brand, in voice, to the shape/length norm.
2. `[sonnet]` Substantiate per `substantiation-rules.md`: for each claim name its source
   (id/location) + as-of; **no source → cut the claim or soften to honest language.** No
   fabricated stat, testimonial, quote, capability, or result; a case-study claim must
   trace to a consented `reference`.
3. `[script]` Stage the draft via `content.write` — the INTERNAL silver write, reversible
   (L2, ADR-0128 A10 row 1). No publish, no send here.

## Outputs

`draft.md` — the drafted `content_asset` (type, audience, body to the shape norm) plus the
**substantiation refs** (each claim → its source id/location + as-of).

## Audit

- [ ] Composed to the right type × audience (matches the brief + `content-types.md`)
- [ ] Every claim carries a substantiation ref (id/location + as-of); none fabricated
- [ ] No fabricated stat, testimonial, quote, capability, or result (A5/cite-or-cut)
- [ ] Draft staged via `content.write` (internal, reversible); nothing published or sent
