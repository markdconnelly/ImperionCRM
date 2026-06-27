# AI governance — admin guide

> **Audience:** platform administrators / operators. **Surface:** **Settings → AI →
> Governance** (`/settings/governance`); also linked from **Settings → Tools &
> configuration**. **Access:** admin (the `agents:operate` capability). Decision
> records: **ADR-0080 / ADR-0081** (the action plane), **ADR-0050** (admin-only agent
> operation). Issue: **#1408** (parent epic **#1038**).
>
> [← Admin guides](README.md) · [Settings & configuration](settings.md) ·
> [Autonomy dial](../agents/autonomy-dial.md)

## What this is

The agent **action plane** — every outbound, money, provisioning or write action an
agent takes — runs through a backend **gauntlet** at dispatch. A small set of
operator-tunable **governance gates** contain that plane: a kill-switch, a per-client
default, throughput / spend caps, a circuit breaker, and the approval TTL. They live
in the `agent_governance_setting` table (key/value JSONB, migration 0163) so they are
**tunable mid-flight without raw SQL and without a deploy** — changing a value here
takes effect on the next run.

This surface is the GUI over those seven seeded rows. The web role holds
`SELECT, UPDATE` only (migration 0163): you tune values; you never add or remove keys.

## The gates

| Gate | Key | Value | Default | What it does |
| --- | --- | --- | --- | --- |
| **Kill-switch** | `killswitch.scope` | `{global, per_agent[], per_workflow[]}` | all off | Master stop (`global`) plus targeted stops by agent slug or workflow. All off = normal operation (#269). |
| **Per-client default** | `optout.default` | `opt_in` \| `opt_out` | `opt_in` | The autonomy posture a **new** client starts with until an admin overrides it. `opt_out` = observe-only until enabled (#270). |
| **Rate cap** | `caps.rate_per_minute` | integer 1–10000 | 60 | Max actuation attempts per agent per minute (#271). |
| **Fan-out cap** | `caps.fanout_per_run` | integer 1–1000 | 10 | Max parallel/queued actions one run may spawn (#271). |
| **Cost cap** | `caps.cost_usd_per_run` | USD 0–10000 | 5 | Per-run LLM + embedding spend ceiling; over → circuit-break (#271/#272). |
| **Circuit breaker** | `circuit_breaker.error_rate` | 0–1 | 0.25 | Rolling error-rate threshold that trips the breaker (#272). |
| **Approval TTL** | `approval.ttl_days` | integer 1–365 | 7 | How long a pending approval lives before the reaper expires it (#273). |

Out-of-range numeric input is **clamped to the bounds on save** — the form never
rejects a value, it pins it to the nearest legal one.

## How to use it

- **Engage the kill-switch in an incident.** Tick **Global kill-switch** to stop the
  entire plane immediately, or list specific agent slugs (e.g. `felix, chase`) /
  workflow slugs (e.g. `technician`) to stop only those. The lists are comma- or
  newline-separated, trimmed, lower-cased and de-duplicated on save. Untick / clear
  to resume.
- **Set the new-client posture.** Choose `opt_out` while the agent layer is still
  being proven so a freshly onboarded client's agents stay observe-only until you
  explicitly enable them.
- **Tune throughput, spend and approvals** in the **Caps, circuit breaker &
  approvals** card.

## Security & audit

- **Admin-gated, fail-closed.** Every save requires `agents:operate` (admin). Non-
  operators see the values **read-only**; the server actions also enforce the
  capability, so the UI hiding is defense-in-depth, not the only control (ADR-0030 /
  ADR-0045).
- **Attributable.** Each save stamps `updated_by` (the admin's email) and
  `updated_at`.
- **No secrets, no PII.** These are numeric/string config values only. This is
  app-native control config (doctrine archetype H) — **not** a silver entity, so no
  OKF concept file applies.
- **Enforcement is in the backend, not here.** This surface only persists the values.
  The gauntlet reads them at dispatch; the kill-switch and caps are only as strong as
  that enforcement (BE wave work, parent epic #1038).
