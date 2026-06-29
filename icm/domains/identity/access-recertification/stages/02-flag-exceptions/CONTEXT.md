# Stage 02 — flag-exceptions

**Job:** flag each access in the inventory as stale, excessive, or orphaned against
the recertification rubric.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Access inventory | stage 01 `access-inventory.md` | full | the resolved access picture |
| Recertification rubric | knowledge search (staleness thresholds + excessive-access + orphaned-access definitions) over gold | the roles/access in scope | the exception criteria |
| Asset access | silver `device` · `okf:device` | assets tied to the in-scope entities | confirm the access surface being flagged |

## Process

1. `[script]` Carry the resolved entity/account ids and the access surface forward.
2. `[sonnet]` Flag each access against the rubric via `knowledge.search`: **stale**
   (no recent use / past its review horizon), **excessive** (broader than the role
   warrants), or **orphaned** (no resolvable owning identity). Cite the rubric for
   each flag.
3. `[script]` An access that fits no exception class is recorded as clean
   (recertify-as-is candidate) — never widened, never silently revoked.

## Outputs

`exceptions.md` — per flagged access, its class (stale / excessive / orphaned) with
the rubric citation, plus the clean recertify-as-is set. Feeds the stage-03
proposal.

## Audit

- [ ] Every access is classed stale / excessive / orphaned / clean against the rubric
- [ ] Every flag cites the recertification rubric (no unjustified flag, no widening)
- [ ] No client PII or secret material in the record (audit-by-reference)
