# DocuSign API Integration Guidance

This document defines the standards, prerequisites, and patterns for integrating DocuSign eSignature into Imperion applications. Treat it as the source of truth for any repo that creates, sends, or tracks envelopes.

## Scope

Covers the DocuSign eSignature REST API: authentication, envelope creation, recipient handling, status tracking via webhooks (DocuSign Connect), and the security/compliance controls required given the regulated sectors we serve (healthcare, defense, financial services, energy).

---

## 1. Accounts and Environments

DocuSign provides two fully separate environments. Never mix credentials or hardcode environment assumptions.

| Environment | Auth base URI | API base URI | Purpose |
|-------------|---------------|--------------|---------|
| Demo / Developer | `account-d.docusign.com` | `demo.docusign.net` | All development and testing |
| Production | `account.docusign.com` | resolved per-user (see below) | Live envelopes only |

The production REST base path is **not** fixed. After authentication, call the `/oauth/userinfo` endpoint to retrieve the account's `base_uri`, then append `/restapi`. Store this per-account rather than assuming a region. Hardcoding `na1`, `na2`, `eu`, etc. is a defect.

Required IDs to capture per environment: Integration Key (client ID), API Account ID (GUID), User ID (GUID for the impersonated user under JWT), and the RSA key pair for JWT.

---

## 2. Authentication

### Use JWT Grant for server-to-server (default for our apps)

JWT (JSON Web Token) Grant is the standard for backend services with no interactive user. It impersonates a configured service-account user and requires one-time admin consent per integration key.

Flow:
1. Build a JWT assertion signed with the RSA private key (RS256), containing `iss` (integration key), `sub` (user ID to impersonate), `aud` (auth server host), `iat`, `exp` (max 1 hour), and `scope` (`signature impersonation`).
2. POST the assertion to `/oauth/token` with grant type `urn:ietf:params:oauth:grant-type:jwt-bearer`.
3. Receive an access token (valid ~1 hour). Cache and reuse it until ~1 minute before expiry; do not request a new token per API call.

One-time consent: the first time an integration key/user pair is used, an admin must grant consent via the consent URL (`/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=...&redirect_uri=...`). Until consent is granted, token requests return `consent_required`. Document the consent URL in each repo's README.

### Use Authorization Code Grant only for user-interactive flows

If an app acts on behalf of a logged-in human (e.g., a portal where each user sends from their own DocuSign identity), use the 3-legged Authorization Code grant with PKCE. Do not use JWT impersonation to stand in for distinct human users where attribution matters.

### Credential handling (non-negotiable)

- RSA private keys and integration keys live in a secrets manager (Azure Key Vault for our stack), never in source, env files committed to the repo, or container images.
- Reference secrets at runtime via managed identity / Key Vault references.
- Rotate the RSA key pair on a defined cadence and on any suspected exposure. Support two active keys during rotation.
- Never log the access token, JWT assertion, or private key. Scrub these from exception traces.

---

## 3. Core Envelope Workflow

The standard send pattern:

1. **Build the envelope definition** — documents (base64 or via template), recipients, tabs (signature fields), and `status`.
2. **Set `status`**: `sent` dispatches immediately; `created` saves as a draft.
3. **POST** to `/v2.1/accounts/{accountId}/envelopes`.
4. **Capture the returned `envelopeId`** and persist it as the foreign key linking your domain record to DocuSign.

### Documents

Supply documents as base64-encoded content with a `documentId`, `name`, and file extension, or reference a server-side template by `templateId`. Prefer templates for repeatable, standardized agreements — it keeps field placement out of code and lets non-developers maintain layout.

### Recipients and routing

- Each recipient needs `email`, `name`, `recipientId` (unique within the envelope), and `routingOrder`. Same routing order = parallel; incrementing = sequential.
- Use `clientUserId` to designate an **embedded** (captive) signer — someone who signs inside our application rather than via emailed link. Embedded signers require generating a recipient view URL after sending.
- Omit `clientUserId` for **remote** signers, who receive a DocuSign email.

### Tabs (fields)

Place tabs by anchor string (`anchorString`) wherever possible rather than absolute x/y coordinates. Anchors survive document reflow; coordinates break silently when a document changes.

### Embedded signing view

For embedded signers, after the envelope is `sent`, POST to `/envelopes/{envelopeId}/views/recipient` with the `clientUserId`, `recipientId`, `email`, `name`, and a `returnUrl` you control. The response contains a short-lived URL — redirect the signer to it immediately; it expires in minutes and is single-use.

---

## 4. Status Tracking — Use DocuSign Connect (Webhooks), Not Polling

Polling envelope status wastes quota and adds latency. Configure DocuSign Connect to push status changes to a webhook endpoint.

