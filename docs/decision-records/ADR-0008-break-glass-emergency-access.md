# ADR-0008: Break-glass emergency access

- **Status:** Accepted
- **Date:** 2026-06-06

## Problem
Entra SSO is now a hard requirement to reach any view (ADR-0002/0005). If SSO is
misconfigured or unavailable (cert expiry, tenant/Conditional-Access issue, app
registration change), every user — including admins — is locked out. We need an
emergency path back in.

## Context
The app gates all routes via middleware. A single point of auth failure should
not mean total loss of access. Common practice is a tightly controlled
"break-glass" account separate from the primary IdP.

## Options considered
- **No bypass** — rely solely on Entra; accept full lockout risk.
- **Break-glass credentials account** behind a dedicated URL.
- A network/IP allowlist bypass.

## Decision
Add a **break-glass** path: an Auth.js Credentials provider (`break-glass`) and a
dedicated **`/break-glass`** page, separate from the primary `/login` (Entra SSO).
It authenticates one non-Entra account configured via environment:
`BREAKGLASS_USERNAME` and `BREAKGLASS_PASSWORD_HASH` (lowercase-hex SHA-256). The
provider is **disabled unless both are set**.

## Security impact
- **Off by default** — no break-glass unless explicitly configured.
- Password stored only as a **SHA-256 hash**; compared in **constant time**
  (`crypto.timingSafeEqual`); plaintext is never stored or logged.
- Every successful use is **audit-logged** (`[SECURITY] Break-glass sign-in
  used …`) to App Service logs / Sentinel.
- Reached only via the explicit `/break-glass` URL, not the primary sign-in.
- This is a deliberate, documented backdoor — treat the credential like a root
  password: store in Key Vault, rotate regularly, alert on use, prefer a strong
  random password.

## Cost impact
None (uses Auth.js Credentials provider; no new dependency).

## Operational impact
- Configure `BREAKGLASS_*` only where needed (e.g. App Service), ideally from
  Key Vault. Generate the hash with `sha256` of the chosen password.
- Add monitoring/alerting on the audit-log line.

## Future considerations
- Time-boxed / one-time break-glass tokens.
- MFA on the break-glass account; auto-alert security on every use.
- Replace the certificate with managed identity (reduces a key SSO-failure mode).
