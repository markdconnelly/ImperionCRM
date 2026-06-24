# Remove credential (purge) — UI + wiring

The Connections surface lets an operator **enter** a credential; this adds the matching
**Remove** action so a wrongly-seeded or stale credential can be cleared and re-seeded. GUI-only
(ADR-0042): the actual row delete + Key Vault secret purge happens in the backend
(`ImperionCRM_Backend` #390, `POST /api/credentials/purge`).

## Why (the live case)

The Imperion account carried **two** `m365` `connection` rows — a dead **certificate** row at the
LP infra app (no Microsoft Graph grants → every Graph read `403`) and the correct **secret** row at
the Graph-consented onboarding app. Both keyed to one account ⇒ the credential resolver is ambiguous
and can pick the dead one, and there was no way to remove it. Purging the dead row by **id**
disambiguates it with no re-seed needed.

## Where it appears

- **Company connection cards** (`/settings/connections`) — the existing "Remove credential" control
  now routes to `purgeCredentialAction`, which purges the Key Vault secret too (the old
  `disconnectAction` only deleted the local row, orphaning the secret).
- **Per-client credentials** on the client-mapping screen (`/settings/client-mapping/<connector>`,
  M365/UniFi) — each **registered credential** row gets a **Remove** control. Rows are now listed
  **one per `connection`** (not collapsed by account) and show their **auth method + app id**, so a
  same-account duplicate (e.g. cert-vs-secret) is visible and individually removable.

## Behaviour

- Destructive **two-step confirm** (`RemoveCredentialButton`, `src/components/settings/`): first
  click reveals "Confirm / Cancel" — no native dialog primitive exists in the repo.
- Keyed on the connection **`id`** — the only key that disambiguates a same-account duplicate.
- **Backend owns the delete** (`purgeCredentialAction`, `src/app/(app)/settings/actions.ts`): the row
  delete + KV purge happen entirely in the backend endpoint. The web app's DB role has **no `DELETE`
  on `connection`** by design (ADR-0042: GUI-only; deletes are a backend process) — so the action
  never deletes the row itself. An earlier version did a client-side `DELETE` fallback, which threw an
  uncaught permission error (a 503 that silently blocked every removal, #1284). The action now just
  calls the backend purge and revalidates; an unconfigured/unreachable backend leaves the row intact
  for a retry rather than crashing.
- **Grant dependency:** the backend MI role `mgid-imperioncrmbackendfunction` needs `DELETE ON
  connection` — added by migration `0202_connection_delete_grant_backend.sql` (#1284). Migration 0047
  had granted only `SELECT/INSERT/UPDATE`, so the backend purge silently failed until 0202.
- After purge the page revalidates, so the card/row health flips to "Not configured". Re-entering a
  credential goes through the normal save path.

## Source

- `src/components/settings/remove-credential-button.tsx` — the confirm control.
- `src/app/(app)/settings/actions.ts` — `purgeCredentialAction`.
- `src/lib/services/index.ts` — `credentialsService.purgeCredential`.
- `src/lib/integrations/client-mapping.ts` — `RegisteredClientCredential` (now carries `id`,
  `authMethod`, `clientId`) + `selectRegisteredClientCredentials` (one row per connection).

Companion: backend #390 (the delete + KV purge endpoint).
