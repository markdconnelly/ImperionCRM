# Stage 03 — record-procurement-finding

**Job:** record the procurement conformance finding and auto-surface it to the governance
dashboard. No correction, no re-run, no re-order, no config change.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Evaluation | `evaluation.md` (stage 02) | per-rule verdicts + divergences | the finding content |

## Process

1. `[script]` Assemble the procurement conformance finding: overall verdict (conform /
   diverged), the diverged rules with their references, and the measured-vs-inferred labels.
2. `[script]` Auto-surface the finding to the governance dashboard (internal, reversible — a
   finding can be dismissed). At L2 this raises without being asked.
3. `[script]` Do **not** correct, re-run, rewrite, re-order, or change config. Any correction
   is `always_gate` to Vance / a human; the deviation routing + closure is A9 (#1467).

## Outputs

`finding.md` — the procurement conformance finding (verdict + diverged rules by reference +
as-of trace id), surfaced to the dashboard. A divergence becomes A9's routing input (routed
to Vance); it is not acted on here.

## Checkpoint — Mark/Vance loop

The finding parks for Mark / Vance. Vera recommends; Vance (or a human) acts. No correction
is executed at any rung.

## Audit

- [ ] Finding assembled (verdict + diverged rules by reference)
- [ ] Surfaced to the dashboard (internal, reversible)
- [ ] Nothing corrected / re-run / re-ordered / config-changed (audit-and-recommend)
