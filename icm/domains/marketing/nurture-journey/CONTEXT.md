# Workflow: nurture-journey (marketing v1)

**Job:** run one enrolled contact through a multi-step nurture cadence —
send / wait / branch / score-bump — until it qualifies (MQL → Chase), exits, or
unsubscribes. Each send delegates to the consent gate; the journey owns the internal
step records. (Stream 01-H; B7 client-facing-send — sends inherit the campaign-send
gate; ADR-0073 journey-definition substrate.)

**Trigger:** a contact is **enrolled** — by segment membership, a captured sub-MQL
lead (01-F), event follow-up (01-K), or manual enrollment. One run per enrolled
contact's journey instance.

**Send identity:** every send in this journey is a **Campaign Send** routed through
the campaign-send gate (consent-gated, ADR-0058); this workflow never opens a second
send path of its own.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | enroll | Enroll the contact on the `workflow` substrate; capture segment/source | — |
| 02 | next-step | Execute the next cadence step (A/B send / wait / branch / score-bump) | — |
| 03 | send-gate | Route each send through the consent gate; opt-out + frequency hard stops; blast escalates | **Yes** |
| 04 | progress | Advance or terminate — MQL (→ lead-scoring → Chase), journey exit, or unsubscribe | — |

## Autonomy

Starts `draft` (ADR-0061). Internal enrollment and reversible step records (wait /
branch / score-bump) are reversible internal writes and may self-approve at **L2**.
Each **send** is consent-gated and inherits the campaign-send ceiling: when an admin
flips to `auto`, a **routine known-audience** send may recede to **L3** (ADR-0128); a
**new or materially larger audience** blast is **`always_gate`** (CONSTITUTION §5.4 —
escalate to the human queue in every mode). **Opt-out and frequency caps are hard
stops at send time** — a per-recipient filter, never advisory (BO-01 §5). Money never
enters this workflow.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object + the
end-to-end runnable steps, the per-send delegation to 01-I, the folded audience-segment
step, the learning on-ramp, and the dormancy posture — is [`sop.md`](sop.md) (ADR-0136 A8;
mirroring the template-defining exemplar 01-D, #1759). This `CONTEXT.md` stays the thin
routing surface; `sop.md` is the canonical prose. The control layer (§A invariants, the
B7 archetype rule) is cited there from ADR-0136, never redefined.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing draft sounds
the same). Mark-editable business content; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
