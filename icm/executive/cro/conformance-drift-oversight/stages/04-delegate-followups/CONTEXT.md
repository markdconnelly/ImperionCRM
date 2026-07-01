# Stage 04 — delegate-followups

**Job:** optionally emit a proposed `delegate()` to Vera for grounded suspected-drift
verification (observation only) and/or a `handoff()` to Nova when cross-division,
then park — Jessica never applies a fix and never touches a dial.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Brief | stage 03 `brief.md` | the flagged drift / quarantine items | what may warrant a follow-up |

## Process

1. `[sonnet]` For each **suspected** finding that warrants confirmation, draft a
   **proposed** `delegate()` to **Vera** (Platform): the agent/workflow, the drift
   class, and the evidence references — a *verification/observation* ask only; never
   a correction, config change, or dial ask (Vera is a watcher too — she recommends,
   never fixes).
2. `[sonnet]` Where the drift is cross-division (e.g. a conformance failure whose
   owner sits outside Platform & Assurance), draft a `handoff()` to **Nova** instead,
   naming the division and the reason.
3. `[script]` Attach each delegate/handoff to the brief as a proposal and park. No
   fix applied, no dial moved, no control ratified — every correction, governance
   change, and ratification stays always-gated to Mark.

## Outputs

`followups.md` — the proposed `delegate()` calls to Vera and/or `handoff()` calls to
Nova, each citing the agent/workflow and the evidence references. The run ends here
at the checkpoint; any corrective action happens on Mark's decision, never here.

## Audit

- [ ] Every delegate names the agent/workflow, the drift class, and its evidence references
- [ ] Every delegate is a verification/observation ask — no correction, config, or dial ask routed to anyone
- [ ] Cross-division items are handed off to Nova, not delegated inside the division
- [ ] No client PII reproduced — everything by reference
- [ ] Read-only — no config changed, no dial touched, no fix applied

## Checkpoint

The follow-ups park for **Mark**, and any delegate is a **proposal** to Vera. `auto`
may self-approve ONLY emitting the `delegate()` to Vera for flagged drift
verification that is grounded and cited, and the `handoff()` to Nova when
cross-division; every correction, autonomy-dial change, governance-config change, and
control ratification is always-gated to Mark (CONSTITUTION §9, jessica.md §6). The
assurance line never holds the levers it audits; any ungrounded or out-of-scope item
parks for Mark.
