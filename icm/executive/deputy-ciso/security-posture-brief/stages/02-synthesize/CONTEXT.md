# Stage 02 — synthesize

**Job:** turn the gather record into an exposure-ranked roll-up with the escalations
isolated.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up the signals into the three domains (SOC detection, GRC
   posture, Identity/access); collapse duplicates across tenants.
2. `[sonnet]` Rank by exposure: active threats, control gaps, stale access, drift
   against golden.
3. `[sonnet]` Isolate what must escalate to Mark, each framed as the decision he
   needs — by reference, no PII.

## Outputs

`synthesis.md` — exposure-ranked roll-up (active threats leading) and a separate
escalation list, each item naming the domain/sub-agent and the decision required,
by reference.

## Audit

- [ ] Roll-up is exposure-ranked, active threats leading
- [ ] Every escalation names a domain and one decision
- [ ] No client PII, no secrets present (audit by reference)
- [ ] No item restates the gather list verbatim (it must be synthesized)
