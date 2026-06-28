# Stage 03 — gap-report

**Job:** compile the gap report with remediation notes, park every control change,
and hand off to Roman. The checkpoint.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gap analysis | stage 02 `gaps.md` | full | the findings |
| Evidence set | stage 01 `evidence.md` | full | the citation chain |
| Account in scope | silver `account` · `okf:account` | the customer(s) | report addressing |

## Process

1. `[sonnet]` Compile the gap report: per-control status, the gaps + drift with
   severities, and the cited evidence chain behind each.
2. `[sonnet]` Draft remediation notes for each gap — described as proposals, never
   enacted. A control change or attestation is named as Roman-only, flagged
   always-gate.
3. `[script]` Assemble the handoff packet: report, remediation proposals,
   always-gate flags, owning `account` id(s).

## Outputs

`report.md` — the compiled, citation-backed gap report with severities and
remediation proposals, plus the always-gate flags. The run **parks and hands off
to Roman** (Deputy CISO); v1 has no actuation path. No control change or
attestation is enacted from here.

## Audit

- [ ] Every reported gap traces to a cited evidence chain
- [ ] No control change or attestation is enacted — all are parked/flagged Roman-only
- [ ] The packet is a handoff to Roman — no send, no actuation (v1)
- [ ] No client PII or secret material in the record (audit-by-reference)
