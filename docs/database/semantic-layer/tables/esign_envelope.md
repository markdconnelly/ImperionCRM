---
type: Silver Table
title: esign_envelope
description: One DocuSign e-signature envelope against a proposal — the signature event made first-class; backend sends (JWT, Key Vault), pipeline upserts status from Connect webhooks, the proposal/contract carry a status mirror.
resource: ../../../decision-records/ADR-0071-esign-docusign-integration.md
tags: [silver, sales, esign, docusign, signature]
timestamp: 2026-06-15T00:00:00Z
---

# esign_envelope

The signature event for a proposal, made first-class. A proposal (ADR-0019) is the
signable artifact; this row is the **DocuSign envelope** created when it is sent for
signature, carrying the lifecycle status, the signed-document pointers, and the signer
recipients. Governed by
[ADR-0071](../../../decision-records/ADR-0071-esign-docusign-integration.md).

## Source of record / authority

**DocuSign is authoritative for envelope status; the app owns the linkage.** The
backend mints a JWT token from Key Vault and **sends** the envelope (it holds the
provider credentials — ADR-0034/0042; the front end never holds a DocuSign key); the
pipeline receives DocuSign **Connect** webhooks, verifies the HMAC, and **upserts**
status by `(provider, external_ref)` (ADR-0012). This front end only **reads**. Status
ladder: `created → sent → delivered → completed | declined | voided` (ADR-0071
decision 3). On `completed` the backend stores the signed, certified PDF + the
certificate of completion as **referenced blobs** (`signed_pdf_uri` / `certificate_uri`)
— Postgres holds the pointer, not the document. Send + webhook are **DORMANT** until
DocuSign JWT consent lands (#318/#392).

`proposal.esign_status` / `contract.esign_status` are a **denormalized mirror** of this
row's `status` for fast list render; this envelope is the source of record. ADR-0019
still owns the proposal lifecycle enum (`proposal.status`), separately — the
`completed → signed → create contract` coupling is a backend process (ADR-0071
decision 4), not stored here.

## Schema

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `proposal_id` | uuid | FK → `proposal` (CASCADE) — the signable artifact (ADR-0019) |
| `contract_id` | uuid? | FK → `contract` (SET NULL) — created from the signed proposal (ADR-0044) |
| `provider` | text | `docusign` (default); column keeps the abstraction open (new provider = new ADR) |
| `external_ref` | text? | DocuSign envelope_id; `(provider, external_ref)` unique where present (ADR-0012 upsert key) |
| `status` | text | `created` · `sent` · `delivered` · `completed` · `declined` · `voided` |
| `recipients` | jsonb | signer order / role / status (signer PII) — grows without a migration |
| `signed_pdf_uri` | text? | pointer to the signed, certified PDF blob (set on `completed`) |
| `certificate_uri` | text? | pointer to the DocuSign certificate-of-completion blob |
| `sent_at` / `delivered_at` / `completed_at` / `declined_at` / `voided_at` | timestamptz? | lifecycle stamps |

## Joins

- `proposal_id` → `proposal` (and through it → `opportunity` → `account`).
- `contract_id` → `contract` (the contract created from the signed proposal, ADR-0044).
- Mirror (not FK): `proposal.esign_status` / `contract.esign_status` denormalize this
  row's `status` for fast read.
- Upstream: the DocuSign envelope is mapped by `(provider='docusign', external_ref=
  envelope_id)` (ADR-0012), the same identity convention as other feeds, so the Connect
  webhook upserts status by its own id.

## Notes

**Consent + retention are first-class** (ADR-0071 decision 6, ADR-0014): the signer
recipients and the signed document are recorded against the consent ledger; retention
follows the contract-document policy. DocuSign is a new vendor relationship holding
**signer PII + signed documents** — a security-review item at build (ADR-0071).
`recipients`, the signed PDF, and the certificate are **sensitive + client-identifying**
— keep specifics out of this doc; resolve against the live read-only DB.
