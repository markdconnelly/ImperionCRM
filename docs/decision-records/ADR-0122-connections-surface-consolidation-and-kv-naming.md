---
adr: 0122
title: "Connections surface consolidation + canonical Key Vault credential naming"
status: proposed
date: 2026-06-23
repo: frontend
summary: "Collapse the connections/credentials admin experience to two surfaces — /settings/connections (one card per connector, pre-cred vs post-cred state with inferred health, what-it-ingests, and poll cadence) and /settings/client-mapping/[connector] (drill-down where per-client credentials are entered per account row). Delete /settings/tenant-mapping and retire /settings/credentials. Pin a provider-always-3rd Key Vault naming grammar conn-<scope>-<provider>[-<discriminator>], replacing the non-conforming kv://imperion/conn/* placeholder. Credential scope (company/client/user) is orthogonal to data mapping; the catalog is the complete map of every expected source (Planned cards for unbuilt stores), Azure folds into the M365 connector, and Datto is two cards over one company key."
tags: [integrations, security, identity, ux]
---

# ADR-0122: Connections surface consolidation + canonical Key Vault credential naming

> **Number is a placeholder.** ADR-0122 is claimed at MERGE per system CLAUDE.md §10.3 — the
> branch that merges second renumbers. This ADR is delivered as the design record for epic
> **#1256**; the code change in its first slice (#1257) carries only the naming helper + the
> tenant-mapping route deletion. Card/mapping/catalog slices land under #1256 separately.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-23 |
| **Amends** | ADR-0036 (consolidated connections page) · ADR-0103 (credential registry — pins its naming) · ADR-0112 (Client Mapping — adds per-client credential entry on the mapping row) |
| **Cross-references** | ADR-0042 (four-repo split / schema ownership) · ADR-0028/0035 (backend boundary + caller gate) · backend `credentials.ts` `companySecretName()` · epics #866 (three-tier IA) · #1141 (Client Mapping) · #903 (credential registry) · #322 (connector catalog) |

## Problem

The connections/credentials admin experience had drifted across **three** routes
(`/settings/connections`, `/settings/credentials`, `/settings/tenant-mapping`) with
overlapping jobs, while the underlying Key Vault names were inconsistent. Grounding against
prod (read-only DB, 2026-06-23) found the credential registry effectively unseeded and named
three different ways: conforming `conn-company-*` for six providers, a non-conforming
`kv://imperion/conn/*` placeholder for `qbo`/`docusign`/`gdap` (a frontend fallback that wrote
a ref pointing at **no real secret**), a legacy orphan `gdap` row not in the catalog, and a
`null` ref for `apollo`. Mark's hand-seeded keys were wrong. We need to settle: the **surface
topology**, the **canonical secret-name grammar** and how non-conforming keys are remediated,
and the **completeness** of the connector catalog.

## Context

- **Two axes are orthogonal.** *Credential scope* (company / client / user) decides how many
  secrets a connector needs. *Data mapping* (Client Mapping, ADR-0112) decides whether ingested
  data must bind to accounts. Autotask = company credential **but** per-client data mapping;
  M365/UniFi = client credential **and** data mapping (so the credential is entered on the
  mapping row); QBO/Apollo/Meta/DocuSign = company credential, no mapping.
- **Per-user scope is out.** Self-service per-user OAuth (an employee's own Gmail/M365) lives on
  `/profile` and is not part of the admin connections surface.
- **The backend already names correctly.** `companySecretName()` in the backend credentials
  function returns `conn-company-<provider>`; only the frontend's fallback diverged.

## Decision

1. **Two surfaces.** `/settings/connections` (one card per connector) + `/settings/client-mapping/[connector]`
   (drill-down). **Delete** `/settings/tenant-mapping`; **retire** `/settings/credentials` (its
   registry table folds into card post-cred detail; its M365/UniFi forms move to mapping rows).
2. **Card states.** Each card has a **pre-credential** state (Not configured, or **Planned** for a
   source whose backend store isn't built) and a **post-credential** state: `connection.status` +
   an **inferred** color-coded health icon (has-credential + status + `last_sync_at` freshness vs
   cadence) + what-it-ingests (from the connector manifest's `capabilities`/`identityMap`) + poll
   cadence. A **Test Connection** button triggers an on-demand live probe where one is wired
   (DocuSign first); the passive icon is inferred, the button is the truth-check.
3. **Credential-entry location follows scope.** Company credential → on the card. Client credential
   (M365/UniFi) → on each account **row** of the client-mapping screen, with a per-client health
   icon. The mapping screen always handles data-mapping regardless of scope.
4. **Canonical Key Vault grammar (provider-always-3rd):**
   `conn-<scope>-<provider>[-<discriminator>]` — discriminator always last (client → tenantId /
   consoleId / accountSlug; user → userId; company → omitted). Multi-secret providers suffix a
   role discriminator (`conn-company-docusign-integration-key`). The `kv://imperion/conn/*`
   placeholder is removed — a pending row records the *intended canonical name*, never a fake
   pointer. The legacy `gdap` row is deleted (a data fix); user-scope `conn-<userId>-<provider>`
   is a documented exception remediated when `/profile` is reworked.
5. **Complete catalog.** The catalog lists **every** expected source. Unbuilt stores render as
   **Planned** cards (visible, documented, not enterable) so the catalog is the honest map and each
   gap is a tracked issue. **Azure** posture folds into the **M365** connector (same per-client
   Entra app; card annotated "M365 + Azure") — no separate Azure card. **Datto** is **two cards**
   (Endpoint Backups, SaaS Backups) over **one** company key, each with client-mapping.

## Consequences

- Saving any company credential now writes a conforming name, so live seeding and subsequent
  slices are correct by construction. The non-conforming prod refs (`qbo`/`docusign`) are
  reseeded under canonical names and the `gdap` row deleted in follow-up slices.
- Killing `/settings/tenant-mapping` removes a redirect-only route and its redundant settings tab;
  the M365 mapping surface is reached from Tools and from the M365 card. Its nav/route-guard key is
  renamed `settings-tenant-mapping` → `settings-client-mapping`.
- `apollo`/`meta` must be added to the backend `CREDENTIAL_PROVIDERS` allowlist (separate backend
  slice) before their cards can store; until then they sit pending.
