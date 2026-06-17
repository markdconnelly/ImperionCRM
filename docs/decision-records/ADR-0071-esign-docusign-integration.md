---
adr: 0071
title: "E-signature — DocuSign integration contract"
status: accepted
date: 2026-06-12
repo: frontend
summary: "Auth: JWT grant, token in backend Key Vault (ADR-0034/0042)."
tags: [crm-parity]
---
# ADR-0071: E-signature — DocuSign integration contract

| Field | Value |
|---|---|
| **Repo** | backend (token custody + send); pipeline (status webhook); frontend (schema + status surface) |
| **Status** | Accepted (2026-06-12, merged to main; vendor + topology locked with Mark; envelope mapping under review) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0019 (proposal lifecycle), ADR-0044 (silver contracts), ADR-0067 (CPQ → proposal materialization), ADR-0042 (division of labor), ADR-0034/0043 (front end never holds provider keys), ADR-0012 (integration identity map / external_ref), ADR-0014 (consent ledger) |
| **Epic** | #318 · Parent #314 |

## Problem

A proposal (ADR-0019) has no path to a signature. Sales must leave Imperion, sign elsewhere, and hand-update status — the signature event, the signed artifact, and the lifecycle transition all live outside the system. Every major CRM offers native or partnered e-sign. Decision (Mark, 2026-06-12): integrate **DocuSign** rather than build a signature surface.

## Context

- **The front end never holds a provider key (ADR-0034/0043).** DocuSign credentials must live in **backend Key Vault**; the send is a backend process. This is the same custody posture as every other integration here.
- **Status is push, not poll.** DocuSign **Connect** webhooks report envelope lifecycle events. Webhooks are inbound live data → they belong in `_Pipeline` (the webhook/merge repo, ADR-0042), exactly like the Meta and Defender feeds.
- **Identity-map convention exists (ADR-0012).** An envelope is an external object with its own id; map it by `(source='docusign', external_ref=envelope_id)` like other feeds, so a webhook can upsert status by its own id.
- **The proposal is the signable artifact (ADR-0019), and post-CPQ it carries materialized quote lines (ADR-0067).** E-sign signs the proposal PDF; the contract (ADR-0044) is created from the signed proposal. E-sign does not couple to the quote directly.
- **Signing is a consented action.** The signer relationship and the signed document touch consent/retention (ADR-0014).

## Options considered

- **A. Build an in-app signature pad.** Rejected: legally weaker (no audit trail / tamper-evidence / identity assurance), and reinvents a solved, regulated problem.
- **B. DocuSign, auth-code (interactive) grant.** Works for a user clicking send, but breaks for unattended/agent-initiated sends and needs a user session. Rejected as the primary grant.
- **C. DocuSign, JWT (service) grant + Connect webhook (chosen).** Unattended envelope send from the backend on a service identity; Connect pushes status to the pipeline. Matches our custody + feed topology and supports both human- and agent-initiated sends.

## Decision

1. **Auth: JWT grant, token in backend Key Vault (ADR-0034/0042).** DocuSign integration key + RSA private key live in Key Vault; the backend mints a short-lived access token per the JWT flow. No DocuSign secret is ever held by the front end, logged, or passed on a command line. (`Never commit secrets.`)

2. **Send: a backend process.** Given a proposal, the backend renders/loads its PDF, creates a DocuSign envelope with the signer recipients, sends it, and records the returned `envelope_id`. The send is **approval-aware** where policy requires it (ADR-0055/0058) — an agent-initiated send crosses the same gate as any outbound action.

3. **Status: DocuSign Connect webhook → `_Pipeline`.** A Connect endpoint in the pipeline receives envelope events, **verifies the HMAC signature**, and upserts status onto `esign_envelope` / the proposal by `(source='docusign', external_ref=envelope_id)` (ADR-0012). Status ladder: `created → sent → delivered → completed | declined | voided`.

4. **Lifecycle coupling (ADR-0019).** `completed` advances the proposal to its signed state and is the trigger to create the contract (ADR-0044); `declined`/`voided` return the proposal to an actionable state. The mapping from envelope status → proposal lifecycle state is owned by ADR-0019 and referenced, not duplicated, here.

5. **Signed artifact storage.** On `completed`, the backend retrieves the signed, certified PDF + the DocuSign certificate of completion and stores them as artifacts (blob) with a row pointer on `esign_envelope`. Postgres holds metadata + pointer, not the PDF.

6. **Consent/retention (ADR-0014).** Signer recipients and the signed document are recorded against the consent ledger; retention follows the contract-document policy.

**Table sketch (migration number assigned at implementation; verify on disk):**

```sql
esign_envelope (
  id, proposal_id fk, contract_id fk null,
  provider text not null default 'docusign',
  external_ref text,                 -- DocuSign envelope_id (ADR-0012 upsert key)
  status text check (status in ('created','sent','delivered','completed','declined','voided')),
  signed_pdf_uri text null, certificate_uri text null,
  sent_at, completed_at, voided_at, created_at, ...
  unique (provider, external_ref)
)
-- recipients (signer order/role/status) as a child table or jsonb on the envelope.
-- proposal gains an esign status mirror for fast read (ADR-0019 owns the lifecycle enum).
```

## Consequences

- The signature event becomes first-class data: status on the proposal, signed artifact retrievable, contract creation automated off `completed`.
- One more pipeline webhook to operate + secure (HMAC verify, replay protection) — consistent with existing feeds, no new pattern.
- DocuSign is a new vendor relationship (commercial + DPA); it holds signer PII and signed documents. Captured as a security-review item at build.

## Future considerations

- Embedded signing (sign inside Imperion via DocuSign embedded recipient) vs email signing — v1 is email signing.
- Templated envelopes / signing order for multi-party contracts.
- Alternative providers behind the same `esign_envelope` abstraction (provider column already allows it) — would need an ADR.
