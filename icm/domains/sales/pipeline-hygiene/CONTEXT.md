# Workflow: pipeline-hygiene (sales pipeline management, 02-B4/B9)

**Job:** keep the WHOLE open pipeline clean — sweep every open `opportunity` for
staleness, missing next-action/close-date, and data-quality gaps; flag what's
wrong in a hygiene digest; apply only the internal reversible data-quality stamp;
and route every customer-facing follow-up to `pursue-opportunity` (02-A3).

**Trigger:** a scheduled portfolio sweep over all open opportunities (Stream 02,
archetype B4 audit-attest / B9 deadline-sentinel). One run per scheduled sweep —
this is the standing AE hygiene function, not a per-deal reaction.

**Sender identity:** none. Nothing in this workflow exits to an external party.
The only write is the internal reversible data-quality stamp via
`opportunity.write` (no customer-facing effect). Every customer-facing touch is
routed to `pursue-opportunity`, where the binding act is always a human's
(room.md seam, BO-02 §5).

## What this is NOT

- NOT per-deal pursuit — pursuing one open deal with a customer-facing touch is
  `pursue-opportunity` (02-A3); this sweep routes follow-up items there, it never
  composes or sends the touch itself.
- NOT a quote builder — KQM is the quote SoR, read-only (ADR-0080); pricing,
  discount, and term assertions are not Chase's to make.
- NOT a customer-facing send path — no stage here talks to a prospect; the data-
  quality stamp is internal-only and reversible.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | scan | Pull all open opportunities; compute staleness, missing next-action/close-date, and data-quality gaps; cite each opportunity + as-of (A5) | — |
| 02 | triage | Classify findings (stale / no-next-step / data-quality), prioritize; pool-never-bleed on cross-deal patterns (A7) | — |
| 03 | flag-or-stamp | Draft the hygiene digest (L1); at L2, apply the internal reversible data-quality stamp via `opportunity.write` | **Yes** |
| 04 | route-log | Route customer-facing follow-ups to pursue-opportunity (02-A3) as parked proposals; deliver the digest; log idempotent (A9b) | terminal |

## Autonomy

Starts `draft` (ADR-0061). Default rung **L1** (room.md): the run drafts the
hygiene digest and parks. When admin-flipped to `auto`, stage 03 may self-approve
**ONLY** the internal reversible data-quality stamp via `opportunity.write` at
**L2** (`hygiene-rules` — internal field only, no customer-facing effect; the
opportunity-internal auto-write of #1416, ADR-0128). **Every customer-facing
follow-up routes to `pursue-opportunity` (02-A3) and re-inherits that workflow's
always_gate** — it is never sent here, in any mode. Any pricing/discount/term
assertion or send-for-signature is dial-proof always-gate (ADR-0128, BO-02 §5).
Audit failure escalates to the human queue (CONSTITUTION §5.4).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `hygiene-rules.md` (staleness thresholds,
the data-quality field checklist, the route-vs-stamp rule). Domain-shared
(Tier 2, `../skills/`): `voice-and-tone.md` (the digest's register). Mark-editable
business content; stages cite, never restate. Format rules:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
