# Workflow: campaign-plan (marketing v1)

**Job:** plan one marketing campaign — objective, target segment, channel mix,
proposed budget envelope, message — get the plan + envelope human-approved, then
**launch its children through their own sub-procedures**, each carrying its own gate.
This is the orchestrating container of the demand engine: it plans and launches, it
never duplicates a child's actuation. (Stream 01-L; ADR-0136 B9 deadline-sentinel +
container of 01-A/01-H/01-I/01-B.)

**Trigger:** a campaign needs planning — a launch date approaches (the B9 launch
clock), or an operator requests a campaign (a brief / quarterly plan / product or
event push). One run per `campaign`.

**This workflow ORCHESTRATES sub-procedures — it does not actuate.** Organic posts →
`social-content` (01-A); sends → `campaign-send` (01-I); the nurture journey →
`nurture-journey` (01-H); paid → `paid-ads` (01-B/01-C). Each child carries its **own
gate** (a post's publish-gate, a send's send-gate, paid's money-gate). The container
holds the launch clock and the campaign attribution tag; each child owns its act
(A11). Never re-implement a child's send/publish/spend here.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Ground the campaign goal, prior `social_metric` performance, and budget context | — |
| 02 | draft-plan | Draft objective, target segment, channel mix, budget envelope, message (no fabricated claim) | — |
| 03 | plan-gate | Human approves the plan + budget envelope; the envelope is NOT a spend authorization | **Yes** |
| 04 | launch | Schedule the children via their sub-procedures, each carrying its own gate | — |

## Autonomy

Starts `draft` (ADR-0061). The internal plan/draft — objective, target segment,
channel mix, proposed budget **envelope**, message — is **reversible-internal** and may
self-approve at L2 (ADR-0128 row 1). When an admin flips to `auto`, **approving the
plan + budget envelope is a human gate** (stage 03). Crucially, **approving an envelope
is NOT approving a spend** — the actual ad spend stays `always_gate` per `paid-ads`
(01-B/01-C, dial-proof class-1, money has no clean undo). **Every child send / post /
ad / journey inherits its OWN sub-procedure's gate** when it launches (stage 04); this
container never widens or waives a child's gate.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (the plan's message sounds
on-brand). Mark-editable business content; stages cite, never restate. Rules of the
format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
