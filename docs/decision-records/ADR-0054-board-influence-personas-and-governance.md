# ADR-0054: Board of Directors — influence personas, packet grounding, facilitator, advisors, and recommendation review

| Field | Value |
|---|---|
| **Repo** | frontend (schema owner; runtime changes land in backend per ADR-0042) |
| **Status** | Accepted (2026-06-10, decisions locked with Mark in the board-vision grilling session, issue #118; §4 amended to the deputy model the same day, issue #123) |
| **Date** | 2026-06-10 |
| **Cross-references** | ADR-0049 (board persistence), backend ADR-0039 (board runtime), ADR-0050 (admin-only AI pages), ADR-0055 (autonomy tiers) |

## Context

The board runtime (backend ADR-0039) and its persistence (ADR-0049, migration 0056) are
live: convene → two-round deliberation → synthesis, five seeded personas, transcripts and
recommendations persisted, admin-only. But the seeded personas are generic role prompts,
deliberation is grounded only in a thin reporting snapshot plus pasted context, synthesis
has no facilitation character, there is no advisor mechanic, and the human owner has no
formal voice in or over the outcome. Mark selected a roster of named business thinkers to
power the seats and reserved the CISO role for himself.

## Decision

1. **Personas are influence profiles, never impersonations.** Seats keep functional names
   (Chief Executive, Chief Financial Officer, …). Each persona's `agent.instructions`
   cites the named thinkers' *published frameworks* (books, shareholder letters, talks) as
   reasoning lenses; the agent never claims to be the person, never speaks first-person as
   them, and the UI never presents a real person's name as a board member. (Rejected:
   full impersonation and named-but-disclaimed personas — right-of-publicity exposure for
   living, actively-litigious people, in a **public repo**, and a landmine if the product
   is ever shown to a client or productized for other MSPs.)

2. **Anchor + lenses per seat.** One persona per officer seat, written around a dominant
   anchor framework plus named secondary lenses invoked when relevant:
   - **CEO** — anchor: Herjavec (built/sold an MSSP — the only influence who ran this
     business model at scale); lenses: Bezos (Day-1, written-narrative discipline,
     customer obsession), Nadella (partner-ecosystem strategy, growth mindset), Sinek
     (Start With Why / Infinite Game), Willink (Extreme Ownership).
   - **CFO** — anchor: Crabtree (*Simple Numbers*: labor-efficiency ratio, salary-cap
     thinking for service businesses); lenses: Ramsey (debt aversion, cash reserves),
     Dalio (macro/risk machine — "what happens to MSP demand in a downturn?").
   - **COO** — anchor: Leila Hormozi (people systems, hiring/firing, scaling ops culture);
     lenses: Lencioni (Five Dysfunctions / organizational health), Covey (7 Habits + 4
     Disciplines of Execution).
   - **CMO** — anchor: Alex Hormozi (offers, $100M Leads — feeds the demand-gen engine);
     lenses: Vaynerchuk (attention arbitrage, content volume), Carnegie (relationship-led
     sales for an MSP motion).
   - **CISO** — the seat belongs to the human owner (see decision 4); an AI **CISO Staff
     Analyst** deputy drafts the security position, grounded in the security-posture gold
     data; threat-model-of-an-MSP-under-continuous-attack character retained.
   (Rejected: even blends — voices average into generic advice; rival personas per seat —
   blows the seat cap and triples cost.)

3. **Board packet grounds deliberation.** Before round 1, one cheap-tier composition pass
   assembles a topic-relevant written packet — reporting aggregations, semantic-search
   pulls from the gold knowledge layer, security-posture summary, pipeline/campaign
   numbers — and every persona deliberates over the *same* packet (written-narrative
   discipline). The packet is persisted with the session for audit: the record shows what
   the board knew when it recommended. (Rejected: live tools per persona — ~5× cost and
   unpredictable latency; snapshot-only status quo — ungrounded "vibes" deliberation.)

4. **The human CISO holds the seat; an AI deputy drafts for him** *(amended 2026-06-10,
   issue #123 — supersedes the original review-after model)*. The board's security voice
   is the **CISO Staff Analyst**, a deputy persona (`seat_kind='deputy'`) that deliberates
   in rounds 1–2 like any member but is labeled as drafting *for* the human CISO. Mark is
   the CISO of record: synthesis is instructed that the human CISO's stated position
   carries **veto weight on security matters** and supersedes the deputy's draft wherever
   they conflict. Mechanically staged: **v1** — a convene-time CISO-position field
   (`board_session.ciso_position_md`, optional; when empty the deputy's draft stands,
   explicitly labeled as unreviewed staff analysis); **v2** — the full deputy flow:
   sessions become resumable and pause after round 2 (`awaiting_ciso`) for Mark to
   approve, amend, or overrule the deputy's draft before synthesis runs. The post-session
   **ratify/overrule review** on `board_recommendation` is retained as the accountability
   record on the final recommendation — voice before synthesis, verdict after it.
   (Rejected: review-after only — auditor authority, not seat authority; pure human seat —
   loses the posture-grounded draft when he isn't available.)

5. **Synthesis becomes the facilitator; advisors are convene-time invitees.** The hidden
   synthesis agent takes a Lencioni-influenced facilitation character: surface
   disagreements honestly (healthy conflict), never paper over a split board. Three
   advisory personas — Negotiation (Voss: tactical empathy, calibrated questions),
   Performance (Robbins: state/psychology), People & Responsibility (Peterson) — can be
   invited per session when the topic warrants; the seated cap rises 5 → 7; advisors
   speak in deliberation but are labeled advisory and weighed as counsel, not votes.
   One-on-one advisor consults are **orchestrator** sub-agents (v2), not board features.

## Schema impact (migration 0059+, verify next number on disk)

- `board_recommendation`: `review_status text NOT NULL DEFAULT 'pending_review'`
  (`pending_review | ratified | overruled`), `reviewed_by` (app_user ref), `reviewed_at
  timestamptz`, `review_rationale text`.
- `board_session`: `packet_md text` — the persisted board packet; `ciso_position_md text`
  — the human CISO's position (convene-time in v1; captured at the pause in v2). The v2
  `awaiting_ciso` session status ships with the v2 resumable-session migration, not 0059.
- `agent`: `seat_kind text` check (`officer | advisor | facilitator | deputy`) for
  `module='board'` rows; data migration rewrites the four officer personas' `instructions`
  to the influence profiles, converts the CISO row to the CISO Staff Analyst deputy,
  re-characterizes the synthesis agent as facilitator, and seeds the three advisor
  personas (`is_active=true`, never convened by default).
- Backend constant: seated-persona cap 5 → 7 (officers + deputy + ≤2 advisors).

## Security impact

Less, not more, exposure: no real person's identity is simulated (public-repo and
client-facing safe); the packet composer is read-only over data the convener can already
see; advisors and personas remain tool-less in deliberation; the deputy model puts the
human security owner's voice *inside* the deliberation record, and review/overrule adds a
human accountability record on top of the existing audit trail. Board pages stay admin-only
(ADR-0050). Session cost rises bounded-ly: packet pass (cheap tier) + up to 2 advisors ≈
worst case ~15 model calls, still under the ADR-0037 budget ceiling.

## Cost impact

Packet composition runs on the cheap tier (~cents); a full 7-seat premium session lands
roughly $2–5. Bounded by the $250/mo org ceiling (ADR-0037 mechanism, ADR-0055 governance).

## Future considerations

Persona editing UI (v3); board trend awareness (packets referencing prior packets, v3);
advisor consult sub-agents in the orchestrator (v2); productization review of persona
content before any external exposure.
