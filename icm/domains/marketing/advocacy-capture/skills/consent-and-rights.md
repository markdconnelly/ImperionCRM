# Skill (Tier 3, workflow-local): consent-and-rights

Mark-editable rules for the **consent precondition** and the **name/logo-use
rights** that govern a customer `reference`. Binds the persona's consent doctrine,
BO-04's refusal floor, and the rights ceiling into the advocacy-capture stages.
Stages cite this; they never restate the policy. Reference data by id, no PII.

## The consent precondition (the hard precondition, D4)

A `reference` **cannot** reach `captured` (or any published state) **without a
recorded `consent_event` on file** — the DB CHECK mirrors this. Applied:

1. A recorded `consent_event` with a **scope of use** must exist for the candidate
   before anything is captured (stage 01 verifies it).
2. **No recorded consent → PARK.** Do not infer, assume, or manufacture consent.
3. **Belle never solicits consent and never contacts the client** (BO-04 refusal
   floor). The consented solicitation is Celeste's; advocacy-capture begins only
   *after* she hands over a consented candidate. This workspace has no
   client-contact / send tool by design.

## The name/logo-use rights rules

Use of a customer's **name** or **logo** is a **rights commitment**, not a routine
act:

1. Any name use / logo use is **`always_gate`, human, MARKETING-owned** (not Legal
   in v1). It **never** self-approves at any rung, in any mode.
2. The use is **scope-bound:** it must fall within the consent_event's recorded
   scope. A **use beyond the consented scope → PARK** — re-consent is required, and
   re-consent is Celeste's act, never Belle's.
3. A **quote** is bounded by the in-scope verbatim captured under consent; no
   paraphrase that exceeds scope, no fabricated quote, no attribution the consent
   does not cover.

A reference or rights use that cannot satisfy these **parks** — it is never
best-efforted forward.
