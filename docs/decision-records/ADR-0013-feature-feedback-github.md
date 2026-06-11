# ADR-0013: Feature feedback coupled to GitHub

| Field | Value |
|---|---|
| **Repo** | frontend |
| **Status** | Accepted |
| **Date** | 2026-06-07 |
| **Cross-references** | — |

## Problem

Let employees submit and upvote feature requests, let admins accept/prioritize, and
feed accepted work back into the GitHub "project portion of the repo" while tracking
releases — without building a second issue tracker that drifts from GitHub.

## Context

Engineering already lives in GitHub (Issues/Projects, releases). Feature demand
comes from internal users of Imperion CRM. We want one source of truth for *delivery*
(GitHub) and a friendly *intake/voting* surface in-app.

## Options considered

1. **In-app intake/voting/triage + push to GitHub on acceptance.**
2. In-app only with a manually pasted GitHub URL (no API sync).
3. Use GitHub Issues directly for intake (no in-app surface).

### Tradeoffs

- (1) friendly intake + voting for non-engineers; on acceptance it becomes a GitHub
  Issue on the project board, and status/release flow back so submitters see
  progress. Start one-way (app → GitHub) to limit complexity.
- (2) least build but manual upkeep and drift.
- (3) poor UX for non-engineers; no voting.

## Decision

Adopt (1). `feature_request` (+ `feature_vote`, `feature_status_history`) is the
intake/voting/triage record. On **accept**, create a GitHub Issue via the API,
store `github_issue_url`, and reflect status + `released_in` back from GitHub.
Sync is **one-way (app → GitHub) initially**; two-way is a future option.

## Consequences

### Security impact

GitHub API uses a scoped app token from Key Vault. Only employees (Entra-authed) can
submit/vote; admin role gates acceptance/prioritization (ADR-0016).

### Cost impact

None beyond GitHub API usage.

### Operational impact

Handle GitHub API failures without losing the in-app request (queue/retry the push).
Map GitHub release tags → `released_in`.

## Future considerations

Two-way sync (status/labels from GitHub), roadmap board embedding, dedupe of similar
requests via embeddings.
