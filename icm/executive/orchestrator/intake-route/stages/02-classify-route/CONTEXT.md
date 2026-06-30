# Stage 02 — classify-route

**Job:** classify the grounded intent and select exactly one owner — the division
or worker whose domain owns the request — or flag a conflict when ownership is
ambiguous or spans divisions.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Intake record | stage 01 `intake.md` | all | the grounded intent, entities, constraints, authority |
| Org tree | `../../../org.yaml` (read as routing reference) | divisions + their domains | who owns what |

## Process

1. `[sonnet]` Classify the intent to its owning division: Rachel (G&A) · Dexter
   (Delivery & Eng) · Roman (Security) · Sterling (Revenue/Client/Finance) · Jessica
   (Risk/Assurance). Where the owning worker is unambiguous, name it; otherwise route
   to the division's C-suite agent and let them fan out.
2. `[script]` Apply the **most-restrictive authority bar**: if the request exceeds
   the asking human's authority, mark it park-for-the-owning-human, not auto-route.
3. `[script]` Enforce **pool-never-bleed**: the route stays inside one division and
   one client/owner's RLS scope; cross-correlation is internal only — no other
   client's or owner's data may surface in the answer (two-axis RLS).
4. `[sonnet]` If ownership is ambiguous or the request genuinely spans divisions,
   mark it a **conflict** (do not guess an owner) — it routes to conflict handling /
   the owning human's queue rather than a single delegate.

## Outputs

`route.md` — the chosen owner (single division or worker) **or** a conflict flag,
with the one-line rationale, the authority decision (route vs park), and the
pool/RLS scope the delegation must stay within.

## Audit

- [ ] Exactly one owner is named, OR a conflict is flagged — never a guessed owner
- [ ] The route stays inside one division (pool-never-bleed); RLS scope is stated
- [ ] Most-restrictive authority bar applied; over-authority requests marked park
- [ ] Rationale cites the intent + org ownership, not invented capability
