# Workflow: lead-capture (marketing v1)

**Job:** take one inbound `lead_hook`, normalize its source/UTM/consent, resolve
its owner against the contact kernel, stamp the multi-touch attribution touch, and
disposition it — enqueue for scoring or, if the source already implies MQL-grade
fit, emit the threshold-crossing score that routes to Chase. Intake only: every
write is an internal, reversible record (L2). There is **no external send** in this
workflow. (Stream 01-F; ADR-0136 B1 triage/route.)

**Trigger:** a `lead_hook` lands — a Meta lead form, a website form, a
DM-classified-as-lead (from 01-D), an Apollo / prospecting entry, an Event
Registration, gated content, or a list import. One run per `lead_hook`.

**The seam (Belle → Chase):** Belle owns *capture*; Chase owns *qualify/close*. They
meet at the score crossing the MQL threshold — an explicit disposition step, never a
co-owned handoff (A11). An **existing customer** is **not** a new lead: it parks /
routes out, never gets dispositioned as a fresh lead.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ingest | Capture source, UTM/campaign touch, consent state from the `lead_hook` — cited + as-of | — |
| 02 | resolve-owner | Client Mapping / contact dedupe; existing-customer → park (not a new lead) | — |
| 03 | attribute | Stamp the multi-touch attribution touch for ROI | — |
| 04 | disposition | Enqueue for scoring OR emit the MQL-grade threshold-crossing score → Chase | — |

No checkpoint stage: every act is an internal-only, reversible write (L2) — there is
no outbound send, so there is no send gate.

## Autonomy

Starts `draft` (ADR-0061). Internal capture, dedupe, attribution, and disposition are
**reversible internal writes (L2)** and may self-approve when an admin flips the
workflow to `auto` (ADR-0128 L2 — clean inverse, no external party). **There is NO
external send in this workflow**, so no act ever reaches a send gate. Three things
**park** in every mode: an **unparseable / empty `lead_hook`** (A5 — never fabricate a
source or consent), an **unresolved owner**, and an **existing-customer match** (an
existing customer is not treated as a new lead — the 01-D customer rule; route out, do
not disposition).

## Runtime skills

None workflow-local (`skills: []`). This is a mechanical intake — Belle's voice and
the demand posture come through the composed prose (Constitution → `../room.md` →
`../belle.md` → `./prose.md`); claims/substantiation skills belong to the
client-facing workflows, not this internal capture. Mark-editable business content;
stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`. The
structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.
