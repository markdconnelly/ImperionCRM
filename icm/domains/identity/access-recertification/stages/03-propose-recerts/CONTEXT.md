# Stage 03 — propose-recerts

**Job:** draft a recertify-or-revoke proposal per flagged access and hand off to
Roman. The checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Access inventory | stage 01 `access-inventory.md` | full | the resolved access picture |
| Exceptions | stage 02 `exceptions.md` | full | the flagged + clean access set |
| Owning account | silver `account` · `okf:account` | the customer/org | handoff context |

## Process

1. `[script]` Route on exception class: clean → recertify-as-is proposal;
   stale/excessive/orphaned → revoke-or-recertify proposal flagged always-gate.
   Nothing is disabled or revoked here (v1 has no actuation path).
2. `[sonnet]` Draft each proposal with rationale; name every revoke, disable, and
   recert action as Roman-only, flagged always-gate. No access is widened.
3. `[script]` Assemble the handoff packet: the recert findings, per-access
   proposals, always-gate flags, the resolution chain, and the owning `account` id.

## Outputs

`recert-proposals.md` — the recertify-or-revoke proposals, the recert findings
inventory, the resolution chain, and the always-gate flags. The run **parks and
hands off to Roman** (Deputy CISO); v1 has no actuation path. No access is
disabled, revoked, or recertified from here.

## Audit

- [ ] Every flagged access has a recertify-or-revoke proposal; clean access has a recertify-as-is proposal
- [ ] No revoke, disable, or recert action is proposed for auto-execution
- [ ] The packet is a handoff to Roman — no send, no actuation (v1)
- [ ] No client PII or secret material in the record (audit-by-reference)

## Checkpoint

The human (Roman) approves the recertify-or-revoke proposals. When `auto`, this
stage may self-approve ONLY recording the internal recert findings — the
stale/excessive/orphaned inventory — with an audit-clean resolution chain. Every
revoke, disable, and recert action parks for Roman in every mode (CONSTITUTION
§5.4); anything not named here parks by default.
