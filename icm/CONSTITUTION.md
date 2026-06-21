# ICM Constitution — the inherited contract every domain and workflow obeys

This is the **runtime meta-policy** for the agent layer (ADR-0088, amending ADR-0061).
It is to `agent.yaml` manifests what the system-level CLAUDE.md §4 is to repo CLAUDE.md
files: a small set of clauses every domain and workflow **must declare and obey**,
enforced downward by conformance (CI `icm-conformance`, #702) — never re-argued per
workflow.

The universals below — Governance, Identity, Observability, Data Platform — are
**inherited from here, not peer folders**. A worker is *born under* them; it cannot route
around them because they were never a destination.

## 1. What a worker is

A trigger → deterministic triage/dispatch (code, ADR-0087) → an **ephemeral, run-scoped**
worker provisioned from a workflow `agent.yaml`. The agent object is created once and
versioned; the **session is the per-run spin-up**. No long-lived per-domain persona.

Runtime: **self-hosted Managed Agents** (ADR-0088) — Anthropic runs the loop; tools
execute on our infra. Client data never leaves our environment.

## 2. The composition split (why prose and structure are separate)

The Claude API carries `system` (prose) and `model`/`tools`/`mcp_servers`/`skills` as
**separate structured fields**. The loader honours that split:

- **`system`** is composed, in order, from `CONSTITUTION.md` → the domain `room.md` → the
  workflow prose. This prefix is **stable, so it caches**. Never interpolate per-run
  volatile data into it (caller identity, this-run rooms) — inject that at session time.
- **Structured fields** (`model`/`tools`/`skills`/`mcp_servers`/`okf_rooms`/
  `autonomy_rung`) carry everything **enforced**. Least-privilege lives here, not in prose
  — a prompt is not an enforcement surface.

## 3. Required `agent.yaml` keys (every workflow)

| Key | Rule |
|---|---|
| `name` | unique within the domain |
| `model` | a settled-stack model (ADR-0043) |
| `system_compose` | ordered list ending at the workflow prose; MUST begin with `CONSTITUTION.md` then the domain `room.md` |
| `tools` | least-privilege; **⊆ the domain's tools** |
| `okf_rooms` | the data scope; **⊆ the domain's rooms**; every entry resolves to a `coverage-matrix` row whose `domain` matches this workflow's domain (or `kernel`) |
| `skills` | cross / domain / workflow tiers only (CONVENTIONS §skills) |
| `autonomy_rung` | `L0`–`L3`; states what `auto` may self-approve |
| `mcp_servers` | optional; credentials via vaults, never inline |

**The least-privilege chain is invariant:** `workflow ⊆ domain ⊆ Constitution` on tools
and rooms. Widening at the workflow tier is a conformance failure.

## 4. Required prose sections (domain `room.md` + workflow prose)

Domain `room.md` (thin): source-of-record posture · the domain's OKF rooms · voice ·
default autonomy rung · escalation. Workflow prose: the job · its stages' intent ·
what `auto` may self-approve. A fact lives at **one** tier; lower tiers cite, never
restate (the canonical-source rule).

## 5. The non-negotiables (inherited by every worker)

1. **Sends exit only through ADR-0058** (approval-gated, consent re-asserted). No stage
   reaches an external party by any other route.
2. **Least privilege & never exceed the caller.** A worker's permission scope never
   exceeds the invoking user's (ADR-0016). Tools/rooms are allow-listed, not implicit.
3. **No secrets, no client PII in any `icm/` file** (ADR-0060) — these files replicate
   everywhere. Reference data by id/location, never by value. Non-MCP secrets stay
   host-side (custom tool); MCP creds in vaults.
4. **One human queue.** Customer-facing actions, money, prod-migration, deploy, and
   `X.0.0` route to the single Mark-gate, regardless of rung.
5. **Autonomy is data.** Every workflow starts `draft`; the flip to `auto` is admin-only,
   audited, reversible, and read from `autopilot_policies` (ADR-0061/0087) — not code.
6. **Audit canon stays ours.** Session events mirror into `agent_run`/`agent_message`
   (Backend #163); the Postgres ledger is authoritative.

## 6. The inherited horizontals (wrappers, not workflows)

| Horizontal | What it enforces, on every worker |
|---|---|
| **Governance / Policy** | clauses §5; PII-note + autonomy-rung checks across every entity |
| **Identity / Access** | Entra identity; never-exceed-caller; tool/room allow-lists |
| **Observability** | the run ledger, health/SLA, drift, reconciliation-assurance (ADR-0087) |
| **Data Platform** | the medallion substrate every domain reads; owned by none |

Security-as-a-delivered-service (posture monitoring, IR) is a **vertical** (Security Ops);
security-of-our-own-agents is this Governance wrapper. Do not conflate them.

## 7. Change control

Changing this file, a `room.md`, or an `agent.yaml` is a normal unit of work: issue →
micro-PR (ADR-0060/0061). An ADR that supersedes a clause here updates this file in the
same PR. Conformance is gated by CI (#702).
