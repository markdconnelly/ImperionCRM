# The uniform procedure document ↔ ICM Workspace — mechanics

**Status:** decided (design / ADR-0133 D5 + ADR-0136 A8 made concrete). **Issue:** #1616 (epic #1534).
**Cites:** ADR-0133 (Operating Procedure catalog, D5) · ADR-0136 (Workflow Doctrine A8 — one uniform
dual-audience document, revises D5) · ADR-0088 (ICM domain tier / `system_compose`) ·
`icm/CONVENTIONS.md` (build standard).

## The problem

ADR-0136 A8 collapses D5's two-artifact model (ICM Workspace = SoR **plus** a separate generated
`docs/runbooks/` projection) into **one uniform, dual-audience document** per realized Operating
Procedure — single-sourced prose a human trains on AND an agent executes from. But an ICM Workspace
is already several files: `agent.yaml` (machine config), `room.yaml` (budget), `prose.md` (workflow
prose), `stages/NN-*/CONTEXT.md` (per-step contracts). This note pins **how the one uniform document
physically relates to the workspace** so the build wave authors workspaces without forking the prose.

## Decision

**The ICM Workspace IS the single source. The uniform document is a deterministic, read-only
RENDERING of the workspace's prose — nothing is hand-authored twice, and nothing generates the
config from a doc.**

1. **No doc → config generation, and no config → second doc.** A8 did **not** move the source of
   record off the ICM Workspace; it killed the **separately hand-authored human runbook**. So:
   - **Machine config stays SoR in the workspace** — `agent.yaml` (tools / okf_rooms / rung /
     `system_compose`) and `room.yaml`. Authored directly, conformance-gated. The uniform document
     never generates these.
   - **Prose is single-sourced in the workspace** — `prose.md` (workflow intent) + each
     `stages/NN-*/CONTEXT.md` (the per-step Job / Inputs / Process / Outputs / Audit / Checkpoint).
     **The stages ARE the procedure steps**, already dual-audience: a human reads them as a runbook,
     an agent executes them. There is **no second human-runbook file**.

2. **The uniform document = a deterministic projection (render), not an authored file.** The single
   human-readable document for a realized procedure is produced by **rendering** the workspace prose
   in stage order — concatenate: the catalog entry header (owner/stream/trigger/terminal/ceiling) →
   `room.md` domain context (cited, not restated) → `prose.md` → each `stages/NN-*/CONTEXT.md` in
   order. This rendered document is the **read-only** human runbook and the artifact pushed to IT
   Glue (#1615). It is regenerated from the workspace; it is never edited in place (an edit goes back
   to the workspace prose).

3. **Pre-graduation (fully-human procedures) live natively as one file.** A procedure with **no**
   `[automation]`/`[hybrid]` step has no ICM Workspace yet; it lives as a single dual-audience
   `docs/runbooks/<stream>/<proc>.md`. That file **is** the uniform document for now (human trains on
   it; there is nothing to execute). On **graduation** (it gains an automatable step → gets an ICM
   Workspace), its content moves into the workspace prose (`prose.md` + `stages/`), the workspace
   becomes the config SoR, and the uniform document is thereafter the rendered projection (§2). The
   `docs/runbooks/` file is then retired (replaced by the render) to avoid two competing prose homes.

4. **The conformance-checkable invariant (one home, never two).** For every realized Operating
   Procedure, exactly one prose home holds:
   - **either** a `docs/runbooks/<stream>/<proc>.md` (pre-graduation, fully-human),
   - **xor** an ICM Workspace (`icm/domains/<domain>/<workflow>/`) whose render is the uniform doc
     (post-graduation),
   - **never both** (a workspace + a hand-authored runbook for the same procedure = a fork, the
     defect A8 forbids). A future lint can assert this XOR from the catalog (each catalog entry's
     `Realization` field names its one home), alongside the existing `workflow ⊆ domain ⊆
     Constitution` + `icm-conformance` checks (which are **unchanged** — the uniform doc adds no
     config surface).

## Why this shape

- Preserves "ICM Workspace = execution/config SoR" (D5's load-bearing half) while honoring A8's "one
  document, single-sourced prose" — because the workspace prose **is** the document, rendered.
- Zero new authoring burden and zero fork risk: authors write the workspace once; the human runbook
  falls out of a render. The IT Glue push (#1615) consumes that render.
- Conformance is untouched: no new tools/rooms, no change to `system_compose`, no new gate required
  in v1 (the XOR lint is an optional hardening).

## Out of scope

Building the renderer (a deterministic concat of existing files — a small generator, later) and the
XOR lint (optional hardening). The IT Glue push mechanics are #1615 / LP.

## Acceptance (this issue)

- [x] Pinned: workspace is SoR; uniform doc = deterministic render of workspace prose; config never
      generated from a doc; prose never authored twice.
- [x] Pinned the pre-graduation native home (`docs/runbooks/<stream>/<proc>.md`) and the graduation
      hand-off.
- [x] A conformance-checkable shape (the one-prose-home XOR invariant) defined; existing
      `icm-conformance` + subset invariants preserved.
