# MileIQ External API

[← Integrations](README.md) ·
[Capability overview](../product/imperion-os-overview.md#33-time--expense-monthly-close)

MileIQ is the **mileage source** behind Imperion Business Manager's employee expense
tracking — the system of record for the *miles* an employee drove for business.
This page is the onboarding-grade reference for the integration: what MileIQ is to the
platform, how its API access is gated, the OAuth tiers, and the open questions that gate
provisioning.

Verified against the live MileIQ developer docs on **2026-06-14** (issue #522, supports
ADR-0083 and gate #495). This records the access model and the open questions to resolve
**before** credentials are requested. No secrets here — credentials are custodied in Key
Vault by the backend.

> **Status: DEFERRED TO v2 (ADR-0099).** No credentials exist; access is request-gated and
> the MileIQ account is owned by Mark's business partner — converting it and applying is a
> human-coordination prerequisite (gate #495, see *Open dependencies*). Because that is a
> paid/partner gate, **v1 ships [manual mileage entry](#v1-manual-entry--scaffolding) instead**;
> the MileIQ API contract below + the front-end scaffolding (`mileiqService`) are ready so the
> v2 build is a wiring change, not a re-architecture.

## What it is

Read-only mileage source. MileIQ auto-detects drives by GPS; the employee swipes each
drive business/personal. The External API exposes the **business-classified drives** so
Imperion can land them in bronze (`mileiq_drive`) → silver `expense_item(kind=mileage)`.
MileIQ is authoritative for the **miles** fact only; the dollar value is derived by the
backend from the Imperion-owned, comp-gated mileage rate (ADR-0083). Personal drives never
enter.

## v1 manual entry & scaffolding

While the MileIQ API is paywalled (gate #495 → v2, ADR-0099), **v1 ships manual mileage
entry**: an employee logs a drive (date, miles, from/to, billable + client, optional Autotask
ticket link) on their open monthly report. It writes the `website_mileage` bronze (migration
`0137`, #851) as `(source='website', kind='mileage')` — alongside the MileIQ (`mileiq_drive`)
and out-of-pocket (`website_expense_item`) sources, all normalized into silver `expense_item`
by the cloud-pipeline merge (ImperionCRM_Pipeline#124). Miles are entered; the reimbursement
dollar is derived backend-side (the rate is comp data), so no dollar figure is shown to the
employee. Entry form #853, ticket picker #852.

**Front-end scaffolding (ready for v2).** `src/lib/services/index.ts` declares `mileiqService`:
`startConnect` / `completeConnect` (per-user OAuth 2.1 authorization-code, mirroring
`connectionsService`) + `listBusinessDrives` → `MileIqDriveWire[]` (the `mileiq_drive` bronze
shape). The front end holds **no MileIQ key** (ADR-0043) — every method calls the backend via
`callService`, so it no-ops with `ServiceNotConfiguredError` until backend #109 +
`INTEGRATION_SERVICE_URL` are set. Wiring v2 = ship backend #109 + LocalPipeline #167 + set the
env, no FE re-architecture.

## Access is request-gated (the real gate)

Credentials are **not self-serve**. You apply via the MileIQ **business** API portal
([mileiq.com/for-business/api](https://mileiq.com/for-business/api)); MileIQ approves and
issues one org-level `client_id` + `client_secret`. Because the application runs through
the business portal, **a MileIQ for Business / Teams subscription is almost certainly
required to be granted credentials** — this is not stated explicitly in the docs and must
be confirmed during the request.

Prerequisite app shape (already satisfied by the backend design): a server-side
application reachable over HTTPS with at least one public redirect (callback) endpoint.

## OAuth 2.1 — Authorization Code flow

| Purpose | Endpoint |
|---|---|
| Authorize | `https://oauth2.mileiq.com/oauth2/auth` |
| Token | `https://oauth2.mileiq.com/oauth2/token` |
| API base | `https://external-api.mileiq.com` |

Flow: redirect the user to the authorize endpoint with `client_id`, scopes, and a CSRF
`state`; on consent MileIQ returns a code to the registered redirect URI; the backend
exchanges the code for tokens using the `client_secret`; calls carry
`Authorization: Bearer <token>`; refresh tokens renew access. Tokens are custodied in Key
Vault (backend #109), never in the DB — same pattern as the per-user OAuth flow in
[`README.md`](./README.md#per-user-oauth-flow-adr-0024--backend-adr-0038).

## Two authorization tiers

| Tier | Scopes | Who consents | Account requirement | Status | Imperion use |
|---|---|---|---|---|---|
| **Per-user** | `drives:read:all` `users:read` | each employee, individually | API credential only | **GA** | **v1 chosen path** (ADR-0083) — employee connects MileIQ once during onboarding |
| **Team / group** | `groups_read` (+ drives) | a **group administrator** | Business/Teams + group admin | **BETA (~10% of customers)** | deferred — "one admin consent for the whole org" (ADR-0083 §future) |

- **User endpoints are privacy-locked to self** — a user can only read their own profile
  and drives.
- **Group endpoints require admin** — the caller must be a group administrator
  (`is_admin`); without the scope/role they 403. Groups expose the team roster (members,
  `is_admin`, driver flag), enabling a single admin consent to cover the whole team. This
  is exactly the beta path; v1 does **not** depend on it.

## Open questions (resolve at request time — tracked in #522)

- [ ] Can a personal/Unlimited plan ever get credentials, or is Business/Teams mandatory?
- [ ] Does the per-user `drives:read:all` model work **without** enrolling in the Teams
      group beta?
- [ ] Can the Teams group beta be requested now (would collapse per-user onboarding into
      one admin consent), and what is its GA timeline?
- [ ] Token / refresh lifetimes and rate limits for a scheduled per-employee pull
      (cadence per ADR-0038; LocalPipeline #167).

## Open dependencies (human-coordination)

1. **Partner-owned account.** The MileIQ account belongs to Mark's business partner.
   Converting it to Business/Teams and submitting the API access request requires
   coordinating with the partner. **Prerequisite to gate #495.**
2. **Credential application** (#495) — apply once the account is converted; MileIQ issues
   `client_id`/`client_secret`.
3. **Per-employee onboarding consent** — each employee authorizes once (per-user tier).

## Related work

- ADR-0083 — employee expense tracking & reimbursement (the deciding record).
- **ADR-0099** — manual mileage as the v1 interim; full MileIQ API deferred to v2.
- Gate **#495** — apply for MileIQ External API credentials (Mark/human) — **v2 milestone**.
- Backend **#109** — MileIQ OAuth custody + callback (token → Key Vault) — **v2 milestone**.
- LocalPipeline **#167** — scheduled MileIQ drive pull → `mileiq_drive` bronze.
- Pipeline **#105** — bronze → silver `expense_item` merge.
- **#851/#852/#853** — v1 manual mileage: `website_mileage` bronze · Autotask ticket picker · entry form.
- **ImperionCRM_Pipeline#124** — `website_mileage` → silver `expense_item` merge.
