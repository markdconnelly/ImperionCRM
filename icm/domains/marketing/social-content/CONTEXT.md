# Workflow: social-content (marketing v1)

**Job:** compose one on-brand Social Post once, adapt it per network, and get it
published — drafted by Belle, approved by a human (v1), to our own established
audience. This is Belle's signature outbound act and her ladder tracer: it exercises
L0 grounding → L2 internal compose → the L3 routine-post gate → the always-gate blast
escalation. (Stream 01-A; ADR-0124 compose-once → fan-out.)

**Trigger:** a content-calendar slot is due, a campaign milestone fires, or an
operator says "post this." One run per Social Post.

**Sender identity:** the post is published on our own page/profile as the page
identity, through the unified Social Action path (`social_dispatch` executor,
ADR-0124 / ADR-0058). There is no second send path.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Ground brand voice, channel norms, the linked campaign, recent metrics, the slot | — |
| 02 | compose | Author the single composition + per-channel adaptations (no fabricated claim) | — |
| 03 | publish-gate | Route the publish as a Social Action → gauntlet → cockpit; blast escalates | **Yes** |
| 04 | dispatch | Per-channel idempotent publish; read back the status | — |
| 05 | reconcile | Back-sync Social Metrics; close the run | — |

## Autonomy

Starts `draft` (ADR-0061). When an admin flips it to `auto`, stage 03 may self-approve
ONLY a **routine** organic post: pre-substantiated, on-brand, to an **established**
channel/audience, within frequency limits, with a clean audit (ADR-0128 L3 routine —
the post is externally reversible via unpublish). A **large or new-audience** posture,
any **unsubstantiated** claim, an **empty brand room**, or **any audit failure** parks
for a human in every mode. **Money never enters this workflow** — a boost/ad is a
separate procedure (01-B/01-C), `always_gate`.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing draft sounds
the same). Workflow-local (Tier 3, `./skills/`): `channel-norms.md` (per-network
length/format/link rules) · `substantiation-rules.md` (cite-or-cut). Mark-editable
business content; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
