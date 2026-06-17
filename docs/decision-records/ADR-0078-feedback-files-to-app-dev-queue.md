---
adr: 0078
title: "Feedback files to the app-dev queue (supersedes ADR-0013)"
status: accepted
date: 2026-06-11
repo: frontend
summary: "The Feedback page files an idempotent Autotask ticket in the app-dev queue via backend #19, superseding the ADR-0013 GitHub coupling."
tags: [surfaces]
---
# ADR-0078: Feedback files to the app-dev queue (supersedes ADR-0013)

> **Renumbered 2026-06-16 (was ADR-0058).** Two ADRs shared number 0058; this one was
> reassigned to 0078 (the next free local number) per the claim-at-merge rule (ADR-0084)
> as part of the ADR-ingestion overhaul (ADR-0090, #754). The heavily-referenced
> approval-gated-send ADR keeps 0058. No decision content changed.

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted (2026-06-11) |
| **Date** | 2026-06-11 |
| **Cross-references** | Supersedes ADR-0013 · backend #19 · ADR-0052 §7 · issue #100 |

## Problem

ADR-0013 coupled the in-app Feedback page to GitHub: submitting opened a prefilled
GitHub issue. That made employee feedback depend on every employee having GitHub
access and split intake across two systems once the rest of the app standardized on
Autotask queues for work intake (sales → sales queue, project → project queue,
business review → business-review queue, #99).

## Context

The backend now exposes an idempotent Autotask ticket-creation API (backend #19:
`POST /api/autotask/tickets` with a server-side idempotency ledger keyed
`imperioncrm-{origin.type}-{origin.id}`, ADR-0052 §7). Operations live in Autotask;
employees live in the app. GitHub remains the engineering tracker — triage moves
work from the app-dev queue to GitHub manually, which is the deliberate boundary:
*intake* is an ops concern, *delivery* is an engineering concern.

## Options considered

1. **File an Autotask ticket in the app-dev queue via the backend API.**
2. Keep the GitHub coupling (status quo, ADR-0013).
3. File both (ticket + GitHub issue).

### Tradeoffs

- (1) one intake plane for all work; idempotent; no GitHub accounts needed; the
  submitter sees a ticket number. Requires `AUTOTASK_QUEUE_IDS` to map `app-dev`
  and a `FEEDBACK_ACCOUNT_ID` (the internal Imperion account linked to an Autotask
  company) — ops config.
- (2) free, but excludes non-GitHub employees and bypasses ops triage.
- (3) two records to drift; rejected.

## Decision

Option 1. The Feedback page posts a server action that calls
`ticketsService.createTicket` with `queue: 'app-dev'`, the configured
`FEEDBACK_ACCOUNT_ID`, and `origin: { type: 'feedback', id: <per-render submission
uuid> }`. Idempotency: re-posting the same rendered form (double-click, retry after
a transient failure) reuses the submission id, so the backend returns the existing
ticket (`created: false`) — a submission can never file twice. The submitter sees a
confirmation banner with the ticket number. Open to every signed-in employee (no
capability gate — feedback intake is universal; the session check fails closed).

Failure honesty (stubbed-not-broken): backend unavailable / queue unmapped /
account unconfigured → an explicit failure banner, never a fake success and never a
lost-in-the-void submission.

ADR-0013 is **superseded**: the GitHub prefill flow and the
`components/feedback/feedback-form.tsx` client component are removed.

## Security impact

No new secrets in this repo; the call rides the existing managed-identity path
(ADR-0028). The submitter's email is included in the ticket description for
follow-up — internal data landing in the internal PSA, no third-party exposure
(previously feedback text went to GitHub, an external SaaS).

## Cost / operational impact

None beyond existing backend hosting. Ops prerequisites: backend
`AUTOTASK_QUEUE_IDS` gains `app-dev`; web app setting `FEEDBACK_ACCOUNT_ID` set to
the internal account uuid (account must be linked to an Autotask company).

## Future considerations

- Voting/upvoting (ADR-0013's intake vision) can return as a read model over
  app-dev queue tickets if demand appears.
- v2 "Refined" feedback review loops (roadmap) consume the same queue.
