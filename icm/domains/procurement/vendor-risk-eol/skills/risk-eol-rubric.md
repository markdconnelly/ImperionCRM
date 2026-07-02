# Risk/EOL rubric (Mark-editable — signal classes + characterization fields + A7 internal-only correlation + the Celeste handoff)

> DEFAULTS authored by the agent 2026-07-01. The rubric for `vendor-risk-eol`: what counts
> as a vendor risk/EOL signal, how a signal is characterized, the hard internal-only rule on
> cross-client correlation, and what the Celeste handoff carries. Mark: edit freely; stages
> cite this, nothing restates it.

## Signal classes

Three classes; a signal that fits none is parked, not forced into one:

| Class | Looks like | Evidence bar |
|---|---|---|
| **Price hike** | a list-price/term change on an in-use SKU in the Pax8 catalog | the old and new price, each cited + as-of |
| **EOL / EOS** | a vendor end-of-life / end-of-support / end-of-sale announcement on an in-use product | the announcement + its effective date, cited + as-of |
| **Vendor instability** | acquisition, divestiture, sustained outage pattern, support degradation, viability doubt | a citable source per claim — rumor-grade parks |

**Ambiguous or unverifiable → park** (vance.md §5). A false vendor-risk alarm spends
Celeste's client credibility; the evidence bar is a citable source with an as-of date (A5),
not a hunch. A signal on a SKU with **no live entitlement or agreement** is noted and closed
— no exposure, no advisory.

## Characterization fields

Every advisory carries all of these, each cited + as-of (A5); a field that cannot be filled
is an escalated gap, never an estimate:

- **Class** — one of the three above.
- **Vendor / SKU** — what the signal is about, by catalog identity.
- **Evidence** — the signal itself: source, as-of, and the announced/effective dates.
- **Exposure** — entitlement count and dollars at stake across the affected base (measured
  from `license_assignment` / `contract`; the dollar roll-up is derived — label which).
- **Timeline** — how long until the signal bites (an EOS in 18 months and a price hike next
  cycle carry different urgency).
- **Replacement posture** — catalog-anchored options ONLY (room.md structural rule 2);
  off-catalog is a catalog gap routed to a human, never an improvised SKU. Posture, not a
  purchase plan — the buy is 02-B2's.

## The internal-only pool-correlation rule (hard — A7 pool-never-bleed)

Correlating the signal across the client base is what makes the advisory valuable — one
client's EOL is a data point, twelve is a fleet posture problem — and it is **strictly
internal**:

- The cross-client view (which accounts, at what scale) lives only in the internal advisory,
  marked internal.
- **No client ever learns another client's exposure** — no roster, count, or hint of the
  affected base appears in anything client-facing.
- **Vendor pricing and contract terms never cross a client or tenant boundary** (CS-08 via
  room.md; vance.md §6) — a discount one client gets is invisible to every other.
- Celeste receives the full internal picture and frames each client's conversation
  individually; the correlation informs her, it never ships through her.

## The Celeste handoff shape (the seam — → Stream 08)

The advisory hands to **Celeste** as a vCIO / client-relationship signal. She owns the
client-facing framing; Vance owes her:

- the characterized advisory (all fields above, cited);
- the internal cross-client map (who is affected, at what scale — internal-only per A7);
- a **per-client relevance line** she can turn into a vCIO conversation — synthetic example:
  "Client A: 40 seats on WidgetSuite, EOS 2027-01-31, agreement runs to 2026-11-30 —
  renewal decision predates the EOS cliff";
- what Vance is NOT asking: no send, no client contact, no buy — actuation, if any client
  chooses it, is the governed procurement sequence (02-B2, `always_gate` at the money gate,
  0184).

## The advisor-never-actuates rule (hard — B9)

- **No vendor switch, cancel, migration, or term renegotiation — ever, at any rung.** The
  advisory motivates; the commit is a human's, at 02-B2's money gate (ADR-0109, 0184).
- **Output is internal** — a reversible, internal `operational`-class advisory (room.md).
  It informs Celeste and the humans; it never acts on a vendor or a client.

## Discipline

- **Cite + as-of (A5)** on the signal, every date, and every exposure figure; label measured
  vs derived.
- **Park, don't guess** — an unverifiable signal, an unfillable field, an unpriceable
  exposure is an escalated gap (vance.md §5).
- **No PII, no row-level values committed.** Accounts by business name only; query the live
  read-only DB for actuals; nothing here names a person.
