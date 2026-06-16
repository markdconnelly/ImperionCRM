# Conversations — call & meeting intelligence on the 360

[← User guides](README.md)

The **Conversations** panel surfaces voice conversational-intelligence on the
customer record: the calls, meetings, and uploaded recordings tied to a company
or contact, each with the AI it produced — a summary, action items, sentiment,
objections, and deal-risk signals. It is the 360 companion to the unified
communications timeline ([ADR-0011](../decision-records/ADR-0011-unified-interaction-timeline.md)):
a conversation is an interaction, so its gist also lands on the timeline, and this
panel is the place to read the detail behind it.

The feature is specified by
[ADR-0068](../decision-records/ADR-0068-conversational-intelligence-pipeline.md)
(conversational-intelligence pipeline: capture → transcribe → analyze → embed →
surface).

## Where you see it

- **Company 360** (`/accounts/[id]`) — every conversation captured for the company,
  including those tied to one of its deals or contacts.
- **Contact 360** (`/contacts/[id]`) — the conversations tied to that specific
  contact (company-wide voice that is not contact-specific stays on the Company
  360, so it is not duplicated).
- **Deal (opportunity) 360** (`/pipeline/[id]`) — the conversations tied to that
  specific deal (company-wide voice with no deal link stays on the Company 360, so
  it is not duplicated). Reached by clicking a deal's title on the Pipeline board.

The panel sits just above the **Communications timeline** section on the Company and
Contact 360s, and is the primary section of the Deal 360.

## What each conversation shows

A header line — the **source** (Call (ACS), Teams meeting, or Uploaded recording),
the **pipeline status** (Captured → Transcribed → Analyzed, or Purged once the
retention window passes), when it started, its duration, and whether a transcript
was captured — followed by its **AI insights** in reading order:

1. **Summary** — the gist of the conversation.
2. **Action items** — the follow-ups it produced.
3. **Sentiment** — how the conversation felt.
4. **Objection** — concerns the customer raised.
5. **Deal risk** — signals that the deal may be at risk.

Insights are produced by the settled AI stack (Claude, [ADR-0043](../decision-records/ADR-0043-settled-ai-stack-drop-legacy-vectors.md));
the model tier that produced each one is recorded. (The settled AI stack is
[ADR-0043](../decision-records/ADR-0043-settled-ai-stack-drop-legacy-vectors.md).)
A conversation that has not been analyzed yet shows a short note instead of
insights.

## Who can see it

The panel follows the visibility of the page it is on — anyone who can open a
Company or Contact 360 sees its Conversations panel. It is **read-only**: it renders
data and never captures, edits, or deletes a conversation.

## How it is built

This is a **read-only front-end surface** ([ADR-0042](../decision-records/ADR-0042-division-of-labor-reads-direct-processes-backend.md) —
the front end renders, processes live in the backend/pipeline). It consumes the
conversational-intelligence read model over the silver `conversation`,
`conversation_segment`, and `conversation_insight` tables (migration 0112) via
`crm.listConversationsForAccount()` and `crm.getConversation()` — **no new schema,
no new migration**.

- Presentation helpers (source / status / insight-kind labels + icons, duration
  formatting, insight-text extraction, insight ordering): the unit-tested
  `src/lib/conversations.ts`.
- The panel itself: `src/components/comms/conversation-panel.tsx`.
- Wired onto `src/app/(app)/accounts/[id]/page.tsx`,
  `src/app/(app)/contacts/[id]/page.tsx`, and
  `src/app/(app)/pipeline/[id]/page.tsx` (the Deal 360, ADR-0068 / #681).
- The Deal 360 keys the account-scoped conversation read off the deal's account
  (`crm.getOpportunity()` exposes `accountId`) and filters it to this deal via
  `filterConversationsForOpportunity()` in `src/lib/conversations.ts`.

The whole **capture → transcribe → analyze → embed** write path is a backend
process (ADR-0042/ADR-0068), **dormant** until ACS / Azure Speech credentials land.
Until then — and on any environment where migration 0112 is not yet applied — the
reader returns an empty list and the panel shows an honest empty state. **It never
fails the page when the pipeline is unwired.**

## Not yet in the panel

- **Drilling into the full diarized transcript** — the per-turn segments
  (`conversation_segment`) are read but not yet rendered as a transcript reader.
- **Live data** — populated once the backend capture/analyze pipeline and ACS /
  Azure Speech credentials are wired (ADR-0068 source priority: ACS-first,
  Teams-fast-follow, upload always).
