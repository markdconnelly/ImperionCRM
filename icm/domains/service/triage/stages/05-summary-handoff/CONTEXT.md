# Stage 05 — summary-handoff  ·  CHECKPOINT

**Job:** hand the triaged ticket to a human with an internal executive-summary note
and a recommended next step.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Dossier | stage 01 `dossier.md` | problem statement | the summary |
| Triage decision | stage 03 `triage-decision.md` | path, severity, logic | the summary |
| Troubleshooting log | stage 04 `troubleshooting-log.md` | findings, hypothesis | the summary + next step |
| Ticket | silver `ticket` · `okf:ticket` | id, status | the note target + still-open re-check |

## Checkpoint

The approval item shows: the executive-summary note and the proposed next action,
with the severity, path, and decision logic that produced them. The approver may
edit the note body before approving; edits are kept as the written version and
recorded.

**`auto` mode may self-approve ONLY when ALL hold** (Layer-1 contract): the action
is the INTERNAL operational work-note (`ticket.note`) · stage-03 and stage-04 audits
are fully green · the note contains no client-facing content. **Everything else
parks for a human in every mode** — the next-step proposal, and anything
customer-facing, financial, or remediating.

## Process

1. `[script]` Re-check the ticket is still open and unchanged since stage 01
   (optimistic concurrency). Changed → park with a re-grounding note; do not write.
2. `[sonnet]` Compose the executive-summary work-note for a human technician's
   decision: problem · path + why · what was checked · leading hypothesis ·
   recommended next step. Internal-only; never client-facing language.
3. Park until approved (or auto-approve the note per the Checkpoint). On approval,
   write the INTERNAL note via `ticket.note` — the approval-gated executor performs
   the write (the only actuation in this workflow); this is not a client send.
4. `[sonnet]` Emit the recommended next action/sequence as a **parked**
   `ProposedAction` (e.g. run a remediation sequence, dispatch to a technician,
   request client info). Always parks for a human decision in v1.

## Outputs

`handoff.md` — the executive-summary note (as written/approved) · the note write
result (or `parked, awaiting approval`) · the parked next-step proposal.

## Audit

- [ ] Ticket re-checked still-open before any write
- [ ] The note is internal-only (no client-facing content) and `operational` class
- [ ] The next-step proposal is recorded as parked (never auto-executed in v1)
- [ ] The note write result is captured (or `parked, awaiting approval`)
