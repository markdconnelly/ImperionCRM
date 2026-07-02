# Stage 02 — synthesize

**Job:** roll the gather record into a gap-ranked cross-report compliance
picture with the unknowns marked unknown.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Gather record | stage 01 `gather.md` | all | the raw material |

## Process

1. `[sonnet]` Roll up control state per framework/tenant across the three
   reports (Grace evidence, Cyrus detection coverage, Osiris access hygiene);
   collapse duplicates across tenants.
2. `[sonnet]` Rank by gap severity and evidence debt: failed/absent controls
   first, then unverified/expiring evidence, then passing. A control state the
   gather does not prove is **unknown** — never assumed compliant.
3. `[sonnet]` Isolate the gap list: each gap naming the owning report, the
   framework/tenant, and the decision or evidence Mark needs — by reference,
   no PII.

## Outputs

`synthesis.md` — a gap-ranked cross-report compliance rollup (failed/absent
controls leading, unknowns marked) and a separate gap list, each item naming
the owner and the decision/evidence required, by reference.

## Audit

- [ ] Rolled up per framework/tenant across all three reports
- [ ] Ranked by gap severity and evidence debt; unknowns marked unknown, never assumed compliant
- [ ] Every gap names an owning report and one decision or evidence ask
- [ ] No client PII, no secret values present (audit by reference)
- [ ] No item restates the gather list verbatim (it must be synthesized)
