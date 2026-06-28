# Client Risk Register rubric (Mark-editable — structure + advisory discipline)

> DEFAULTS authored by the agent 2026-06-27. The rubric for the `cyber-risk-register`
> workflow: how to structure the client-facing Client Risk Register, the discipline of
> labeling measured signal vs inference, the MSSP/vCISO advisory boundary, and the
> no-commits-ever rule. Mark: edit freely; stages cite this, nothing restates it.

## The register structure (one row per risk)

| Field | What it holds |
|---|---|
| **Risk** | The risk in the client's business terms (what could go wrong, to what) |
| **Likelihood** | How likely — derived from Vera's measured posture finding |
| **Impact** | What it would cost the client (business-framed, not jargon) |
| **Signal** | The measured finding behind the risk + whether the rest is inference (see below) |
| **Recommended mitigation** | The advised step — a **recommendation only**, never a commitment |
| **Owner** | Who acts: **human / Datto for remediation**; Celeste presents/advises only |

Likelihood × impact gives a priority order; weigh, don't sum blindly. Present the register
in the relationship's voice (warm, business-framed; celeste.md) — the meaning, not the raw
scan output.

## The discipline: signal vs inference

- **Measured signal** = a finding Vera handed off from a source (a posture gap, an exposed
  service, a missing control, an expired certificate). This is the fact.
- **Inference** = your reading of that finding — the likelihood, the impact, the priority.
- **Always label which is which, on every risk.** A risk rating states the measured signal
  that produced it. A rating without its evidence is not advice (celeste.md guardrail 3).
  Never invent a posture finding Vera did not measure.

## The MSSP / vCISO advisory boundary (celeste.md guardrail 2)

- **Recommendations only.** The register advises; it does not act. Every entry is
  visibility · posture · risk · recommendation.
- **Remediation is human / Datto.** You never schedule, perform, or promise a fix. The
  `Owner` field routes remediation to a human or Datto — Imperion is not the
  immediate-response liability.
- **No compliance-management** (explicit v1 exclusion). Posture and risk advisory only.

## No commits, ever (celeste.md guardrail 1, dial-proof)

- **Every recommended mitigation is a recommendation to a human, at every autonomy level.**
  A remediation commitment (a promise to fix, a remediation SLA, a spend, a timeline) is
  never produced — not at L2, not at any rung, not with any earned track record.
- **The client-facing register parks; the send is always-gated** (ADR-0058). The internal
  draft assembly is the only thing `auto` may self-approve; the register that reaches the
  client is a human decision in every mode.
- **In the client's interest.** Recommend the mitigation the client's risk warrants — never
  a spend purely to grow Imperion's revenue; flag a non-interest upsell explicitly
  (celeste.md guardrail 4).
- **Confidentiality is absolute.** One client's posture, findings, or register never enter
  another client's context (celeste.md guardrail 5).
