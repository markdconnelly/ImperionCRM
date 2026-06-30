# Stage 02 — classify-route

**Job:** map the in-division unit to exactly one report, or flag a conflict when
two reports could own it.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Receipt | stage 01 `receipt.md` | all | the confirmed unit, intent, constraints, authority, signals |

## Process

1. `[sonnet]` Map the intent to one report using the division seams: threat
   detection / security alerts / incident containment → **Cyrus** (SOC); posture /
   control evidence / control-gaps / audit readiness / compliance → **Grace**
   (GRC); identity / access / joiner-mover-leaver / least-privilege → **Osiris**
   (identity).
2. `[script]` Apply the **most-restrictive authority bar**: if the unit turns on
   destructive or client-facing containment, an identity/access change, or
   otherwise exceeds the asking human's authority, mark it park-for-Mark (those
   levers are always-gated at the report tier, never auto-routed past the human
   queue — CS-02 IAM §5, CS-IR §5, ADR-0128).
3. `[script]` Enforce **pool-never-bleed**: the route stays inside one client/owner
   RLS scope; a security signal seen at one client may be cross-correlated
   internally but is never surfaced from one client to another (two-axis RLS).
4. `[sonnet]` If two reports could genuinely own the unit, mark it a **conflict** (do
   not guess) — it surfaces for arbitration rather than a single delegate. Unknown
   threat state stays "unconfirmed," never an assumed all-clear; fail toward suspicion.

## Outputs

`route.md` — the chosen report (single owner) **or** a conflict/park flag, the
one-line rationale tying intent → seam, the authority decision (route vs
park-for-Mark), and the RLS scope the delegation must stay within.

## Audit

- [ ] Exactly one report named, OR an explicit conflict/park — never a guessed owner
- [ ] Rationale ties the intent to a documented division seam
- [ ] Most-restrictive authority bar applied; destructive/client-facing containment or identity/access change marked park-for-Mark
- [ ] Pool-never-bleed held; the RLS scope is stated — no other client's security signal surfaced
