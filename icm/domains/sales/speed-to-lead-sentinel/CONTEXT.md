# Workflow: speed-to-lead-sentinel (sales v1)

**Job:** a scheduled watch over the speed-to-lead SLA clock — pull every routed-but-
unqualified lead, compute elapsed time-since-routed against its SLA target, classify
breached / imminent-breach / within-SLA, then **escalate** the breaches to the single
human queue, **tag** the owner, and **route** each to lead-response (02-A1) for the
actual first-touch. This is Chase's inbound watcher: a B9 deadline-sentinel that
**watches, escalates, and routes — never actuates**. It is the inbound mirror of the
procurement deadline-sentinel (02-B1): that one watches renewal/cancellation
deadlines; this one watches the SLA clock on a routed lead nobody has qualified yet.

**Trigger:** a scheduled SLA sweep (not a single lead handover). **One run per
scheduled sweep**; it walks the in-scope routed-but-unqualified leads.

## What this is NOT

- **NOT the lead router / assignment-rule engine** — assignment rules, the SLA model,
  the my-leads queue, and notifications are the broader routing epic. This workflow
  only *reads* the SLA clock; it does not route or assign leads.
- **NOT lead qualification or first-touch** — qualifying the lead and making the first
  response is **lead-response (02-A1)**, under its own gates. This workflow hands the
  lead there; it never qualifies or responds itself.
- **NOT a customer-facing send** — escalation and owner-tagging are *internal* routing.
  Nothing in this workflow exits to a prospect; any customer-facing first-touch parks
  and routes to lead-response (02-A1) on the ADR-0058 path.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | watch | Pull routed-but-unqualified leads; compute elapsed vs SLA; classify breached / imminent / within-SLA; cite each lead + as-of; dormant feed → flag stale, never live | — |
| 02 | assess | Per breach/imminent: severity, owner, "why still unqualified"; pool-correlate any cross-account pattern internally only (anonymized/aggregated) | — |
| 03 | escalate-deliver | Escalate breaches to the human queue (§5.4) + tag owner (internal); route lead → lead-response (02-A1); deliver the digest; log idempotent | — |

## Autonomy

**Pure L1 sentinel — watch + escalate, no actuation.** This workflow only reads the
SLA clock, classifies, escalates, and routes; it never sends, never writes silver,
never makes a commitment. There is no checkpoint because there is nothing to approve —
breaches escalate to the single human queue (CONSTITUTION §5.4) and route to
lead-response (02-A1), where the first-touch happens under that workflow's gates. The
L3 ceiling of the domain (room.md) does not apply: this procedure tops out at
watch+escalate. Every owner-nudge or customer-facing first-touch parks and routes to
02-A1; any audit failure parks for a human in every mode (ADR-0128 dial-proof).
Starts `draft` (ADR-0061); the flip to `auto` is admin-only and reversible
(`autopilot_policies`, ADR-0061/0087) and self-approves only the internal SLA
watch-list/escalation.

## Runtime skills

None in v1 (`skills: []`). This workflow grounds entirely on its OKF rooms
(`lead_score`, `contact`, `account`, `interaction`); it composes no domain- or
workflow-tier runtime skill. Mark-editable business content — the speed-to-lead SLA
target rubric (per segment/source) — is added as a workflow-local skill (Tier 3,
`./skills/`) if the SLA model is templatized here. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
