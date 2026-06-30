# Stage 02 — arbitrate

**Job:** apply the ownership rules to the grounded conflict to select exactly one
owning division/agent — or mark it park-for-human when the ownership call is
genuinely the human's — then apply the most-restrictive authority bar.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Conflict record | stage 01 `conflict.md` | all | the grounded ask, candidate owners, entities, authority, why-conflict line |
| Org tree | `../../../org.yaml` (read as routing reference) | divisions + their domains + systems-of-record | who owns what; which division's SoR a request writes |

## Process

1. `[sonnet]` Apply the ownership rules in order to pick the **one** owner:
   (a) **SoR-write-wins** — the division whose system-of-record the request primarily
   writes owns it; (b) failing a single SoR, **primary-effect-wins** — the division that
   bears the request's primary effect owns it; (c) **security/risk defers** — a request
   carrying a security or risk concern goes to Roman (Security) or Jessica
   (Risk/Assurance) regardless of the surface division. Name the owning division, or the
   specific worker when it is unambiguous.
2. `[script]` Apply the **most-restrictive authority bar**: if the request exceeds the
   asking human's authority, mark it park-for-the-owning-human, not auto-route.
3. `[script]` Enforce **pool-never-bleed**: the arbitration and the eventual route stay
   inside one client/owner's RLS scope; cross-correlation is internal only — no other
   client's or owner's data may surface (two-axis RLS).
4. `[sonnet]` If the rules do **not** yield a clear winner — ownership is genuinely
   contested, or the decision exceeds your authority — mark it **park-for-human** (the
   #968 path: the contested ownership call is the human's, not a guess). Name exactly one
   owner OR park; never best-guess an owner.

## Outputs

`arbitration.md` — the chosen single owner (division or worker) **or** a park-for-human
flag, the rule that decided it (SoR-write / primary-effect / security-risk-defer), the
authority decision (route vs park), the pool/RLS scope the delegation must stay within,
and the rationale to surface in stage 03.

## Audit

- [ ] Exactly one owner is chosen, OR an explicit park is marked — never a guessed owner
- [ ] The deciding rule is named (SoR-write / primary-effect / security-risk-defer)
- [ ] Most-restrictive authority bar applied; over-authority requests marked park
- [ ] Pool-never-bleed held — route stays inside one client/owner RLS scope; scope stated
- [ ] Rationale cites the ownership rules + org tree, not invented capability
