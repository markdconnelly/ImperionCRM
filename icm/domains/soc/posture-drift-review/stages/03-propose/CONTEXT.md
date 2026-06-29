# Stage 03 — propose

**Job:** for each drift/degradation finding, propose an investigation or hardening
recommendation; otherwise note a clean posture. The checkpoint — hand off to Roman.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Posture read | stage 01 `posture-read.md` | full | the assets + owning account |
| Drift findings | stage 02 `drift-findings.md` | full | classified findings + evidence chain |
| Owning account | silver `account` · `okf:account` | the customer | handoff context |

## Process

1. `[script]` Read the classified findings; route: `drift`/`degradation` →
   investigation/hardening proposal; only `within-baseline` → clean-posture note.
2. `[sonnet]` Draft the recommendation per finding. For a hardening proposal, name the
   asset-scoped investigation or hardening step (e.g. investigate `device` X's drifted
   control, re-harden the lapsed posture item) and why — **proposal only, NOT executed
   at v1**. Identity, destructive, and client-facing actions are explicitly excluded —
   flag them as Roman-only.
3. `[script]` Assemble the handoff packet: findings, evidence chain, proposed
   investigations/hardening, always-gate flags.

## Outputs

`proposal.md` — the per-finding verdict, cited evidence chain, the proposed
investigation/hardening (or clean-posture note), and the always-gate flags. The run
**parks and hands off to Roman** (Deputy CISO); v1 has no actuation path. Nothing is
contained, written, sent, or executed from here.

## Audit

- [ ] Every proposal is an investigation or asset-scoped hardening recommendation, OR a clean-posture note
- [ ] No containment, write, or actuation is proposed for auto-execution
- [ ] No identity, destructive, or client-facing action is proposed for auto-execution
- [ ] The packet is a handoff to Roman — no send, no actuation (v1)
- [ ] No client PII or secret material in the record (audit-by-reference)

## Checkpoint

The human (Roman) approves the proposed investigations/hardening. When the workflow is
flipped to `auto`, this stage may self-approve ONLY recording the internal drift-finding
for a review with an audit-clean evidence chain. Every proposed investigation, every
hardening recommendation, and any identity/destructive/client-facing effect always
parks for Roman — in every mode (CONSTITUTION §5.4).
