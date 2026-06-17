# `agent.yaml` — the ICM workspace manifest

The declarative, per-workspace manifest that defines an ICM worker. It is the
single artifact the **backend loader** (Backend #162) turns into a **CMA agent
object**, and the artifact the **CI conformance gate** (`icm-conformance`, #702)
validates. One `agent.yaml` lives beside each workflow's prose at
`icm/domains/<domain>/<workflow>/agent.yaml`.

[← The AI suite](README.md) · Governing decision:
[ADR-0091](../decision-records/ADR-0091-agent-icm-platform-consolidated.md)
(from ADR-0088, amending ADR-0061; budget files ratified by ADR-0089). Sibling
guides: [icm.md](icm.md) · [cma-runtime.md](cma-runtime.md).

- **Machine contract:** [`icm/agent.schema.json`](../../icm/agent.schema.json) (JSON
  Schema, draft-07).
- **Validator / gate:** [`scripts/agent-yaml-gate.mjs`](../../scripts/agent-yaml-gate.mjs)
  (pure functions + a CLI; the same logic the loader and CI both run).
- **Inherited contract:** [`icm/CONSTITUTION.md` §3](../../icm/CONSTITUTION.md) (required
  keys) · [`icm/CONVENTIONS.md`](../../icm/CONVENTIONS.md) (tree + naming).

## Why prose and structure are split

The Claude API carries `system` (a prose string) and `model` / `tools` /
`mcp_servers` / `skills` as **separate structured fields**. CMA formalises exactly
this shape: a versioned **agent** object (`system` + structured fields) with a
**session** per run. `agent.yaml` maps to it **1:1**:

| CMA agent object | `agent.yaml` |
|---|---|
| `system` (cached prefix) | **composed** by the loader from `system_compose` |
| `model` | `model` |
| `tools` | `tools` |
| `mcp_servers` | `mcp_servers` |
| (config) skills | `skills` |
| (config) autonomy | `autonomy_rung` + `auto_may_self_approve` |
| (config) data scope | `okf_rooms` |

`system` is **composed, never authored inline**: the loader concatenates, in
order, `CONSTITUTION.md` → the domain `room.md` → the workflow `prose.md`. That
prefix is **stable, so it prompt-caches** — never interpolate per-run volatile
data (caller identity, this-run rooms) into it; that is injected at session time.
Everything **enforced** lives in the structured fields, because a prompt is not an
enforcement surface.

## Fields

| Key | Req | Shape | Meaning |
|---|---|---|---|
| `name` | ✓ | kebab-case string, unique in domain | the workspace name |
| `model` | ✓ | settled-stack enum (ADR-0043) | `claude-opus-4-8` · `claude-sonnet-4-5` · `claude-haiku-4-5` |
| `system_compose` | ✓ | ordered `.md` list, ≥3 | starts `CONSTITUTION.md`, then domain `room.md`, ends at workflow `prose.md` |
| `tools` | ✓ | string allow-list | least-privilege; **⊆ domain ⊆ Constitution** |
| `okf_rooms` | ✓ | string allow-list | OKF data scope (ADR-0086); **⊆ domain ⊆ Constitution**; each resolves to a `coverage-matrix` row |
| `autonomy_rung` | ✓ | `L0`–`L3` | what `auto` may self-approve |
| `skills` | — | path list | runtime skills, cross/domain/workflow tiers (CONVENTIONS) |
| `auto_may_self_approve` | — | string | prose statement of the rung's self-approve scope; unstated → parks for a human |
| `mcp_servers` | — | mapping list | optional; **credentials by `vault_secret_ref` only, never inline** (ADR-0060) |

### Example

```yaml
name: expense-close
model: claude-opus-4-8
system_compose:                 # ordered; MUST start Constitution -> domain room
  - ../../CONSTITUTION.md
  - ../room.md
  - ./prose.md
okf_rooms: [expense_item, expense_report]   # ⊆ domain.okf_rooms
tools: [pg.read, autotask.expense.write]    # ⊆ domain.tools
skills:
  - icm/skills/voice-and-tone
  - domains/finance/skills/close-rules
  - ./skills/categories
autonomy_rung: L2
auto_may_self_approve: "clean-audit reimbursements with an existing category mapping"
mcp_servers:
  - name: docusign
    vault_secret_ref: kv://docusign-oauth   # a reference, never a value
```

> The live reference manifest is
> [`icm/domains/sales/lead-response/agent.yaml`](../../icm/domains/sales/lead-response/agent.yaml)
> (`model: claude-sonnet-4-5`, `autonomy_rung: L1`).

## The invariant: `workflow ⊆ domain ⊆ Constitution`

Least-privilege is **structural**, not prose. For both `tools` and `okf_rooms`:

```
workflow.tools     ⊆ domain.tools     ⊆ Constitution    (tool allow-list)
workflow.okf_rooms ⊆ domain.okf_rooms ⊆ Constitution    (data scope)
```

The **Constitution is the outer allow-list**, the **domain narrows it**, the
**workflow narrows further**. Widening at any inner tier is a conformance failure
— a workflow may not name a tool or room its domain does not grant, even one the
Constitution permits domain-wide. The domain and Constitution budgets live in
sibling **budget files** (`icm/domains/<d>/room.yaml`, `icm/CONSTITUTION.yaml`) —
their naming, location, `{tools, okf_rooms}` shape, and the absent-tier
degradation rule are ratified in **ADR-0089** (the budget-file convention),
extending ADR-0088 §3. When an upper tier's budget is absent, its bound is the
next-lower declared list (so an absent budget can never be widened past — see
ADR-0089 §3); the gate still fully shape-checks every manifest regardless.

> **Doc-vs-comment note (2026-06-16).** A header comment in
> `icm/CONSTITUTION.yaml` still says the budget-file convention is "NOT yet
> ADR-ratified." That comment predates **ADR-0089**, which *does* ratify it; the
> clauses themselves were always ratified (CONSTITUTION.md §3/§5). Treat ADR-0089
> as the source of truth; the stale comment is a follow-up cleanup, not a real
> gap.

## OKF room resolution (#702)

The subset invariant guarantees a manifest stays *within* its domain budget; it
does not, on its own, guarantee the room **names are real**. The conformance gate
closes that gap by resolving every `okf_rooms` entry — in a manifest **and** in a
domain's `room.yaml` budget — against the canonical OKF map,
[`docs/database/semantic-layer/coverage-matrix.md`](../database/semantic-layer/coverage-matrix.md)
(ADR-0086). Per room, the gate requires:

1. **Resolution** — the room is a known object in the coverage matrix (catches a
   typo or a phantom room name that subset alone would wave through).
2. **Concept-backing** — that matrix row has a concept file (IKF status `✅`). An
   agent may only be granted read scope on a *meaning-bearing* silver entity, not
   one that is still `⏳` planned.

The matrix's **`domain` column** is what makes this a gate rather than prose: it
is parsed, not just rendered. Vertical fit (which domain *owns* a room) is **not**
re-checked here — the reviewed domain `room.yaml` budget is the authority for which
verticals a domain may read (kernel / horizontal / deliberate cross-vertical seams
like a sales workflow reading the Knowledge `interaction` room), and the subset
check already binds every workflow to that budget. Resolution + concept-backing is
the new, additive guarantee.

## How it is consumed

- **Backend loader (#162):** validates the manifest against
  `icm/agent.schema.json`, runs the subset invariant, composes `system` from
  `system_compose`, and creates/versions the CMA agent object. The agent object is
  created once and **versioned on change**; the **session** is the per-run spin-up.
  Sends exit only via ADR-0058; secrets stay host-side (MCP creds in vaults). The
  end-to-end runtime is [cma-runtime.md](cma-runtime.md).
- **CI gate (`icm-conformance`, #699 + #702):** `node scripts/agent-yaml-gate.mjs`
  walks `icm/` and fails the PR on any shape violation, subset (least-privilege)
  violation, or unresolved/concept-less `okf_rooms` entry (resolved against the OKF
  coverage matrix — see [OKF room resolution](#okf-room-resolution-702)). The pure
  functions in that module are exported so the loader can import the **same** checks
  rather than reimplement them — one contract, no drift.

## Security

- **No secrets, no client PII** in `agent.yaml` (ADR-0060) — these files
  replicate to every agent machine. Reference data and credentials by
  id / location / `vault_secret_ref`, never by value. The gate rejects inline
  `token`/`secret`/`password`/`api_key`/`key` on `mcp_servers` entries.
- **Least privilege is the allow-list**, enforced by the subset invariant above —
  the worker's scope never exceeds the invoking user's (ADR-0016) and never
  exceeds what its domain grants.

## Changing a manifest

Issue → branch → micro-PR (ADR-0060/0061), one workspace per PR. An ADR that
supersedes a clause this manifest obeys updates the manifest in the same PR.
Conformance is gated by CI (`icm-conformance`, #702).
