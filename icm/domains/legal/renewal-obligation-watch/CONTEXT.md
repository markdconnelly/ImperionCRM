# Workflow: renewal-obligation-watch (legal / Internal Ops · G&A v1)

**Job:** a periodic scan surfaces every upcoming contract renewal, notice-period
deadline, and standing obligation — grounded in the counterparty/deal — and
**proposes** the action for a human (a notice to send, a review to start, a renewal
to prep). The agent never signs, sends, or binds.

**Trigger:** a periodic/scheduled sweep (not a single contract handover). One run per
scan window; it walks the in-scope counterparties and deals.

**Note:** Laurel is **not licensed counsel** — a genuine legal judgment routes to a
human. This workflow **proposes only** (v1 reads + drafts): it never sends a notice,
signs, or binds. Every send/signature exits only through a human on the ADR-0058 path.
A fabricated clause or date is the highest-harm case — **never invent a term or a
date**; an unverifiable obligation is said to be unverifiable, not assumed.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | scan-contracts | Build the watch-list of in-scope renewals/obligations | — |
| 02 | flag-deadlines | Compute notice-period deadlines + flag what is due | — |
| 03 | propose-actions | Propose the human action per item; park every send/sign | **Yes** |

## Autonomy

Starts `draft` (ADR-0061). When flipped to `auto`, this workflow may self-approve
ONLY: producing and documenting the **internal watch-list/findings record** (the
scanned renewals, computed deadlines, and proposed actions) — internal and
reversible. Every **proposed notice/send/signature**, any genuine legal call, and any
audit failure always park for a human, in every mode.

## Runtime skills

None in v1 (`skills: []`). Mark-editable business content — the notice-period rubric
and the standing-obligation taxonomy — is added as workflow-local skills (Tier 3,
`./skills/`) when the watch playbook is templatized. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.
