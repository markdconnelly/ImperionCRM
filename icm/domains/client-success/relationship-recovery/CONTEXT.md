# Workflow: relationship-recovery (client-success)

> 💤 **DORMANT until its data substrate lands (ADR-0123 built-but-inert).** This
> playbook is authored **capability-complete** but stays **inert** in production until
> the wake feed exists: the **#991 cross-agent handoff bus** (the Felix major-incident /
> SLA-breach → Celeste handoff that triggers a run), plus the **interaction / comms
> collectors** (#1369 / #1370) that hydrate the sentiment-drop trigger. Until then there
> is no incident handoff to wake on, so the workflow never runs — it is built,
> registered, and reviewable, not running. Do not read its dormancy as "deferred/broken";
> it lights up the moment the incident handoff feed hydrates (CLAUDE.md §6 deploy-dormant;
> celeste.md grounding, ADR-0123; issue #1693).

**Job:** Celeste's **acute relationship-recovery / save-the-account** playbook — when a
triggering incident (a major incident / SEV1, an SLA breach, or a string of failures) puts
the *relationship* (not just the ticket) at risk, assemble the incident picture (L2
internal), **draft** an executive recovery touch + a save plan (L2 internal), then send via
a **human-gated** checkpoint and track to resolution. **Felix owns the technical incident;
Celeste owns the relationship** (celeste.md seams). This is the **acute** counterpart to
08-D (`health-intervention`, the slow-degradation churn save).

**Trigger:** a **Felix major-incident / SLA-breach handoff** arriving on Celeste's wake
inbox (the #991 bus) **or** a sharp sentiment / health drop signalling an acute relationship
rupture. One run per at-risk **relationship event** — distinct from 08-D's routine periodic
save-outreach over the whole book.

**What this is NOT:** no binding commitment — the recovery touch and save plan can never
promise a **credit** (routes to **Audrey / 08-P** SLA-credit, the only credit path), an
**SLA change** (human), a **remediation** (Felix / Datto), or a **price**; every binding
line **parks for a human** (NO-COMMITS-EVER, dial-proof, celeste.md guardrail 1). No
security remediation (MSSP advisory-only, guardrail 2). Not Felix's incident-resolution and
not a marketing send — Celeste stays in **relationship** scope (celeste.md seams).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | incident-context | Assemble the incident + relationship picture from the Felix seam; label signal vs inference | — |
| 02 | recovery-plan | Decide the recovery posture; draft the executive recovery touch + save plan; consent.check | — |
| 03 | execute-track | The human-gated executive recovery send, then track to resolution | **Teams-loop** |

## Autonomy

Starts `draft` (ADR-0061). **L1 = a Teams-loop gradient** (a human co-shapes + approves).
At **L2** (the manifest default), the incident-context assemble + the recovery touch / save
plan **draft** auto-execute (internal, reversible, signal-labeled). The **executive recovery
SEND is human-gated at every rung** — this is acute + executive + relationship-sensitive, so
unlike 08-D (where a *routine* save may auto at L3) **every** send here parks for a human in
every mode. **Every** binding commitment (credit → Audrey/08-P, SLA → human, remediation →
Felix/Datto, price) parks at every rung — the NO-COMMITS-EVER and MSSP-advisory ceilings are
dial-proof (celeste.md guardrails 1–2). Strict client-confidential boundary: one client's
incident or signals never enter another's context.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `recovery-rubric.md` (the recovery-posture rubric, the
executive-touch + save-plan playbook, and the NO-COMMITS routing — credit → Audrey/08-P, SLA
→ human, remediation → Felix, price → human). Mark-editable; stages cite, never restate.
Rules of the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed prose is `prose.md`.
