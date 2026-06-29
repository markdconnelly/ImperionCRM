# Stage 04 — delegate-followups

**Job:** OPTIONAL — for a grounded, cited flag, emit a proposed `delegate()` to Celeste
(renewal save) or Chase (reprice), and/or `handoff()` to Nova when cross-division. The
world-changing effect re-gates inside the sub-agent's gauntlet; Sterling never actuates.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flag list | the grounded flags + owning sub-agent |
| Synthesis | stage 02 `synthesis.md` | per-flag exposure + basis | the exposure each delegate carries |

## Process

1. `[sonnet]` For each flag confirmed grounded and cited, draft the follow-up: an
   at-risk renewal → **Celeste** (renewal save); an under-priced / unprofitable
   engagement → **Chase** (reprice). Carry the account / engagement, the exposure, and
   the basis.
2. `[sonnet]` Where a follow-up crosses divisions (beyond Client Success or Sales),
   draft a `handoff()` to **Nova** instead.
3. `[script]` Emit the proposed `delegate()` / `handoff()`. The delegate routes the work
   and re-gates the world-changing effect (any commitment, price change, or money
   movement) inside the sub-agent's own gauntlet (ADR-0128). Sterling writes nothing,
   commits nothing, and moves no money — finance stays read-only (ADR-0123).
4. `[script]` Any flag that is not fully grounded, or whose owner is unclear, parks for
   Nick instead of being delegated.

## Outputs

`followups.md` — the proposed `delegate()` / `handoff()` set, each naming the target
sub-agent (Celeste / Chase / Nova), the account / engagement, the exposure, and the
basis; plus any flag parked for Nick.

## Audit

- [ ] Every delegate / handoff cites the grounded flag and states the exposure it carries
- [ ] Targets are correct — Celeste (renewal save) / Chase (reprice) / Nova (cross-division)
- [ ] No flag delegated without grounding + citation; ungrounded or owner-unclear flags parked for Nick
- [ ] Read-only — no financial record written, no money moved
- [ ] No send/write/actuation occurred — Sterling delegated or parked

## Checkpoint

Delegated follow-ups route to **Celeste / Chase**, cross-division ones hand off to
**Nova**; parked flags wait for **Nick**. `auto` may self-approve ONLY a `delegate()` for
a grounded, cited flag — the world-changing decision re-gates inside the receiving
sub-agent's gauntlet (CONSTITUTION §9, ADR-0128). Sterling never actuates; finance never
leaves read-only (ADR-0123).
