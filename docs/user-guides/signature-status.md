# Signature status — e-signature on a proposal

[← User guides](README.md)

The **Signature** panel surfaces the e-signature state of a proposal on its detail
page: whether the proposal has been sent for signature, where each signer stands,
and — once everyone has signed — a link to the signed document. It closes the loop
that used to live outside Imperion: sales no longer leave the app to sign elsewhere
and hand-update the status by memory.

The feature is specified by
[ADR-0071](../decision-records/ADR-0071-esign-docusign-integration.md) (e-signature —
DocuSign integration contract). It completes the e-sign vertical alongside the
backend token custody + envelope send and the pipeline DocuSign Connect status
webhook.

## Where you see it

- **Proposal detail** (`/proposals/[id]/edit`) — the **Signature** panel sits below
  the proposal form. The proposal is the signable artifact (ADR-0019); the contract
  is created from the signed proposal (ADR-0044), so a contract's signature history
  is the proposal envelope it came from.

## What it shows

- **A status badge** for the active (most recent) envelope — the DocuSign envelope
  lifecycle (ADR-0071 decision 3): **Created → Sent for signature → Delivered →
  Signed**, or the terminal **Declined / Voided**. Each tones with the dark-theme
  palette (sent/delivered accent, signed green, voided amber, declined red).
- **Per-signer states** — each recipient with its routing order, name (or email),
  role, and its own signing status, ordered the way the envelope routes them.
- **A signed-document link** — only when the envelope is **Signed** and a signed PDF
  exists. The signed, certified PDF and the certificate of completion live in
  secured storage; the link is served by the backend (ADR-0071 decision 5) — the
  panel never exposes the raw storage location.
- **Earlier attempts** — if a proposal was sent more than once, the count of prior
  envelopes is noted beside the active one.

When no envelope has been sent, the panel shows an **honest empty state** explaining
that sending for signature is a backend (DocuSign) process — it does not invent a
status.

## Who can see it

The panel follows the visibility of the proposal detail page it sits on — anyone who
can open a proposal sees its Signature panel. It is **read-only**: it renders
envelope state and never sends, signs, voids, or edits an envelope.

## How it is built

This is a **read-only front-end surface**
([ADR-0042](../decision-records/ADR-0042-division-of-labor-reads-direct-processes-backend.md) —
the front end renders; processes live in the backend/pipeline). It reads the silver
`esign_envelope` table (migration 0113) via `crm.listEsignEnvelopesForProposal()` —
**no new schema, no new migration**.

- Presentation helpers (status → badge label/tone/icon, the signed-document gate, and
  recipient-jsonb → ordered signer states): the unit-tested `src/lib/esign.ts`.
- The panel itself: `src/components/proposals/signature-status-panel.tsx`.
- Wired onto `src/app/(app)/proposals/[id]/edit/page.tsx`.

The whole **send → sign → complete** write path is owned elsewhere (ADR-0071): the
**send** is a backend process that mints a DocuSign JWT token from Key Vault and
creates the envelope (ADR-0034/0042 — the front end never holds the provider key),
and **status** arrives via a pipeline DocuSign Connect webhook that upserts the
envelope by `(provider, external_ref)` (ADR-0012). Both are **dormant** until
DocuSign consent lands. Until then — and on any environment where migration 0113 is
not yet applied — the reader returns an empty list and the panel shows its empty
state. **It never fails the page when the integration is unwired.** The envelope is
the source of record for signature state; ADR-0019 owns the proposal lifecycle enum,
separately.

## Not yet in the panel

- **The signed-document fetch** — the link is rendered when a proposal is signed, but
  retrieval is served by the backend from secured storage and goes live with the
  DocuSign send/webhook (ADR-0071 decision 5).
- **Send / void controls** — sending a proposal for signature and voiding an
  envelope are backend, approval-aware actions (ADR-0071 decision 2); this surface
  is read-only.
- **Live data** — populated once the backend send + pipeline Connect webhook and
  DocuSign JWT consent are wired.
