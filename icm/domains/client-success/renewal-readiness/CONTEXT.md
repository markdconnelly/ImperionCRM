# Workflow: renewal-readiness (client-success v1)

**Job:** assess a client's **renewal readiness** ahead of a renewal in range — assemble
the readiness picture (health, service track record, posture, the margin signal arriving
from Audrey) and park the recommended renewal posture (renew-as-is / uplift / at-risk →
save-play) for a human and for Chase. Celeste owns the *relationship* readiness; **Chase
owns the renewal transaction** (the renewal-reprice workflow). This is the Celeste side
of that seam.

**Trigger:** a renewal `opportunity` (`kind=renewal`) entering the readiness window, or an
on-demand request. One run per renewal in range.

**What this is NOT:** no commitment, no client-facing send, no reprice, no close. Celeste
does not set the renewal price (that is Chase, with Audrey's margin) and does not commit a
renewal. The output is an internal readiness assessment + a parked recommendation; a human
and Chase act. NO-COMMITS-EVER and MSSP-advisory-only are dial-proof (celeste.md
guardrails 1–2).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | renewal-context | Identify the renewal in range; read account + service + the renewal opp | — |
| 02 | assess-readiness | Health/risk + the renewal posture (signal vs inference) | — |
| 03 | recommend-posture | Park the recommended renewal posture → human + Chase | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient**. At **L2**, the internal
readiness compute auto-executes (reversible, signal-labeled). **Every** recommendation,
binding commitment, and client-facing touch parks for a human in every mode; the renewal
price + close are Chase's, gated. The NO-COMMITS-EVER ceiling is dial-proof (celeste.md).
Strict client-confidential boundary.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): reuses the domain health rubric — see
[`../client-360/skills/health-signals.md`](../client-360/skills/health-signals.md) cited
in prose; this workflow adds `renewal-readiness-rubric.md` (the readiness dimensions + the
renew/uplift/at-risk posture rule). Mark-editable. Format rules: `../../../CONVENTIONS.md`.
