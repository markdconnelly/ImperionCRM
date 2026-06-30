# Stage 01 — ground

**Job:** assemble the grounded brief for one Content Asset — the brand rules, the brief,
the linked campaign, and recent performance — each cited with its as-of.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The content brief | trigger payload | the one asset | what we're writing, for whom, and why |
| Brand voice | `../../skills/brand-voice.md` | all | how we sound (domain-tier skill) |
| Content types | `./skills/content-types.md` | the asset's type | the type×audience matrix + shape/length norms |
| Brand rules | `` `okf:brand_asset` `` | the brand registry | read-only compliance rules to author against (D5) |
| Linked campaign | `` `okf:campaign` `` | the brief's campaign | objective, theme, the angle to serve |
| Recent performance | `` `okf:campaign_metric` ``/`` `okf:social_metric` `` | this audience, recent window | what content has landed lately |

## Process

1. `[script]` Resolve the brief: the `type` (blog/case_study/whitepaper/battlecard/
   one_pager/press_release/announcement), the `audience` (prospect/seller/press), and the
   linked `campaign` id (if any).
2. `[script]` Load the read-only `brand_asset` rules to author against. If the brand
   registry is **empty/missing → park** (A5) — never invent a voice or a brand claim.
3. `[haiku]` Read recent `campaign_metric` / `social_metric` for the audience; note what
   to lean into. A dormant/stale collector → flag stale, never present as live (A5c).
4. `[sonnet]` Write the brief: the objective, the angle, the audience, the key message,
   and the shape/length norm for the type — **cite each source + as-of**.

## Outputs

`brief.md` — the resolved type + audience, linked campaign id, the brand rules to honor,
the objective + angle + key message + shape norm, and the cited sources (each with as-of).

## Audit

- [ ] Each grounded fact cites a source + as-of (A5); none fabricated
- [ ] Brand rules (`brand_asset`) loaded and reflected in the brief
- [ ] Type × audience resolved against the matrix (`content-types.md`)
- [ ] Linked campaign resolved (or explicitly "none — standalone")
- [ ] Empty/missing brand registry → parked, not improvised (A5)
