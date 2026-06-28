# Stage 02 — enrich

**Job:** ground the triaged detection in Microsoft-sourced threat intelligence and
the asset's own posture, producing the evidence chain a containment call rests on.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Triage record | stage 01 `triage.md` | full | the subject + resolved assets |
| Threat intel | knowledge search (Microsoft-sourced) over gold | the detection's IOCs/TTPs | enrichment |
| Asset posture | silver `posture_snapshot` · `okf:posture_snapshot` | the owning account's posture | exposure context |

## Process

1. `[script]` Carry the triage class and resolved asset/account ids forward.
2. `[sonnet]` Enrich via `knowledge.search`: pull Microsoft-sourced threat intel
   for the detection's indicators; cite each intel item (no uncited claims).
3. `[script]` Read the owning account's `posture_snapshot`; note posture facts that
   raise or lower exposure (reference facts only, no PII).
4. `[sonnet]` Assemble the evidence chain: detection → intel → posture →
   confidence (high / medium / low) with one sentence per link.

## Outputs

`enrichment.md` — the cited evidence chain, posture exposure note, and a
confidence rating. Drives the stage-03 contain-or-propose decision.

## Audit

- [ ] Every intel claim carries a citation (no uncited enrichment)
- [ ] A confidence rating (high/medium/low) is stated with reasoning
- [ ] No client PII or secret material in the record (audit-by-reference)