Requirements for our webhook endpoints:

- **HTTPS only**, TLS 1.2+, with a stable public URL.
- **Verify the HMAC signature** on every inbound message. Enable Connect HMAC, store the signing secret in Key Vault, recompute the hash over the raw request body, and reject on mismatch. Do not trust payloads that fail verification.
- **Respond fast (2xx within seconds)**. Acknowledge receipt, enqueue the payload, and process asynchronously. Connect retries on non-2xx with backoff, so make processing **idempotent** — dedupe on `envelopeId` + status + timestamp.
- Subscribe only to the events you need (e.g., `envelope-completed`, `envelope-declined`, `envelope-voided`, `recipient-completed`).
- Treat the webhook as a notification, not the system of record. On `completed`, you may pull the signed PDF and the Certificate of Completion via the API for archival.

Retain a reconciliation job that periodically queries status for envelopes stuck in a non-terminal state beyond an SLA, to catch missed deliveries.

---

## 5. Security and Compliance Controls

Given our client base, the following are mandatory, not optional:

- **Least privilege**: the service account should hold only the permissions its app needs. Separate integration keys per application; do not share one key across repos.
- **Data classification**: signed documents frequently contain PII/PHI. Store retrieved PDFs in encrypted storage with access controls aligned to the data's classification. For PHI, ensure a BAA is in place with DocuSign and that the workflow stays within HIPAA-eligible DocuSign offerings.
- **Audit trail**: preserve the Certificate of Completion for every executed envelope. It is the legal evidence of consent, timestamps, and signer authentication.
- **PII minimization**: never place sensitive data in URL query strings or logs. Webhook payloads and recipient views can carry identifying data — log metadata (envelope ID, status), not contents.
- **Webhook exposure**: the Connect endpoint is internet-facing. Put it behind WAF rules, rate limiting, and the HMAC verification above. Reject oversized payloads.
- **Tenant isolation**: when multi-tenant, scope every envelope lookup by tenant + account ID so one client cannot retrieve another's envelopes.

---

## 6. Reliability and Quota

- **Rate limits**: DocuSign enforces per-account hourly API call limits. Honor `429` responses and the `Retry-After` / rate-limit reset headers with exponential backoff. Burst operations (bulk send) should be throttled client-side.
- **Token caching**: cache the JWT access token until near expiry. A token request per call will exhaust limits and add latency.
- **Bulk sending**: for large batches, use the Bulk Send API (bulk send list + single envelope template) rather than looping individual creates.
- **Timeouts and retries**: set explicit HTTP timeouts. Retry only idempotent reads; never blindly retry an envelope create (you may double-send) — instead query by an idempotency key you set in `customFields` / `eventNotification`.

---

## 7. Repo Requirements Checklist

Every repo integrating DocuSign must include:

- [ ] README section documenting the consent URL and how to grant admin consent per environment.
- [ ] Environment-driven config for auth host, integration key, user ID, account ID, and RSA key reference — zero hardcoded environment assumptions.
- [ ] Secrets sourced from Key Vault via managed identity; `.gitignore` covers any local key material; pre-commit secret scanning enabled.
- [ ] Resolution of `base_uri` from `userinfo` at runtime (no hardcoded regional hosts).
- [ ] Access-token caching with expiry handling.
- [ ] Webhook endpoint with HMAC verification, async processing, and idempotency.
- [ ] Reconciliation job for non-terminal envelopes.
- [ ] Structured logging that excludes tokens, keys, and document contents.
- [ ] Retry/backoff on `429` and `5xx`.
- [ ] Unit/integration tests run against the demo environment only.
- [ ] Documented data-retention and storage-encryption approach for signed PDFs and certificates.

---

## 8. Reference Endpoints

| Action | Method | Path (append to `{baseUri}/restapi`) |
|--------|--------|----------------------------------------|
| Get token | POST | `https://{authHost}/oauth/token` |
| User info | GET | `https://{authHost}/oauth/userinfo` |
| Create/send envelope | POST | `/v2.1/accounts/{accountId}/envelopes` |
| Get envelope status | GET | `/v2.1/accounts/{accountId}/envelopes/{envelopeId}` |
| Recipient (embedded) view | POST | `/v2.1/accounts/{accountId}/envelopes/{envelopeId}/views/recipient` |
| List recipients | GET | `/v2.1/accounts/{accountId}/envelopes/{envelopeId}/recipients` |
| Get signed documents | GET | `/v2.1/accounts/{accountId}/envelopes/{envelopeId}/documents/combined` |
| Get Certificate of Completion | GET | `/v2.1/accounts/{accountId}/envelopes/{envelopeId}/documents/certificate` |

Always confirm endpoint specifics against current DocuSign developer documentation before implementation, as API details evolve.
