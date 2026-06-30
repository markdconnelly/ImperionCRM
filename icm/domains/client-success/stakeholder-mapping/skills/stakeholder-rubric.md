# Stakeholder-map rubric (Mark-editable — classify the human map from measured signals)

> DEFAULTS authored by the agent 2026-06-29 (issue #1695). The rubric for `stakeholder-mapping`:
> how to classify a contact's **role**, **influence**, **sentiment**, and **relationship_status**
> from **MEASURED** interaction signals vs your inference; the never-assert-a-detractor-without-
> evidence rule; and champion-departure detection. Mark: edit freely; stages cite this, nothing
> restates it. 💤 propose-only / dormant until the BE stakeholder-mapping executor + #1369/#1370.
> The `stakeholder` schema (enums, the `source` provenance axis, `departed_at`) lives in its OKF
> concept (`okf:stakeholder`); this skill is the *how-to-classify* layer, not the schema.

## First principle: signal vs inference, recorded as `source`

- **Measured signal** = a fact from a source row: an inbound approval, a sent/received message,
  a meeting attendance, a sentiment score, a contact-departure cue (out-of-office permanent, a
  bounce, a "no longer with" reply, a removed mailbox). This is what you can point at.
- **Inference** = your reading of those signals into a role/influence/sentiment.
- **Every derived assessment carries the signals that produced it** and is recorded
  `source=derived` (a human's is `curated`) so a downstream reader weighs measured signal vs
  inference (celeste.md guardrail 3, the `stakeholder.source` provenance axis). A health verdict —
  here, a relationship verdict — without its evidence is not advice.

## Classifying role (from measured signals)

| Role | Measured signal that supports it |
|---|---|
| **champion** | repeatedly advocates internally, drives adoption, initiates contact, vouches in renewals/QBRs |
| **economic_buyer** | approves spend / signs / controls the budget (approval patterns on `opportunity`/comms) |
| **technical_decision_maker** | makes/gates the technical call, owns the integration/architecture conversation |
| **influencer** | shapes the decision without owning the budget or the technical call |
| **user** | uses the service; present in support/usage signals, not in decisions |
| **detractor** | measured friction, opposition, or sustained negative sentiment **with evidence** (see hard rule) |
| **unknown** | the signals do not support any role — the **default**, never a guess |

Influence (`high`/`medium`/`low`/`unknown`) and sentiment (`positive`/`neutral`/`negative`/`unknown`)
follow the same discipline: rate from measured signal, default `unknown` when the signal is absent.

## HARD RULE — never assert a role (especially `detractor`) without evidence

- **An unsupported read is `unknown`, not a guess** (celeste.md guardrail 3). The schema default is
  `unknown` precisely so an empty signal does not become a fabricated label.
- **A `detractor` is the most damaging label to get wrong** — it must be backed by *measured*
  friction/opposition/sustained-negative sentiment, named in the `evidence_note`. No measured basis →
  `unknown`, never `detractor`. This is relationship intelligence on a named person; an unsourced
  "detractor" is a fabrication, and fabrication is prohibited (CONSTITUTION §8 retrieval).
- The same bar applies to a `champion`: advocacy must be *observed*, not assumed from a friendly tone.

## Champion-departure detection (the biggest churn signal)

- A contact currently mapped `role=champion` (or `economic_buyer`) that goes **silent** (no
  inbound/outbound over the rubric window) or shows a **departure cue** → propose
  `relationship_status=departed` with the cue as its `evidence_note`, and surface it as a **churn-risk
  signal routed to 08-D** health-intervention. This is *the* leading churn signal: the champion left.
- Silence alone is a *soft* signal — corroborate with a departure cue before flipping `departed`;
  absent corroboration, lower `influence`/flag for watch rather than asserting departure.
- A new contact appearing with champion-like signals is proposed as the **successor** — the map is
  refreshed, not just decremented.

## Propose-only — the silver write is backend-owed (dial-proof)

- **This workflow PROPOSES; it never writes `stakeholder`.** The proposed map update parks as a
  draft; the backend **stakeholder-mapping executor** persists it (approval-gated, server-side, never
  a direct silver write) — the same propose-only posture as the cyber-risk register's store. No
  autonomy rung turns this into a writer (NO-COMMITS-EVER, celeste.md guardrail 1, dial-proof).
- **The map feeds, it does not act.** Champion-departure → 08-D (churn). The map → 08-A (client-360)
  and 08-C (QBR targeting). A `champion` → advocacy/reference targeting (#1692). Those workflows act;
  this one maps.
- **Confidentiality is absolute.** One client's stakeholders — named people, their roles and sentiment
  — never enter another client's context (celeste.md guardrail 5). No PII values leave the run; record
  a basis note in `evidence_note`, never a quoted private message.
