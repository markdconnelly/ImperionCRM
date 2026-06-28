# Workflow: employee-onboarding (people / Internal Ops · G&A v1)

**Job:** every accepted offer becomes a sequenced, tracked onboarding — provisioning
handed to Osiris, a per-employee brain spun up, IT setup requested — drafted by the
agent and gated for a human on anything that touches employment, comp, or PII.

**Trigger:** an offer is accepted (a lifecycle event handed down by Rachel, Chief of
Staff). One run per new hire.

**Note:** this is an **internal/HR-facing** workflow — it grounds on **no OKF
entity** (the people domain has none yet), it **does not send or actuate** (v1 reads
+ orchestrates only), and it **never reads employee PII into an artifact** (ADR-0060).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intake-confirm | Confirm the accepted offer + assemble the role context | — |
| 02 | orchestrate-setup | Sequence provisioning (→ Osiris), brain spin-up, IT setup | — |
| 03 | track-handoff | Track step status; park employment/comp/PII; hand off | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). When flipped to `auto`, this workflow may self-approve
ONLY: sequencing and requesting internal onboarding steps for a standard accepted
offer (provisioning handoff, per-employee-brain spin-up, IT-setup requests — all
internal, reversible). Any employment/compensation/PII action, and any audit
failure, always park for a human, in every mode. Salary is **never disclosed**.

## Runtime skills

None in v1 (`skills: []`). Mark-editable business content is added as workflow-local
skills (Tier 3, `./skills/`) when the onboarding playbook is templatized. Rules of
the format: `../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the
composed workflow prose is `prose.md`.
