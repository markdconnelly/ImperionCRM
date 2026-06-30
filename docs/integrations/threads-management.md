# Threads management surface (`/threads`)

Belle's channel cockpit for our own Threads presence — **compose · reply queue · mentions
inbox · insights**. Epic #1334 slice **S5** (the management GUI + Belle wiring); architecture
is **ADR-0125** (Threads integration) under **ADR-0124** (Social Media Management plane).

## What it is

A read-mostly surface in the **Marketing** nav group (`/threads`, role-gated to marketing via
`canSeeMarketing`). It renders our Threads activity from the unified data tiers and lets a
marketer (or Belle, via the orchestrator) **propose** outbound posts/replies that a human
approves — it never sends directly.

| Panel | Reads | Source |
|---|---|---|
| Compose | — (write path) | proposes `publish_threads` |
| Reply queue | `interaction` source=`threads`, kind=`social_comment` | replies on our posts |
| Mentions inbox | `interaction` source=`threads`, kind=`mention` | public mentions of us |
| Our posts | `interaction` source=`threads`, kind=`social_post` | our published posts |
| Insights | `social_metric` platform=`threads` | lifetime + 28-day windows |

All reads are **direct rendering reads** (ADR-0042 — the front end may read the DB to render);
no process runs in this repo. The surface renders **empty/dormant** until S3 ingest
(LocalPipeline #356) hydrates the `threads_*` bronze and merges it to silver — the expected
state for this slice.

## Outbound is governed — Belle drafts, humans approve

Compose and reply build a generalized **ProposedAction** envelope and forward it VERBATIM
through the shared `approveProposedAction` choke point (the ONLY send path — backend ADR-0033),
exactly like every other governed action. Two catalog kinds (registered in
`src/lib/agent/action-catalog.ts`):

- `publish_threads` — `{ text }`
- `reply_threads` — `{ replyToId, text }`

Both are **tier T3, `dataClass: operational`, `consentClass: none`**, executor `threads_publish`.
A public Threads post/reply is **customer-facing — a HARD autonomy ceiling** (ADR-0109/0121):
it **never** auto-executes above the dial ceiling and **always** routes to the pending-action
cockpit. **v1: every Threads Social Action is human-approved** (ADR-0124 D4).

The propose wrappers are `proposeThreadsPostAction` / `proposeThreadsReplyAction` in
`src/lib/agent/threads-actions.ts`. The GUI passes the interaction `id` as `replyToId`; the
backend skill (S4 **BE #417**) resolves it to the Threads post external ref and calls
`graph.threads.net`, then logs the result to `interaction` (source=threads, direction=outbound).

### Belle's grant

Belle (marketing agent) is granted both kinds. The front-end grant contract is
`BELLE_THREADS_GRANT` in `src/lib/agent/threads-grant.ts` (mark-gated, customer-facing HARD
ceiling), kept in lockstep with the action catalog. The **authoritative** deny-by-default
`agent_tool_grant`
row — plus the `source_skill(provider='threads')` + autonomy policy — is seeded by the S4
backend migration (schema is migration-owned, CLAUDE.md §1).

## Connecting Threads (OAuth — #1500)

The `conn-company-threads` token is acquired from the **Threads connector card** on
`/settings/connections` via **Connect with Threads** — the Instagram-anchored Threads OAuth
(graph.threads.net's OWN auth), **separate from the Meta (Facebook / Instagram Graph) card**, which
yields no Threads token. The flow mirrors the QBO company-consent round-trip: the backend `start`
parks a one-time CSRF state and returns the consent URL; the admin signs in; the Threads login
redirects to `/api/connections/threads/callback`, which forwards `code`+`state` to the backend
exchange. The `client_secret` exchange runs server-side and the long-lived token is custodied in Key
Vault — the browser/DB never hold it (CLAUDE.md §1/§5, ADR-0125 D1). A **manual token paste remains as
a break-glass fallback only**. Full flow + outcome vocabulary: [Integrations README §6.3](README.md).

## Dormant / fail-closed

Until the `conn-company-threads` Key Vault secret lands **and** Meta App Review clears the
`threads_content_publish` / `threads_manage_replies` scopes, the publish/reply path is
**propose-only / fail-closed** (ADR-0125 D5; the standing no-live-sends-until-Mark-opens rule).
In that state the propose actions return a clear notice rather than sending. No secrets ever
touch the GUI/DB — the token lives in Key Vault, referenced by name only (ADR-0103/0122).

## Security impact

- No new send path — outbound rides the existing deny-by-default governed plane (ADR-0107).
- Customer-facing HARD ceiling + `mark_gated` + human approval + audit: a mis-routed or
  prompt-injected agent cannot emit a public Threads post without a grant **and** a human.
- No secrets in code, config, components, or grants. Token custody is Key Vault.

## Files

- `src/app/(app)/threads/page.tsx` — the surface (server component).
- `src/components/threads/{threads-compose,threads-reply-list,threads-insights}.tsx`.
- `src/lib/agent/threads-actions.ts` — propose wrappers; `src/lib/agent/threads-grant.ts` — `BELLE_THREADS_GRANT`.
- `src/lib/agent/action-catalog.ts` — `publish_threads` / `reply_threads` defs.
- `src/lib/threads/threads-data.ts` — `social_metric` (platform=threads) insights read.
- `src/lib/nav.ts` / `src/lib/auth/roles.ts` — nav leaf + role guard.

### Connect flow (#1500)

- `src/lib/integrations/company-providers.ts` — `threads` provider (`oauthConnect`, break-glass `fields`).
- `src/app/(app)/settings/actions.ts` — `connectThreadsAction` (backend `/connections/threads/start`).
- `src/app/api/connections/threads/callback/route.ts` — server-side `code`+`state` exchange.
- `src/lib/integrations/threads-connect.ts` — connect-outcome vocabulary + notices.
- `src/lib/services/index.ts` — `startThreadsConnect` / `completeThreadsConnect` service methods.
