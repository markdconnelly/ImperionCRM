# Stage 04 — publish-handoff

**Job:** hand the approved asset to Loveable and record where it landed.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Review result | stage 03 output | the one asset | the approved, brand-compliant asset |
| Asset record | `` `okf:content_asset` `` | this asset | the asset to mark ready and stamp `publish_ref` |

## Process

1. `[script]` Mark the asset `approved → ready` via `content.write` (internal, reversible).
2. `[gui-step]` **Hand to Loveable** — a **human-mediated copy/export** of the approved
   asset into Loveable. There is **NO Loveable API in v1** (D3); the human publishes the
   landing page on Loveable and returns the live URL.
3. `[script]` Store the returned `publish_ref` URL on the `content_asset` via
   `content.write`.

> **This is a HANDOFF, not a send.** No contact is touched, no consent gate applies, and
> this is **not** an ADR-0058 customer send. The whitepaper **form** stays Imperion's (it
> feeds lead-capture / 01-F); the landing **page** is Loveable's. We own the asset and its
> attribution; Loveable hosts the page.

## Outputs

`handoff.md` — the asset's `ready` state, the stored `publish_ref` URL, and a note that the
publish was a human Loveable export (no API, no send).

## Audit

- [ ] Asset marked `ready`; `publish_ref` stored on the `content_asset`
- [ ] The handoff was a human Loveable export (no Loveable API in v1)
- [ ] Nothing was sent to a customer (no contact, no consent gate, not ADR-0058)
