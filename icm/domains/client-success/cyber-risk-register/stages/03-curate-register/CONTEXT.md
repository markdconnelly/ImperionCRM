# Stage 03 — curate-register

**Job:** curate the client-facing Client Risk Register as a parked artifact (recommendations only).

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Assessment | `assessment.md` (stage 02 output) | full | the assessed, prioritized risks |
| Risk rubric | `./skills/risk-register-rubric.md` | all | the register structure + MSSP boundary + no-commits-ever rule |

## Process

1. `[sonnet]` Build the client-facing Client Risk Register per `risk-register-rubric.md`:
   one row per risk — risk · likelihood/impact · signal · **recommended mitigation** · owner.
   Carry the measured-signal-vs-inference label through to every entry (celeste.md guardrail 3).
2. `[sonnet]` Write each recommended mitigation as a **recommendation only** — never a
   remediation commitment, never a fix, never a remediation SLA/timeline/spend promise
   (NO-COMMITS-EVER, celeste.md guardrail 1, dial-proof). Set every `Owner` to **human /
   Datto for remediation** — security work is advisory-only (MSSP boundary, guardrail 2).
   Flag any non-interest upsell explicitly (guardrail 4). Voice it in the relationship's
   register (warm, business-framed; celeste.md).
3. `[script]` Mark the disposition: the register is a **parked** artifact for human approval;
   nothing is sent here. The client-facing send is always-gated (ADR-0058).

## Outputs

`risk-register.md` — the curated client-facing register (each row: risk · likelihood/impact ·
signal · recommended mitigation · owner=human/Datto), marked **parked** for human approval.
Terminal stage; the run ends parked.

## Audit

- [ ] Every entry labels measured signal vs inference
- [ ] Every mitigation is a recommendation — no remediation commitment, fix, or remediation
      SLA/timeline/spend is asserted as executed
- [ ] Every `Owner` routes remediation to human / Datto (advisory-only, MSSP boundary)
- [ ] Any non-interest upsell is flagged, not buried
- [ ] No client-facing send emitted (the register parks; the send is always-gated)
- [ ] Only this client's posture appears (no cross-client leakage)

## Checkpoint

The Teams loop: a human co-shapes and approves the client-facing register before it leaves.
**`auto` (L2) may self-approve the INTERNAL draft register assembly ONLY** — the
client-facing register, every recommended mitigation, and every client-facing send park for
a human in every mode. NO recommendation is ever a remediation commitment, and remediation
stays with human / Datto (NO-COMMITS-EVER + MSSP-advisory-only, both dial-proof). Sends exit
only through ADR-0058.
