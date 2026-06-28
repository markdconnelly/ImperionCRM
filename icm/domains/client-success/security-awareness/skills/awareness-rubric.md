# Security-awareness / enablement rubric (Mark-editable — gap → recommendation)

> DEFAULTS authored by the agent 2026-06-27. The rubric for stages 02–03 of
> `security-awareness`: how to turn a handed-off awareness-gap / posture finding into a
> recommended enablement plan (training topics, phishing-sim cadence, policy reminders),
> with the signal-vs-inference and advisory-boundary discipline. Mark: edit freely; stages
> cite this, nothing restates it.

## The discipline: signal vs inference

- **Measured signal** = a fact from the handoff or a source row: an awareness-gap finding
  Vera handed off, a phishing click-rate Vera reported, MFA-coverage gaps in the posture
  finding, repeated user-error tickets (`ticket` via the standing picture), a stale
  security topic in the last QBR (`strategic_business_review`).
- **Inference** = Celeste's reading of those signals ("this team needs phishing refreshers").
- **Always label which is which.** A recommendation states the signals that produced it. A
  recommendation without its evidence is not advice (celeste.md guardrail 3).

## Gap → enablement mapping (weigh the handed-off finding — don't invent gaps)

| Handed-off gap signal | Recommended enablement (advisory) | Notes |
|---|---|---|
| High phishing-sim click-rate / no sim history | Phishing-sim cadence (e.g. monthly → quarterly as it improves) + targeted phishing module | Cadence is a *recommendation*; the sim itself is a client-facing delivery → human-gated |
| MFA / credential-hygiene gap | Credential-hygiene + MFA training topic; 1Password/passkey enablement reminder | Enablement how-to, not a config change — remediation is human/Datto |
| Stale or missing security policy acknowledgement | Policy-reminder notice (acceptable-use, data-handling) | A reminder to re-acknowledge, never a new policy commitment |
| Onboarding / role change without security orientation | New-hire / role-change security-orientation module | Size to headcount from the standing contact picture |
| Recurring user-error / social-engineering tickets | Targeted awareness module for the observed pattern | Corroborate with the standing picture; don't over-read one ticket |
| No security topic in recent QBR | Add a security-awareness agenda item to the next QBR | Advisory framing for the human-led review |

## Recommendation discipline

- **Advisory only — the MSSP / vCISO boundary.** You recommend awareness, cadence, and
  reminders; you never deliver, never configure, never remediate. Remediation is human /
  Datto, and there is **no compliance-management** in v1 (guardrail 2, dial-proof).
- **Propose, never commit.** A phishing-sim cadence, a training rollout, a policy notice are
  *recommendations to a human* at every level — a security-remediation commitment is one of
  the binding commitments the NO-COMMITS-EVER ceiling routes to a human (guardrail 1,
  dial-proof).
- **Every client-facing delivery is human-gated.** The plan parks; a human delivers the
  training, launches the sim, sends the notice. The run never reaches the client.
- **In the client's interest.** Recommend the awareness the client's gap actually needs —
  never a paid enablement package purely to grow Imperion's revenue; flag a non-interest
  upsell explicitly (guardrail 4).
- **Stay in seam.** Vera measures the posture and hands you the gap; you recommend the
  enablement; Chase owns any transaction that follows. You hold the relationship-advisory
  voice, not the measurement and not the close.
