# Sales knowledge — notes & uploads on the Deal 360

[← User guides](README.md)

The **Sales knowledge** panel on the Deal (opportunity) 360 (`/pipeline/[id]`) is where
the sales team captures the context a machine feed can't: running **notes** about the
customer/deal and uploaded **knowledge** (documents about the customer). It is part of
the sale→delivery orchestration epic ([#425](https://github.com/markdconnelly/ImperionCRM/issues/425))
and specified by [#429](https://github.com/markdconnelly/ImperionCRM/issues/429).

## Where you see it

- **Deal (opportunity) 360** (`/pipeline/[id]`) — reached by clicking a deal's title on
  the Pipeline board. The panel sits below the Conversations section.

## What it does

- **Notes** — a free-text area for running notes about the customer/deal. Saving
  replaces the stored notes with the current text.
- **Knowledge upload** — attach a document, image, or archive (≤ 25 MB) about the
  customer. Each upload is appended to the deal's knowledge list (history is never
  rewritten — editing notes later never removes a prior upload).

## How it works (data flow)

The opportunity the app reasons over is a **silver merge** of three bronze sources —
KQM (quote header), Autotask, and the **website** (this manual entry) — with the website
source at **highest merge precedence** (a human override wins;
[ADR-0039](../decision-records/ADR-0039-per-source-bronze-tables.md) resurrection guard).

Saving writes the **`website_opportunities`** bronze (`source='website'`), keyed by the
silver opportunity id:

- The **notes** and **knowledge pointers** land on the bronze row.
- The merge into the silver `opportunity` is a **pipeline transform**
  ([ADR-0042](../decision-records/ADR-0042-division-of-labor-reads-direct-processes-backend.md):
  the GUI writes bronze; the cloud pipeline merges to silver). The GUI does not write
  silver directly.

### File custody (ADR-0042 / ADR-0064)

The front end holds **no storage credentials**. The file **bytes** are streamed to the
caller-gated backend, which AV-scans, hashes (sha256), and stores them in a **private
Azure Blob** ([ADR-0069](../decision-records/ADR-0069-attachments-azure-blob.md)); the
backend returns a custody reference (blob path + digest + size/type) that the GUI records
in `website_opportunities.knowledge_blob_refs`
([ADR-0064](../decision-records/ADR-0064-pm-collaboration-comments-mentions-notifications-attachments.md)
is the attachment-allowlist + blob-custody decision this reuses). Until the backend
blob-custody endpoint is configured (`INTEGRATION_SERVICE_URL`), the upload **degrades with
a notice** — your notes are still saved, and you re-upload the file once it is live.

The uploaded knowledge feeds the **gold layer + vectorization** so the orchestrator can
reason over what sales knows about the customer.

## Permissions

Writing requires the **`sales:write`** capability. The acting user is taken from the
session (never the form), so the uploaded-by attribution is trustworthy.

## Security notes

- File type + size are validated against the shared attachment allowlist
  (`src/lib/attachments.ts`) on the client for a fast reject; the backend re-validates
  authoritatively on the trusted path.
- The bytes never persist in the GUI tier — only the custody pointer is recorded.
- Opportunity titles, notes, and uploaded files can carry client-identifying data; the
  bronze row is PII-bearing and is treated as such (no row-level data in docs/issues).
