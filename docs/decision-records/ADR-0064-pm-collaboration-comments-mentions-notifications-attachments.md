# ADR-0064: PM collaboration — comments, mentions, notifications, attachments

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Proposed |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0010 (single task model), ADR-0014/0027 (workflow automation / Power Automate notifications), ADR-0052 (project board), `docs/product/pm-feature-requirements.md` Theme A |

## Problem

Tasks and projects have no collaboration surface: a single `detail`/`notes`
text field, no threaded discussion, no @mentions, no notifications when work is
assigned/due/changed, and no file attachments. This is the highest-perceived gap
vs. every mainstream PM tool and the first thing staff will miss at go-live.

## Context

The app is GUI-only (ADR-0042); any *process* (notification fan-out) is a backend
capability. Power Automate is the sanctioned outbound-notification channel
(ADR-0014/0027). An `audit_log` already records mutations. Per-account SharePoint
sites are tracked (migration 0078) and Azure Blob is available for storage.

## Options considered

1. **Per-entity tables** (`task_comment`, `project_comment`, …) — simple FKs, but
   duplicated schema/UI per object type.
2. **Polymorphic work tables** (`work_comment{parent_type,parent_id,…}`, likewise
   for attachments) — one schema/component reused across task/project/milestone.
3. **Defer collaboration, lean on Teams/Outlook** — rejected: context leaves the
   work item, violates "web app is authoritative" (§2).

### Tradeoffs

Polymorphic loses DB-level FK integrity on the parent (mitigated by a CHECK on
`parent_type` + application validation and a covering index on
`(parent_type, parent_id)`); gains a single reusable comment/attachment/feed
component. The reuse outweighs the integrity cost for an internal tool.

## Decision

Adopt the **polymorphic** model and a backend-dispatched notification pipeline:

- **Comments & activity feed** — `work_comment{ id, parent_type, parent_id,
  author_user_id, body(markdown), edited_at, deleted_at, created_at }`. The
  activity feed is a read view interleaving `work_comment` with `audit_log` events
  for the same object. Soft-delete retains audit (NFR-2). Covers A1.
- **@Mentions** — stored as resolvable user refs in comment body; a mention emits
  a notification and (unless opted out) adds the user as a watcher. Covers A2.
- **Notifications** — GUI writes `notification{ id, recipient_user_id, kind,
  parent_type, parent_id, payload jsonb, read_at, created_at }` +
  `notification_pref{ user_id, kind, channel, enabled }`. The **backend** owns
  fan-out to email/Teams via Power Automate and runs the scheduled due-soon/overdue
  evaluation. The front end never holds a provider key. In-app bell reads the
  table directly. Covers A3.
- **Attachments** — `work_attachment{ id, parent_type, parent_id, storage_ref,
  filename, content_type, size_bytes, uploaded_by, deleted_at, created_at }`.
  Primary store **Azure Blob** (auth-gated SAS, no public URLs); a later option
  links an existing per-account SharePoint document instead of copying (A4-F5).
  Type allowlist + size cap enforced server-side. Covers A4.

Watchers/assignees are defined in ADR-0065 (`work_assignment`); A2/A3 depend on it.

## Consequences

- Reusable comment/feed/attachment components drop into task, project, and
  milestone detail with one implementation.
- A new backend responsibility (notification dispatch + scheduled due evaluation)
  is introduced in `ImperionCRM_Backend`; the GUI slice can ship the in-app bell
  before the outbound channel is wired (degrade gracefully, per house style).

### Security impact

Comments/attachments may carry client PII → access-controlled storage, no
plaintext logging, never copied into issues/PRs (NFR-3,
`unified-security-standard.md`). Attachment upload path needs type allowlist, size
cap, and an AV-scan hook. SAS URLs are short-lived and per-request.

### Cost impact

Azure Blob storage + egress (low). Power Automate notification volume is modest;
batch/digest preferences (A3-F4) bound it.

### Operational impact

Backend gains a scheduled job (due-soon/overdue) and a notification dispatcher.
Bell/unread counts add light read load, paginated (NFR-5).

## Future considerations

Reactions/emoji (A1-F5); rich-text/file embeds in comments; collapsing the
activity feed into a unified cross-object "my activity" view. No-code rules that
*generate* notifications are explicitly out of scope here (separate feature
request).
