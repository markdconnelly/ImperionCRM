# Stage 03 — contain-or-propose

**Job:** on a high-confidence reversible detection, draft the containment action;
otherwise propose investigation or dismissal. The checkpoint — hand off to Roman.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Triage record | stage 01 `triage.md` | full | the verdict + assets |
| Enrichment | stage 02 `enrichment.md` | full | evidence chain + confidence |
| Owning account | silver `account` · `okf:account` | the customer | handoff context |

## Process

1. `[script]` Read the confidence rating and verdict; route: high-confidence +
   reversible + asset-scoped → containment-proposal; else → investigate/dismiss.
2. `[sonnet]` Draft the recommendation. For a containment proposal, name the
   reversible asset-scoped action (e.g. isolate `device` X with an undo window —
   the L4 ceiling, NOT executed at v1) and why. Identity, destructive, and
   client-facing actions are explicitly excluded — flag them as Roman-only.
3. `[script]` Assemble the handoff packet: verdict, evidence chain, proposed
   action, always-gate flags.

## Outputs

`proposal.md` — the verdict, cited evidence chain, the proposed reversible
containment (or dismissal/investigate note), and the always-gate flags. The run
**parks and hands off to Roman** (Deputy CISO); v1 has no actuation path. Nothing
is sent or executed from here.

## Audit

- [ ] The proposed action is reversible and asset-scoped, OR it is a dismissal/investigate note
- [ ] No identity, destructive, or client-facing action is proposed for auto-execution
- [ ] The packet is a handoff to Roman — no send, no actuation (v1)
- [ ] No client PII or secret material in the record (audit-by-reference)
