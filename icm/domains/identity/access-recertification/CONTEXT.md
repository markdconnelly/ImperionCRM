# Workflow: access-recertification (identity v1)

**Job:** a periodic access review reads the current access picture, flags stale,
excessive, or orphaned access, and proposes recertification / revocation actions
for a human — handed off to Roman. Nothing is disabled or revoked.

**Trigger:** an access-review cadence (periodic recertification window) OR an
on-demand review request. One run per review window/scope.

**Handoff identity:** identity has no actuation path at v1; the recert/revocation
proposal hands off to Roman (Deputy CISO) for execution. Audit-by-reference — no
client PII; identities are referenced by id/location, never by name.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | enumerate-access | Read the current access picture; resolve each identity | — |
| 02 | flag-exceptions | Flag stale, excessive, or orphaned access against the rubric | — |
| 03 | propose-recerts | Draft recertify-or-revoke proposals; hand off to Roman | **Yes** |

## Autonomy

Default rung **L1** (ADR-0061). Osiris's persona ceiling is **L3** (a verified-
leaver deprovision auto-executes under the JML runbook), but **recertification is
not deprovision** — every revoke, disable, or recert action it proposes is an
access commitment and is **always-gated** (CONSTITUTION §5.4), so this workflow
never actuates. Stage 03 drafts the proposals and parks. When flipped to `auto`,
it may self-approve ONLY recording the internal recert findings (the
stale/excessive/orphaned inventory) with an audit-clean resolution chain.
**Revoke, disable, and recert actions always park** — in every mode.

## Runtime skills

None at v1 (the recertification rubric — staleness thresholds + excessive-access
heuristics + orphaned-access definition — lands as a Tier-3 skill when the
actuation path does). Stages cite what they ground on via their Inputs table,
never restate it. Rules of the format: `../../../CONVENTIONS.md`. The structured
manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
