---
name: imperion-code-review
description: Imperion CRM's code-review rubric — what to actually check on a PR and where the high-risk surfaces are (four-repo boundary correctness, executor idempotency, security baseline, migration discipline, blast radius, PR-record completeness) plus when review is worth the effort and which built-in to reach for. Use when reviewing a PR, diff, or branch, before merging, when running /code-review or /review or /security-review, or judging whether changes are merge-ready in any ImperionCRM repo.
---

# Imperion: code-review rubric

The change workflow (issue → branch → micro-PR) lives in CLAUDE.md and CI enforces
most of it. This skill is the **reviewer's contract**: what a human or agent checks
*inside* the diff, and where this codebase actually breaks. Review effort follows
risk — see the last section. Cite the rule you're invoking; don't re-argue it.

## Repo-boundary correctness (the most common defect class) — ADR-0042/0043

- **A process in the wrong repo is a bug even if it works.** Front end is GUI only:
  direct DB *reads* for rendering are fine, every *process* calls the backend
  (`src/lib/services/external-client.ts`). Reject business logic added to the FE.
- **Schema/migrations only in `ImperionCRM`.** A sibling-repo PR that needs a column
  is wrong by construction — it must stop and route the schema need here.
- **FE holds no AI provider key** (ADR-0043/backend-0034). AI stack is settled (Claude
  Haiku/Sonnet + Voyage voyage-3-large @ 1024 dims, ADR-0041); a new provider needs a
  new ADR, not a PR.
- Identity is Entra everywhere; a third-party IdP in a diff is a stop-and-flag.

## Executor / write-path idempotency — backend ADR-0044

The provisioning + ticket-fire executors are the riskiest live code. Check:
- **Advisory lock** held around the claim; **in-flight rows invisible to the next
  tick** (e.g. `creating` state) so a 5-min timer can't double-act.
- **Convergence on retry** — a persisted external id (`autotask_project_id`) makes a
  crashed retry idempotent; external creates happen **outside** the DB tx.
- **DocuSign hard gate** — nothing provisions until `contract_state='signed'`.
- Executors **never create opportunities** (grill #5). Verify the known mid-batch dup
  window (FE #455) isn't reintroduced elsewhere.

## Security baseline — `docs/security/unified-security-standard.md`

- **Never commit secrets.** Tokens/connection strings/keys → env locally, Key Vault
  deployed. A literal secret in the diff blocks the PR outright.
- Caller-gated backend routes: `authLevel:'anonymous'` + `withAuth` (Easy Auth +
  allowlist, backend ADR-0035). A new route without the gate is a finding.
- **Fail closed + per-tenant isolation** — a tenant neither registered nor GDAP-active
  is never touched; every row tenant-tagged; never read one tenant's data with
  another's token (see `imperion-graph-access`).
- **No client PII in issues, PRs, docs, commits, or logs** — aggregate/redact. Audit
  rows carry counts, never content. The prod DB MCP is read-only/SELECT-only.

## Migration & data discipline — ADR-0039

Additive + idempotent; correct next number; bronze-per-source (one physical table per
source+entity, read through union views). New migrations are **not prod-applied** —
Mark runs them; a PR that assumes them live is wrong.

## Blast radius before shared-module change

Before approving a refactor of a shared module (data layer, auth, services, pipeline
cmdlets), confirm the PR's Testing section lists the graphify `affected` impact. If the
blast radius blows the ~400-line micro-PR budget, the issue should have been split.
(graphify node-matching is finicky — a manual importer trace + full test run is an
acceptable substitute; don't block on the tool.)

## PR-record completeness

The PR body is the durable record: `Closes #N`, What/Why (**cite ADRs**), Docs updated,
Security impact, Testing, Rollback — CI rejects missing sections. **Docs ship in the
same PR** (docs-gate; a skill IS docs). Over budget needs a justified `size-exception`;
no doc surface needs `docs-not-needed` — both ask Mark first.

## Where to spend review effort, and what to run

- **High-value (review hard):** executors, ingestion, bronze→silver merge, auth/identity,
  anything touching money/permissions/deploys/prod data, OAuth/token custody.
- **Low-value (skim):** additive FE that mirrors an existing pattern, doc-only, generated
  migrations/lockfiles.
- **Tools:** `/code-review` (correctness bugs + reuse/simplification) and `/review`
  (this repo's standards + the originating issue's spec) — run on real-logic PRs.
  `/security-review` for security-sensitive changes. `/simplify` for quality-only cleanup.
- **Reviewer authority:** surface anything irreversible or touching
  permissions/billing/deploys/prod data to Mark *before* it lands, even if a permission
  rule allows it. Merge-as-you-go (standing OK) = `--squash --delete-branch`, **never
  `--admin`** (don't bypass the CI gate).

ADR numbers are per-repo — always qualify cross-repo references with the repo name.
