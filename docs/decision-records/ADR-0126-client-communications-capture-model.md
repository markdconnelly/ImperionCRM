---
adr: 0126
title: "Client communications capture model"
status: proposed
date: 2026-06-26
repo: frontend
summary: "Client communications are captured from Imperion's OWN tenant, filtered to only clients present in the DB (account_domain + onboarded contacts; onboarding adds a client's users/domains to the filter) — covering direct client<->employee email, Teams chats, Teams meetings, and social-media DM histories (ADR-0124) as one unified client-communications history. Client tenants are NOT granted Mail.Read / Chat.Read / Calendars.Read; comms are never pulled from client tenants. Per-client security posture IS pulled from client tenants under allowed scopes (m365_incidents, m365_alerts, m365_evidence, m365_service_principals, entra_conditional_access_policies), fanned out across mapped tenants like the directory collectors. Texting on personal cell phones is explicitly out of scope. Tracking: epic #1366 (sub-issues a-f), docs issue #1367. ADR number is a placeholder claimed at merge (system CLAUDE.md 10.3)."
tags: [m365, communications, security-posture, privacy, integrations]
---

# ADR-0126: Client communications capture model

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-26 |
| **Cross-references** | ADR-0018 (per-client M365 app supersedes GDAP) · ADR-0042 (four-repo system) · ADR-0026 (local-pipeline: merge co-locates with ingestion) · ADR-0124 (social media management plane) |

## Problem

We need a coherent, defensible model for **what client-related communications the
platform captures, from where, and under which Microsoft Graph scopes** — without
over-permissioning client tenants and without leaving real client↔employee
communication history uncaptured.

A live prod audit (2026-06-26) of hydrated M365 data exposed the ambiguity: security
posture and comms tables were collected only against Imperion's home tenant, the
client-comms filter substrate (`account_domain`) was empty, and three comms
collectors (`m365_email`, `m365_teams`, `m365_teams_meetings`) produced zero rows —
with no written rule for which of those are gaps versus intended.

## Context

- The platform sits as an operational intelligence layer above each client's M365
  tenant via a **per-client app registration** (ADR-0018, supersedes GDAP).
- Client communications are between **Imperion employees and client users**. Those
  messages exist in **Imperion's own tenant** (the employee side of the
  conversation), so they can be captured there without reading client mailboxes.
- Reading client mailboxes/chats/calendars directly would require granting
  `Mail.Read` / `Chat.Read` / `Calendars.Read` on every client tenant — a large,
  hard-to-justify privacy and attack surface for data we can already obtain from the
  employee side.
- Security posture (incidents, alerts, evidence, service principals, conditional
  access) is **not personal communication** and is the core value of the managed-
  services relationship; pulling it per client tenant is expected and proportionate.
- `account_domain` and `account_tenant` are the substrate that lets us (1) scope
  comms to actual DB clients and (2) iterate collectors across client tenants. Both
  are under-populated today (`account_domain` empty; `account_tenant` 4/26).
- Social-media DMs (Meta Messenger/IG) are another channel of client↔employee
  communication and are already partially ingested (ADR-0124 social plane).
- Texting on personal cell phones has no reliable, sanctioned capture path.

## Options considered

1. **Pull comms from each client tenant** (grant Mail/Chat/Calendar per client).
2. **Pull comms from Imperion's tenant only, filtered to DB clients**; pull only
   security posture from client tenants.
3. **No comms capture** — rely on manual logging.

### Tradeoffs

- **(1)** Captures both sides natively but maximizes privacy exposure and per-tenant
  consent friction, and reads data we don't need from clients. Rejected.
- **(2)** Captures the relationship history from the side we legitimately own, keeps
  client-tenant scopes minimal (security posture only), and concentrates the privacy
  control in one tenant we administer. Requires a reliable client filter
  (`account_domain` + onboarded contacts). Chosen.
- **(3)** No new permissions but loses the knowledge asset entirely. Rejected.

## Decision

Adopt the **Imperion-tenant-filtered comms + per-client security posture** model:

1. **Client tenants are NOT granted `Mail.Read`, `Chat.Read`, or `Calendars.Read`.**
   Client communications are **never pulled from client tenants.**
2. **Client communications are captured from Imperion's own tenant**, filtered to
   only clients present in the database. The filter is driven by `account_domain` +
   the onboarded client contacts; **onboarding a client adds its users/domains to the
   comms contact filter.**
3. **Captured comms scope:** direct client↔employee email, Teams chats, and Teams
   meetings, **plus social-media communication histories** (Meta Messenger/IG DMs,
   etc., per ADR-0124), folded into one unified client-communications history.
4. **Per-client security posture IS pulled from client tenants** (allowed scopes,
   fanned out across mapped tenants like the directory collectors already are):
   `m365_incidents`, `m365_alerts`, `m365_evidence`, `m365_service_principals`,
   `entra_conditional_access_policies`.
5. **Texting (personal cell phones) is explicitly out of scope** — no reliable
   capture path. Revisit only if business texting moves to a captured channel
   (e.g. Teams Phone or a business SMS number).

Per ADR-0026, the bronze→silver merge for these Imperion-tenant comms co-locates
with whichever plane ingests them; the silver client-communication entity and its
OKF concept are owned here (front end owns the schema).

## Consequences

### Security impact

- **Reduces** client-tenant scope to security-posture reads only; eliminates the need
  for client-side mail/chat/calendar grants — smaller attack and privacy surface.
- Comms data concentrates in Imperion's tenant under our own access controls and the
  two-axis RLS spine; the client filter must be correct or non-client traffic could
  be retained. The filter (`account_domain` + onboarded contacts) is the control.
- Captured comms are client PII → `data_class = client_pii`; subject to the standard
  RLS and action-ceiling rules.

### Cost impact

- Minimal new ingress; security-posture fan-out scales with mapped tenant count.
  No new provider keys.

### Operational impact

- Hard dependency on populating `account_domain` and `account_tenant` (4/26 today)
  and on the onboarding→filter loop. Until then, comms capture stays unfiltered/
  home-tenant-only and posture stays single-tenant.
- Three currently-dead comms collectors (`m365_email`, `m365_teams`,
  `m365_teams_meetings`) must be restored and made filter-aware.

## Future considerations

- A sanctioned business-texting channel would bring texts in scope under the same
  filter model.
- If a client relationship needs both sides of a thread natively, that is a
  per-client, explicitly-consented exception — not the default.

Tracking: epic #1366 (sub-issues a–f); this ADR = docs issue #1367. ADR number is a
placeholder and is claimed at merge per system CLAUDE.md §10.3.
