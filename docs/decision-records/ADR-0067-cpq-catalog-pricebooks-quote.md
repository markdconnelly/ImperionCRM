# ADR-0067: CPQ — product/service catalog, price books, and guided quote → proposal

| Field | Value |
|---|---|
| **Repo** | frontend (schema owner); backend (approval-gated submit) |
| **Status** | Accepted (2026-06-12, merged to main; scope locked with Mark; data model under review) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0019 (proposal lifecycle), ADR-0044 (silver contracts/tickets), ADR-0055 (tiered agent autonomy / approval policy), ADR-0058 (composer sends via approval-gated backend path), ADR-0042 (division of labor), ADR-0017 (raw SQL migrations) |
| **Epic** | #317 · Parent #314 |

## Problem

Imperion can author a **proposal** (ADR-0019) and hold a **contract** (ADR-0044), but there is nothing between a deal and a proposal: no catalog of what we sell, no price list, no line-item quote with quantities and discounts, no computed deal value (MRR vs one-off vs total term value), and no discount-approval control. Quoting is the spine of a sales motion and every major CRM has it (Salesforce CPQ, HubSpot Quotes, Dynamics). Today a proposal's commercials are free text — unstructured, unreportable, and impossible to forecast against (#316).

## Context

- **Single currency.** Multi-currency is explicitly out of scope (#314, Mark 2026-06-12). All money is GBP; no FX, no currency column beyond a fixed default. This removes the single largest source of CPQ complexity.
- **Recurring is the norm.** As an MSP, most lines are **recurring** (per-seat/month, per-device/month) with a contract term, plus some **one-off** (project, hardware). The model must represent both and compute **MRR**, **one-off total**, and **total contract value (TCV = MRR × term + one-off)** natively — these are the numbers forecasting (#316) and contracts (ADR-0044) need.
- **Approval already has a home.** Discount governance should not invent a new mechanism: ADR-0055 (tiered autonomy) and ADR-0058 (approval-gated backend path) already define how an action crosses a human gate. A discount over threshold is just another gated submit.
- **Schema lives here, process lives in backend (ADR-0042).** The catalog/price-book/quote tables and the quote builder GUI are frontend; the *submit* of a quote that needs approval routes through the backend gate.

## Options considered

- **A. Free-text commercials on the proposal (status quo).** Rejected: unstructured, unreportable, no discount control, blocks forecasting.
- **B. Line items directly on the proposal, no catalog.** Simpler, but every quote re-types products and prices — no consistency, no price governance, no reuse. Rejected: loses the catalog/price-book value that is the point of CPQ.
- **C. Catalog → price book → quote → proposal (chosen).** A normalized catalog priced by named price books; a quote composes catalog lines at a chosen price book with per-line discount; an approved quote **materializes** proposal line items (ADR-0019). Mirrors how the majors layer it and keeps each object single-purpose.

### Tradeoffs

C is four new objects and a materialization step, vs B's one. Accepted: the catalog and price book are exactly what make repeat quoting fast and governable, and the quote↔proposal split keeps ADR-0019's lifecycle intact (a proposal is still the customer-facing artifact; the quote is the internal commercial construction). The discount-approval gate reuses ADR-0055/0058 rather than adding a CPQ-specific approval engine.

## Decision

1. **Catalog.** `product` rows: SKU, name, description, `kind` (`recurring` | `one_off`), default unit cost, default unit price, default term months (recurring), active flag. The catalog is the master list of sellable items; prices on it are defaults only.

2. **Price books.** A `price_book` is a named list (e.g. `standard`, `partner`, `promo-2026h2`) with an effective window. `price_book_entry` overrides unit price (and optionally floor price for discount control) per product per book. A quote is built **against exactly one price book**; the entry price is the line's starting price.

3. **Quote.** A `quote` belongs to an account/deal, references a price book, and has a status ladder `draft → submitted → approved → rejected → expired`. `quote_line` rows reference a product, carry quantity, the resolved unit price, a per-line discount (% or absolute), and computed extended amounts. Quote-level computed rollups: **MRR**, **one-off total**, **term months**, **TCV**.

4. **Discount-approval gate (reuse, do not reinvent).** Each price book defines a max self-serve discount; a quote whose effective discount (or any line below floor price) exceeds it cannot be `approved` by the author — `submitted` routes through the **backend approval-gated path** (ADR-0058) under the autonomy policy (ADR-0055). Within threshold, the author approves directly.

5. **Quote → Proposal materialization.** Approving a quote materializes its lines onto a proposal (ADR-0019) — proposal line items are a snapshot of the approved quote, not a live join, so later catalog/price-book edits never mutate a sent proposal. The proposal remains the customer-facing artifact and the e-sign target (#318); the contract (ADR-0044) is created from the signed proposal.

6. **Single currency.** No currency column beyond a fixed `'GBP'` default; revisiting this requires lifting the #314 multi-currency exclusion via a new ADR.

**Table sketch (migration number assigned at implementation; verify on disk):**

```sql
product (
  id, sku text unique, name text, description text,
  kind text check (kind in ('recurring','one_off')),
  default_unit_cost numeric, default_unit_price numeric,
  default_term_months int, active bool default true, ...
)
price_book (
  id, key text unique, name text,
  effective_from date, effective_to date,
  max_self_serve_discount_pct numeric, active bool default true, ...
)
price_book_entry (
  id, price_book_id fk, product_id fk,
  unit_price numeric, floor_price numeric, ...
  unique (price_book_id, product_id)
)
quote (
  id, account_id fk, deal_id fk null, price_book_id fk,
  status text check (status in ('draft','submitted','approved','rejected','expired')),
  mrr numeric, one_off_total numeric, term_months int, tcv numeric,
  effective_discount_pct numeric, valid_until date,
  submitted_by, approved_by, ...
)
quote_line (
  id, quote_id fk, product_id fk, quantity numeric,
  unit_price numeric, discount_pct numeric, discount_abs numeric,
  ext_mrr numeric, ext_one_off numeric, ...
)
-- proposal line items: materialized snapshot on approve (ADR-0019), not a live FK to quote_line.
```

## Consequences

- Forecasting (#316) reads structured MRR/TCV from quotes instead of guessing from free text — the two epics share this model; build catalog+quote before the forecast view depends on it.
- E-sign (#318) signs the proposal that a quote materialized; no direct quote↔DocuSign coupling.
- Discount governance is auditable through the existing gate (ADR-0055/0058) — no new approval surface to secure.

## Future considerations

- Bundles / configurable product options (guided selling). Deferred — v1 is flat line items.
- Usage-based / metered pricing. Deferred.
- Multi-currency. Out of scope (#314) until a superseding ADR.
- Admin-editable catalog as part of self-service config (v2, #314 deferred list).
