# Stage 02 — classify-route

**Job:** map the in-division unit to exactly one report, or flag a conflict when
two reports could own it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Receipt | stage 01 `receipt.md` | all | the confirmed unit, intent, constraints, authority, signals |

## Process

1. `[sonnet]` Map the intent to one report using the division seams: front-line
   ticket triage / resolution → **Felix**; monitoring / alerts / alert patterns →
   **Ozzie**; recurring-incident root cause / tier-3 → **Sage**; change / release
   governance / fallback → **Marshall**; technician scheduling / onsite dispatch →
   **Scout**; backups / recovery / DR readiness → **Phoenix**; project delivery / PM
   / onboarding-provisioning → **Pierce**.
2. `[script]` Apply the **most-restrictive authority bar**: if the unit turns on a
   production change, a destructive or identity action, or otherwise exceeds the
   asking human's authority, mark it park-for-Luke (those levers are always-gated at
   the report tier, never auto-routed past the human queue).
3. `[script]` Enforce **pool-never-bleed**: the route stays inside one client/owner
   RLS scope; no other client's or owner's data may surface (two-axis RLS).
4. `[sonnet]` If two reports could genuinely own the unit, mark it a **conflict** (do
   not guess) — it surfaces for arbitration rather than a single delegate.

## Outputs

`route.md` — the chosen report (single owner) **or** a conflict/park flag, the
one-line rationale tying intent → seam, the authority decision (route vs park-for-
Luke), and the RLS scope the delegation must stay within.

## Audit

- [ ] Exactly one report named, OR an explicit conflict/park — never a guessed owner
- [ ] Rationale ties the intent to a documented division seam
- [ ] Most-restrictive authority bar applied; production-change / destructive / identity action marked park-for-Luke
- [ ] Pool-never-bleed held; the RLS scope is stated
