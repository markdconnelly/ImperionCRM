# Sales SOP — one opportunity across Autotask + KQM (no duplicates)

**Trigger:** you are about to quote a deal (new business, an upsell, or a renewal) in
**KQM** (Kaseya Quote Manager — the quote system of record).

**Why this matters.** KQM **requires an Autotask Opportunity as the quote's parent**, and it
**updates that same opportunity** when the quote is won — it never spawns a duplicate. The
silver `opportunity` is merged on the `autotask_opportunity_id` join key, so as long as the
quote hangs off **one** pre-existing Autotask opportunity, there is **one** silver row and a
clean forecast. The only way to get a duplicate (and a polluted pipeline) is a **human**
creating a second opportunity. This SOP prevents that.

> Governed by [ADR-0130 — Renewals motion & opportunity-consistency model](../decision-records/ADR-0130-renewals-and-opportunity-consistency.md).

## The SOP

1. **Create the Opportunity in Autotask first** — or create it in the Imperion app and let
   it **document back to Autotask**. Either way the opportunity exists **before** the quote.
   (For a renewal, the `kind=renewal` opportunity is minted at *pursuit* — see the ADR's
   two-stage trigger; do not pre-create it 90 days early.)
2. **Launch New Quote from that opportunity**, or in KQM **pick the EXISTING opportunity from
   the dropdown — never "create new".** This is the step that keeps it one opportunity.
3. **Confirm Synced.** The **Primary Quote** field populates on the Autotask opportunity —
   that is your **link proof**. If it does not populate, the quote is not attached; fix the
   link before proceeding.
4. **Win the quote.** KQM **updates that SAME opportunity** — `status==3` fires the
   **sale→delivery spine** (ADR-0080). No new opportunity is created; the silver row stays
   single.

## Gotchas

- **Do NOT manually set the Autotask opportunity to closed/lost while a KQM quote is still
  linked.** KQM **stops syncing** and recovery is messy — you have to **decline the quote →
  create a new quote → relink**. The system **surfaces this condition** (the #1403 integrity
  guard: an Autotask opportunity closed/lost with a live linked KQM quote), but avoiding it
  is far cheaper than recovering from it.
- **The integration's "Quote → Opportunity Mapping" stage mapping must be configured** so
  that **won** maps to the **right Autotask stage**. A misconfigured mapping lands the win on
  the wrong stage and the sale→delivery spine can mis-fire.
