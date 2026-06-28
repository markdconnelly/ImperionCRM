# Stage 03 — decide-handoff

**Job:** draft the access decision — a verified-leaver deprovision proposal or a
gated joiner/mover grant — and hand off to Roman. The checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Resolution record | stage 01 `resolution.md` | full | the verified event + identity |
| Access scope | stage 02 `access-scope.md` | full | the change set |
| Owning account | silver `account` · `okf:account` | the customer/org | handoff context |

## Process

1. `[script]` Route on event class: verified leaver → deprovision proposal (the L3
   ceiling, reversible + asset-scoped, NOT executed at v1); joiner/mover → grant
   proposal flagged always-gate.
2. `[sonnet]` Draft the decision with rationale; name grants, elevation, and
   break-glass as Roman-only, flagged always-gate. Deprovision stays reversible.
3. `[script]` Assemble the handoff packet: decision, resolution chain, change set,
   always-gate flags, owning `account` id.

## Outputs

`decision.md` — the access decision (deprovision proposal or gated grant), the
resolution chain, and the always-gate flags. The run **parks and hands off to
Roman** (Deputy CISO); v1 has no actuation path. No grant, elevation, break-glass,
or deprovision is executed from here.

## Audit

- [ ] The decision is a reversible deprovision proposal OR a gated grant proposal
- [ ] No grant, elevation, or break-glass is proposed for auto-execution
- [ ] The packet is a handoff to Roman — no send, no actuation (v1)
- [ ] No client PII or secret material in the record (audit-by-reference)
