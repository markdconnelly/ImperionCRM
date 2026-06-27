---
adr: NNNN
title: "Platform-scope credentials — AI provider keys custodied through the connection registry"
status: accepted
date: 2026-06-27
repo: frontend
summary: "Custody the AI provider keys (Voyage embeddings, Claude generation) through the connection credential registry (ADR-0103) instead of hand-seeded App Service settings (ADR-0034). Adds a system-wide `platform` connection scope (no account, custody-only — no sync cadence/poll/bronze), a raw-scalar `auth_method='api_key'` shape (resolver branches: api_key→scalar, connection→JSON blob), the KV naming standard `conn-platform-<provider>` (`conn-platform-voyage`, `conn-platform-anthropic`, superseding the ADR-0034 names), a dedicated write-only card on the admin-only connections page (ADR-0122) gated by the existing app-admin gate, and validate-before-write (one cheap live provider call). The backend writes to Key Vault via its managed identity; the model-router resolves platform keys through the registry, dropping the app-setting indirection; LP repoints the embedding-key read and the mis-named starter secret is retired (folds LP #389). Supersedes the ADR-0034 KV-name note; amends ADR-0103."
tags: [connections, security, ai]
---
<!-- ADR number is a placeholder; claim the next free number at merge per CLAUDE.md §10.3 -->
# ADR-NNNN: Platform-scope credentials — AI provider keys custodied through the connection registry

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-27 |
| **Cross-references** | ADR-0103 (connection credential registry — amended here: platform scope + api_key raw-scalar shape), ADR-0034 (backend AI-key custody — KV-name note superseded here), ADR-0122 (connections page), ADR-0024 (per-user/company connections), backend ADR-0035 (Easy Auth + caller allowlist), LP #389 (embedding-key repoint) |

## Problem

ADR-0103 made every Key-Vault-custodied credential legible through the connection
registry, but it scoped that registry to *connections* — `user` / `company` / `client`
— each holding a multi-field JSON credential blob. The AI provider keys (Voyage
embeddings, Claude generation) live outside it. ADR-0034 had the operator hand-seed
them as App Service settings, with the App Setting pointing at ad-hoc Key Vault names
(`Voyage-Embedding-API-Key`, `Claude-Platform-API-Key-Main`). That arrangement needs
Azure-portal privilege to seed or rotate, drifts from the `conn-*` naming standard (a
hand-typed name has already been mis-set — a "starter" key sitting at a non-standard
name), and offers no governed surface that says which AI keys exist and whether they
are valid. We need a non-privileged app-admin to seed and rotate AI keys from the GUI,
with the backend owning the canonical Key Vault name.

## Context

- `connection` (ADR-0103 / ADR-0024) already holds `scope`, `provider`,
  `keyvault_secret_ref` (the Key Vault *name* only — the value never touches the DB,
  CLAUDE.md §5), `auth_method` (`certificate` | `secret`), and `status`.
- The connections page (ADR-0122) is the single admin surface for company- and
  client-scope connections and is admin-gated.
- Today the backend reads the AI keys via the App Settings `VOYAGE_API_KEY_SECRET` /
  `ANTHROPIC_API_KEY_SECRET`, each of which resolves to a Key Vault name; the local
  pipeline reads `Voyage-Embedding-API-Key` directly from Key Vault (with a SecretStore
  fallback `embedding-provider-key`).
- Recall is not live yet — no vectors in production depend on the current names, so a
  rename of the AI-key secrets is cheapest now, before hydration.

## Options considered

1. **Keep AI keys as operator-seeded App Settings (status quo, ADR-0034).** Requires
   Azure-portal privilege to seed or rotate, has no governed surface, and is the source
   of the naming drift we are trying to kill.
2. **A bespoke `/settings/ai` card plus a dedicated endpoint.** Solves the GUI-seeding
   need but stands up a *second* credential write path and a *second* naming authority
   — exactly the duplication ADR-0103 collapsed, reintroducing the drift risk.
3. **Extend the connection registry with a `platform` scope.** One write path, one
   naming authority, one resolver, one audit trail. The AI keys become rows in the
   registry that already custodies every other secret.

Chose option 3: it reuses the single governed surface rather than forking a second one.

