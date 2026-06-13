---
name: imperion-graph-access
description: Imperion CRM's Microsoft Graph access model — per-client app consent as primary (tenant registry + Key Vault credential contract), GDAP retained as fail-closed fallback, activation gates, and which repo owns which Graph call. Use when working with Microsoft Graph, the per-client app, the Onboarding app, GDAP, tenant registry, client-tenant access, M365 ingestion, change notifications, or relationship expiry in any ImperionCRM repo.
---

# Imperion: Microsoft Graph access (per-client app primary)

**Per-client (admin-consented) app access is the primary model** — pipeline ADR-0018
(2026-06-12), which amends pipeline ADR-0002 (GDAP-primary) and ADR-0007 (partner-tenant
auth). The roles are **swapped**: per-client app is the default; GDAP is **retained, not
removed** — its code paths stay intact and any tenant `gdap-health` reports usable still
syncs. Reverting to GDAP-primary requires a new ADR.

## The model (pipeline ADR-0018 mechanics)

- **One app carries all Graph hooks:** the **Imperion Client Onboarding** app, appId
  `0d6c8db7-5589-4987-b8e5-fe2d18ed2a81`, SP `0cce2cdc-4893-4012-84e3-5d794cfbd9e9`.
  **33 read-only application permissions** as of 2026-06-12 (Files.Read.All,
  Tasks.Read.All, AuditLog.Read.All pruned — consent revoked AND manifest-removed).
  v1 scope = Imperion's own tenant only (`49307c12-1bb7-42e4-9c7c-43d2850bd8c6`).
- **Tenant registry:** app setting `GRAPH_TENANT_REGISTRY`, comma-separated
  `Label=tenantGuid` pairs (`src/shared/tenant-registry.ts`, pipeline repo).
- **Credential contract:** per label, Key Vault (`kv-imperioncrm-prd`) secrets
  `ImperionOnboardingApp-<Label>-ClientID` / `-Secret` (home-tenant secret valid to
  2028-05). Onboarding a tenant = admin consent in their tenant + two KV secrets + one
  registry entry. No code change, no schema change.
- **Token path:** `getTenantGraphToken(tenantId)` prefers registry credentials
  (client-credentials token *in that tenant*); falls back to the GDAP delegated token
  (ADR-0007) for non-registry tenants.

## The two identities (don't mix them)

| Plane | Identity | Credential | Used for |
|---|---|---|---|
| Cloud (`ImperionCRM_Pipeline`) | Onboarding app, client-credentials **per registry tenant**; GDAP partner app as fallback | KV `ImperionOnboardingApp-<Label>-*` pair per tenant | Graph change notifications, subscription upkeep (ADR-0014), `gdap-health`, on-demand refresh |
| Backend (`ImperionCRM_Backend`) | Same Onboarding app, Imperion tenant (backend ADR-0043) | Same KV pair via `M365_INGEST_*` app settings | Comms/interaction ingestion (mail/calendar/Teams → `interaction`) |
| On-prem (`ImperionCRM_LocalPipelineEnrichment`) | Cert-backed Entra SP (local-pipeline ADR-0002) — a **cert must be added to the Onboarding app** at server bringup; the certificate IS the credential | `Cert:\LocalMachine\My` | Scheduled bulk pulls (directory, devices, security posture) |

Per-tenant isolation is absolute: every row tenant-tagged, no cross-tenant reads, never
read one tenant's data with another tenant's token.

## Fail closed — the non-negotiable (shape changed, spirit unchanged)

A tenant that is **neither in the registry nor GDAP-active is never touched**. Registry
membership is the per-client-app analogue of an active GDAP relationship; severing access
= delete the KV secrets / registry entry / the tenant's enterprise app. The GDAP
machinery (`gdap-health` sweep, `assertGdapActive`, `activeGdapTenants()`) keeps running
exactly as built for any GDAP tenants. The renewal event to track is now **app-secret
expiry** (2028-05 home tenant), visible in Key Vault/Entra — no sweep covers it yet
(documented follow-up in ADR-0018).

## Who owns which call

- **Cloud pipeline:** inbound Graph change notifications (`POST /api/webhooks/graph`,
  ADR-0013 contract unchanged: validationToken handshake, `clientState` vs KV secret,
  transient → 500), the daily `graph-subscriptions` upkeep timer (ADR-0014), `gdap-health`,
  on-demand `POST /api/refresh { source: 'm365' }`.
- **Backend:** comms/interaction ingestion (backend ADR-0043): contact-matched comms only
  into `interaction`, `POST /api/ingest/m365` + 30-min timer, audit rows carry counts
  never content.
- **On-prem:** ALL scheduled bulk pulls.

## Activation gates (CLOSED as of 2026-06-12 — code is dormant)

1. **Comms HELD:** mail, calendar, Teams channel/chat, call records — no activation until
   a comms filter algorithm is accepted (backend issue #90 gates; ADR-0043's contact-match
   filter is necessary but not deemed sufficient).
2. **Teams = Microsoft protected APIs:** consent granted but the app-id approval form not
   yet submitted by Mark; `GRAPH_TEAMS_SUBSCRIPTIONS_ENABLED` / `M365_INGEST_TEAMS_ENABLED`
   stay off; Graph 403 maps to a clean logged skip, never fake success.
3. **Activation app settings unauthorized:** `GRAPH_TENANT_REGISTRY`,
   `GRAPH_NOTIFICATION_CLIENT_STATE_NAME`, `M365_INGEST_TENANT_ID` — Mark has not
   authorized setting them; all ingestion/subscription code no-ops until he does.

Per-source verdicts (ADR-0018 amendment) govern what may be wired — e.g. SharePoint is
**site inventory only, never file content**; Defender bronze layered with Autotask;
directory → bronze feeding the user object. Check the amendment table before wiring.

## Security events (human approval BEFORE acting)

Adding a tenant to the registry (the analogue of granting GDAP roles) · adding/widening
any app permission · granting/widening/renewing GDAP roles · adding a cert to the app.
Permissions are read-only by ruling; never re-add pruned ones for convenience.

## Authoritative sources (verify before acting)

- **Pipeline ADR-0018** (the supersession) + ADR-0002/0007 (amended), ADR-0013/0014
- Backend ADR-0043 (comms ingestion) · local-pipeline ADR-0002 (cert auth)
- Code: `src/shared/tenant-registry.ts`, `src/shared/gdap.ts`,
  `src/functions/timers/gdap-health.ts`, `graph-subscriptions.ts` (pipeline repo)
- Known stale doc: `ImperionCRM_Pipeline/CLAUDE.md` §2 still says GDAP-primary — ADR-0018 wins.

ADR numbers are per-repo — always qualify cross-repo references with the repo name.
