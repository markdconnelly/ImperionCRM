# Stage 02 — classify-route

**Job:** map the in-division unit to exactly one report, or flag a conflict when
two reports could own it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Receipt | stage 01 `receipt.md` | all | the confirmed unit, intent, constraints, authority, signals |

## Process

1. `[sonnet]` Map the intent to one report using the division seams: people / HR /
   employee lifecycle / onboarding / PTO / offboarding → **Holly**; contracts /
   legal / NDA / contract & renewal legal review → **Laurel**.
2. `[script]` Apply the **most-restrictive authority bar**: if the unit turns on a
   binding commitment — a signed contract, an employment or comp decision — or
   otherwise exceeds the asking human's authority, mark it park-for-Derek (those
   levers are always-gated at the report tier, never auto-routed past the human
   queue).
3. `[script]` Enforce **pool-never-bleed**: the route stays inside one client/owner
   RLS scope; no other client's or owner's data may surface, and salary/comp/personal
   data never travels (two-axis RLS).
4. `[sonnet]` If two reports could genuinely own the unit, mark it a **conflict** (do
   not guess) — it surfaces for arbitration rather than a single delegate.

## Outputs

`route.md` — the chosen report (single owner) **or** a conflict/park flag, the
one-line rationale tying intent → seam, the authority decision (route vs park-for-
Derek), and the RLS scope the delegation must stay within.

## Audit

- [ ] Exactly one report named, OR an explicit conflict/park — never a guessed owner
- [ ] Rationale ties the intent to a documented division seam
- [ ] Most-restrictive authority bar applied; a binding contract / employment / comp decision marked park-for-Derek
- [ ] Pool-never-bleed held; the RLS scope is stated; no salary/comp/personal data surfaced
