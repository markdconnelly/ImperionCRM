# QuickBooks Online — production app registration (#497)

Runbook for taking the Intuit (QuickBooks Online) app from **sandbox** to
**production**, so reimbursement + payroll reconciliation read the real company.
The connect flow and read client are built (backend #117/#110/#116, front-end #528);
this is the Intuit-side ops work that gates LIVE.

## Scope is one OAuth scope, not many

QuickBooks Online has a single accounting scope, `com.intuit.quickbooks.accounting`,
which already authorizes **chart-of-accounts, vendors, and Purchase** reads. The app
requests exactly that scope (`QBO_SCOPE` in the backend `qbo.ts`), so there is **no
per-entity scope to add** — issue #497's "extend read scope" is satisfied by that one
scope. The real gate is sandbox → production.

## URLs the Intuit production app form requires

| Intuit field | URL |
|---|---|
| End-user license agreement | `https://imperioncrm.azurewebsites.net/legal/eula` |
| Privacy policy | `https://imperioncrm.azurewebsites.net/legal/privacy` |
| Launch URL | `https://imperioncrm.azurewebsites.net/` |
| Connect / Reconnect URL | `https://imperioncrm.azurewebsites.net/settings/connections` |
| Disconnect URL | `https://imperioncrm.azurewebsites.net/settings/connections` |
| Production redirect URI | `https://imperioncrm.azurewebsites.net/api/qbo/callback` |

The `/legal/*` pages are **public** (no Entra SSO — see `src/middleware.ts` and
`src/app/legal/`), so Intuit's reviewer can fetch them. The Launch/Connect/Disconnect
URLs point into the authenticated app, which is expected for an internal app.

> The legal pages are AI-drafted templates. Have counsel review them, and confirm the
> legal entity name and privacy contact in `src/app/legal/legal-ui.tsx`
> (`LEGAL_ENTITY` / `LEGAL_CONTACT`) before submission.

## Steps

1. **Complete Intuit's App Assessment Questionnaire** (developer.intuit.com → your app
   → Production). Attestations are drafted in backend #117 (on-demand refresh, no
   customer prompts, tokens in Key Vault, retry transient-only).
2. Intuit issues **production** client id + secret. Store them in Key Vault under the
   secret names `QBO_CLIENT_ID_SECRET` / `QBO_CLIENT_SECRET_SECRET` reference.
3. Register the **production redirect URI** above on the Production tab.
4. Set app setting **`QBO_ENVIRONMENT=production`** on `imperioncrmbackend` (flips the
   API base to `quickbooks.api.intuit.com`).
5. Re-run **Settings → Connect QuickBooks** and consent against the real Simple Start
   company → token minted into `conn-company-qbo` in Key Vault.
6. Run a reconciliation; confirm it matches real `Purchase` records. This also verifies
   the modeled `Purchase` wire format (`mapVendor`/`mapPurchases` in backend `qbo.ts`).

QuickBooks stays **read-only everywhere** — the app never writes or pays (ADR-0083/0085).
