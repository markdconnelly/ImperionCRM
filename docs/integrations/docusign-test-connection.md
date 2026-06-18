# DocuSign "Test connection" (Settings → Connections)

**Issue:** [#867](https://github.com/markdconnelly/ImperionCRM/issues/867) ·
**Backend probe:** ImperionCRM_Backend #143 (`GET /connections/docusign/status`) ·
**Related:** DocuSign go-live blocker [#318](https://github.com/markdconnelly/ImperionCRM/issues/318),
runbook [#850](https://github.com/markdconnelly/ImperionCRM/issues/850).

## What it is

A **Test connection** button on the DocuSign company-credential card
(`/settings/connections`). It lets an admin confirm — from the GUI, with no
engineering — that DocuSign is genuinely ready to send envelopes: the secrets are
stored, the one-time JWT admin consent is granted, and a token actually mints.

It is the operator-facing readout for DocuSign #318: after **Grant admin consent**,
click **Test connection** to see whether consent took.

## How it works (boundary-clean)

```
[Test connection]                       (browser, client component)
   └─ testDocusignConnectionAction()    (server action, gated on settings:write)
        └─ connectionsService.docusignStatus()         GET /connections/docusign/status
             └─ external-client.ts  →  managed-identity bearer token (ADR-0028)
                  └─ Backend (Easy Auth + ALLOWED_CALLER_CLIENT_ID, ADR-0035)
                       └─ mints a JWT-impersonation token = the consent check
```

The browser never calls the backend. The call is made server-side by the web app's
**managed identity**, which is the one caller the backend's allowlist accepts
(ADR-0035). No secret, token, key, or assertion is ever returned by the probe
(backend ADR-0056), so nothing sensitive crosses the boundary.

## Result states

The backend outcome is mapped by the pure `docusignTestResult()` helper
(`src/lib/integrations/docusign-test.ts`) to a colour-toned line on the card:

| Backend response | State | Tone | Meaning / next step |
| --- | --- | --- | --- |
| `200 consentGranted:true` | `consent_granted` | green | Ready to send envelopes. |
| `200 consentGranted:false` (+ `consentUrl`) | `consent_required` | amber | Secrets stored; click **Grant admin consent**, then re-test. A "Grant consent" link is shown. |
| `501` / base-URL env unset | `not_configured` | dim | DocuSign secrets / App Settings not wired in this environment. |
| `502` | `mint_failed` | red | Configured but minting failed — check the RSA keypair, integration key, impersonated user. |
| other non-2xx (401/403) | `rejected` | red | Backend refused — usually the caller identity isn't allow-listed yet. |
| network / timeout | `unreachable` | red | Couldn't reach the backend. |

`ready` is `true` **only** for `consent_granted` (consent + a real mint), so the flag
never over-reports readiness.

## Scope / boundaries

- GUI-only (ADR-0018): this repo adds the surface; the probe itself is the backend's.
- Read-only — it never writes a secret or changes connection state.
- The actual envelope **send** ("Send for signature") is separate, deploy-dormant work.
- External provider callbacks (DocuSign Connect status webhook, QBO OAuth) route
  through APIM — see ImperionCRM_Backend #195 — not covered here.

## Tests

`src/lib/integrations/docusign-test.test.ts` covers every branch of the mapper,
including the invariant that no non-minted path reports `ready:true`.