## Decision

A system-wide `platform` scope is added to the connection registry, and the AI provider
keys are custodied through it. The eight decisions:

1. **Platform scope.** Add `platform` to `connection_scope`: a system-wide
   infrastructure secret with **no `account_id`** (it serves the whole installation, not
   a user, the company-as-client, or a managed customer).
2. **Custody-only.** A platform row carries **no sync cadence, no poll, no bronze** — it
   is not a data source. The row exists solely so the runtime can resolve the secret by
   `(scope, provider)`.
3. **Naming standard.** Platform secrets follow `conn-platform-<provider>` —
   `conn-platform-voyage`, `conn-platform-anthropic` — **superseding** the ADR-0034 names
   `Voyage-Embedding-API-Key` and `Claude-Platform-API-Key-Main`. All readers repoint.
4. **Raw-scalar value + `auth_method='api_key'`.** A platform AI key is a single opaque
   scalar, not a multi-field blob. The credential carries `auth_method='api_key'`, and
   the registry resolver **branches on `auth_method`**: `api_key` returns the scalar
   verbatim, `connection` (the existing blob shape) returns `JSON.parse(...)`. This keeps
   SDK readers parse-free for the scalar case and sidesteps the blob-extract bug class.
5. **Dedicated card, write-only.** The surface is a dedicated card on the admin-only
   connections page (ADR-0122), `scope=platform`, with **no account picker**. It is
   **write-only**: it renders provider · last-set timestamp · validation status, and
   **never the value**.
6. **Authorization = existing app-admin gate.** The connections page's existing app-admin
   gate governs the whole page, including this card; an **app-admin — not an
   Azure-privileged human — seeds every source, including the platform AI keys**. The
   backend writes to Key Vault via its **managed identity**. Authorization is enforced
   twice: Easy Auth + caller allowlist (backend ADR-0035) plus the page admin gate. No
   new role is introduced.
7. **Validate-before-write.** On submit the backend makes **one cheap live call** — a
   tiny Voyage embed or a 1-token Claude ping — and **writes the secret only on
   success**, persisting the validation status.
8. **Read-side resolution.** The backend **model-router resolves platform AI keys through
   the registry** by `(scope=platform, provider)`, dropping the
   `VOYAGE_API_KEY_SECRET` / `ANTHROPIC_API_KEY_SECRET` App-Setting indirection. The
   local pipeline reads `conn-platform-voyage`. The mis-named starter secret is retired in
   the same change.

## Consequences

### Security impact

Secret **values still never touch the DB or the GUI** — only the Key Vault name and
metadata (provider, last-set, validation status) are surfaced; the key stays in Key Vault
(CLAUDE.md §5). The card is **write-only and admin-gated**. This introduces a
higher-blast write path — a bad or hostile platform key affects model spend across the
whole installation — but the blast is mitigated by the write-only surface, the app-admin
gate, an audit row on every write, and validate-before-write (a key that fails its live
probe is never persisted). There is **no approval/dual-control workflow in v1** (a
set-once key); that can be layered later. This change also **redefines the registry from a
"connection registry" into a "secret-custody registry"**: it already custodies the
non-connection M365 enterprise-app credential, and the platform scope makes that
generalization explicit.

### Cost impact

Additive — one enum value (`platform`) plus the provider rows, on the existing table; no
new store. The one-time read-side repoint (model-router + LP) is the only code cost, and
it is cheapest now because recall is not yet live (no vectors are pinned to the old
names).

### Operational impact

An app-admin can **seed and rotate the AI keys from the GUI with zero Azure rights**. The
existing hand-seeded starter key is **reconciled** to `conn-platform-voyage` in a one-time
ops step. **LP #389 folds** from "seed the embedding key" into "read the registry name
`conn-platform-voyage`," and the mis-named starter secret is retired.

## Future considerations

- An **approval workflow / dual-control** can be layered on platform-key management if it
  is ever delegated more widely than a single trusted app-admin.
- The `platform` scope **generalizes to any future system-wide infrastructure secret**
  (signing keys, shared service tokens), not just AI provider keys.
- **Key-rotation reminders** can hang off `connection.status`, exactly as the catalog
  already renders connection health for other scopes.
