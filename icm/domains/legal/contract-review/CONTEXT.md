# Workflow: contract-review (legal / Internal Ops · G&A v1)

**Job:** every inbound contract (MSA/SOW) gets a grounded redline, a risk-clause
flag set, and a plain-language summary — drafted by the agent, with **execution
parked** for a human.

**Trigger:** an MSA or SOW arrives from the sales motion (handed over by Chase or
Vance), attached to a counterparty and a deal. One run per contract.

**Note:** Laurel is **not licensed counsel** — a genuine legal judgment routes to a
human. This workflow **does not send, execute, or bind** (v1 reads + drafts only);
binding the company exits only through a human on the ADR-0058 path.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intake-ground | Ingest the contract + ground it in the counterparty/deal | — |
| 02 | redline-flag | Redline + flag risk clauses + plain-language summary | — |
| 03 | park-execution | Park execution; route legal calls to a human; hand off | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). When flipped to `auto`, this workflow may self-approve
ONLY: producing and documenting the internal review record (redline + risk flags +
summary) for a standard MSA/SOW that needs no licensed-counsel judgment. Execution/
binding (sign, countersign, send-for-signature), any genuine legal call, and any
audit failure always park for a human, in every mode.

## Runtime skills

None in v1 (`skills: []`). Mark-editable business content — the standard-clause
library and risk rubric — is added as workflow-local skills (Tier 3, `./skills/`)
when the review playbook is templatized. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
