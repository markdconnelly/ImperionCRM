# Stage 02 — classify-route

**Job:** map the in-division unit to exactly one report, or flag a conflict when
two reports could own it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Receipt | stage 01 `receipt.md` | all | the confirmed unit, intent, constraints, authority, signals |

## Process

1. `[sonnet]` Map the intent to one report using the division seams: platform
   conformance / governance / data integrity / agent telemetry / contradiction →
   **Vera**; service quality / QA / ticket-quality audit / finished-experience
   judging → **Tess**; documentation / knowledge currency / IT Glue sync / doc-gap →
   **Alivia**.
2. `[script]` Apply the **most-restrictive authority bar**: if the unit turns on a
   correction, a governance change, a config edit, a control ratification, or
   otherwise exceeds the asking human's authority, mark it park-for-Mark (those
   levers are always-gated — the assurance line audits and recommends, it never
   actuates past the human queue).
3. `[script]` Enforce **pool-never-bleed**: the route stays inside one client/owner
   RLS scope; no other client's or owner's data may surface (two-axis RLS).
4. `[sonnet]` If two reports could genuinely own the unit, mark it a **conflict** (do
   not guess) — it surfaces for arbitration rather than a single delegate.

## Outputs

`route.md` — the chosen report (single owner) **or** a conflict/park flag, the
one-line rationale tying intent → seam, the authority decision (route vs park-for-
Mark), and the RLS scope the delegation must stay within.

## Audit

- [ ] Exactly one report named, OR an explicit conflict/park — never a guessed owner
- [ ] Rationale ties the intent to a documented division seam
- [ ] Most-restrictive authority bar applied; correction/governance/config/ratification marked park-for-Mark
- [ ] Pool-never-bleed held; the RLS scope is stated
