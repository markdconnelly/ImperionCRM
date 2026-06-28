# Posture-reporting rubric (Mark-editable — how to present a posture review to a client)

> DEFAULTS authored by the agent 2026-06-27. The rubric for `security-posture-review`: how to
> turn Vera's scored posture findings into a client-facing posture report in the relationship's
> voice, holding the MSSP advisory boundary. Mark: edit freely; stages cite this, nothing
> restates it.

## The measure→present→remediate seam (do not cross it)

- **Vera measures.** She scores the posture and owns the Security-domain posture substrate.
  Her scored findings arrive as a handoff — Celeste does not read that substrate directly and
  does not re-score it.
- **Celeste presents.** You translate Vera's findings into the client's business language and
  the relationship's voice, and you draft recommendations.
- **Human / Datto remediate.** No fix, no remediation action, no remediation commitment is
  ever yours (celeste.md guardrail 2, dial-proof).

Stay in your segment: frame and recommend, then park. Never re-score Vera's measurement, never
propose the act of fixing.

## The MSSP advisory boundary — what a posture report may contain

Four lanes, advisory only:

| Lane | What it is | What it is NOT |
|---|---|---|
| **Visibility** | what is observed about the client's posture (from Vera's findings) | a configuration change |
| **Posture** | the scored state Vera measured | a re-scoring or a new measurement by Celeste |
| **Risk** | what the posture means for the client's business, in plain terms | a severity Celeste invents without Vera's signal |
| **Recommendation** | a suggested next step, routed to a human | a remediation Celeste performs or commits to |

Remediation — patching, reconfiguring, deploying a control — is **human / Datto**. A
recommendation names *what a human/Datto should consider*; it is never an action Celeste takes
or a promise Celeste makes. **No compliance-management** (explicit v1 exclusion, celeste.md).

## Signal vs inference (label which is which)

- **Measured posture finding** = a scored fact from Vera's handoff (e.g. "MFA coverage scored
  below target", "an EOL control flagged"). It is Vera's measurement, cited as hers.
- **Relationship-framed inference** = Celeste's reading of what that finding means for *this*
  client's business and relationship ("this raises the client's exposure ahead of their
  renewal", "worth a vCISO conversation at the next QBR").
- **Always label which is which.** A risk statement carries the Vera finding that produced it.
  A posture verdict without its measured evidence is not advice (celeste.md guardrail 3). Never
  invent a finding Vera did not measure.

## Report structure (a client-facing posture report)

1. **Relationship framing** — open in Celeste's voice; situate the review in the ongoing
   account (the QBR cadence, recent engagement). Warm, consultative, business-framed.
2. **Posture summary** — Vera's scored findings translated to the client's business language,
   each labeled as a measured finding.
3. **Risk in plain terms** — what the posture means for the client, labeled as Celeste's
   inference, each tied to its measured finding.
4. **Recommendations** — advisory next steps only; each routed to a human, and any item whose
   substance is *fixing something* is explicitly tagged as a human / Datto remediation hand-off,
   not a Celeste action.
5. **No commitments** — the report makes no binding promise (roadmap · SLA · pricing · spend ·
   security-remediation commitment); those route to a human (celeste.md guardrail 1, dial-proof).

## Discipline

- **Advisory only.** Posture / risk / recommendation. Remediation is human / Datto.
- **Propose, never commit.** Every recommendation is a recommendation to a human, at every
  level.
- **In the client's interest.** Never inflate posture risk to drive spend; flag any
  non-interest upsell explicitly (celeste.md guardrail 4).
- **Confidential boundary.** One client's posture never enters another client's report.
- **The send always parks.** Any client-facing delivery exits only through ADR-0058, gated and
  human-approved.
