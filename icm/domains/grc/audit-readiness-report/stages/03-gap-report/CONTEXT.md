# Stage 03 — gap-report

**Job:** compile the readiness report + remediation backlog, park every control
attestation and remediation, and hand off to Roman. The checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Evidence set | stage 02 `evidence.md` | full | per-control status + citation chain |
| Scope | stage 01 `scope.md` | full | the framework + control universe |
| Account in scope | silver `account` · `okf:account` | the customer(s) | report addressing |

## Process

1. `[sonnet]` Compile the readiness report: per-control verified/unverified status,
   the unverified-control gaps with the cited evidence chain (or its absence) behind
   each, and an overall readiness posture for the named framework. An unverified
   control is reported as a gap, never papered over.
2. `[sonnet]` Build the remediation backlog: one entry per gap with a severity
   (high/medium/low) and a drafted remediation note — described as a proposal, never
   enacted. A control attestation or control change is named as Roman-only, flagged
   always-gate.
3. `[script]` Assemble the handoff packet: readiness report, remediation backlog,
   always-gate flags, owning `account` id(s).

## Outputs

`report.md` — the compiled, citation-backed readiness report with per-control
status, the overall readiness posture, and the remediation backlog with severities.
The run **parks and hands off to Roman** (Deputy CISO); v1 has no actuation path. No
control attestation, remediation, or control change is enacted from here.

## Audit

- [ ] Every reported gap traces to a cited evidence chain (or a cited absence of evidence)
- [ ] No control is asserted compliant without a baseline-meeting, cited evidence chain
- [ ] No control attestation or remediation is enacted — all are parked/flagged Roman-only
- [ ] The packet is a handoff to Roman — no send, no actuation (v1)
- [ ] No client PII or secret material in the record (audit-by-reference)

## Checkpoint

The human (Roman, Deputy CISO) approves the readiness report and the remediation
backlog, and is the only actor who may attest a control or authorize a remediation.
When flipped to `auto`, this stage may self-approve **ONLY** recording the internal
readiness report when its citation chain is audit-clean. Every control attestation,
every remediation, and any change that asserts or alters compliance state parks for
Roman in every mode — it is always-gated and dial-proof (CONSTITUTION §5.4, Grace
ceiling L2). Anything not named here parks by default.
