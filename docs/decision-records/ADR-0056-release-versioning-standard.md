# ADR-0056: Release versioning standard — coordinated human-declared majors, 3-digit semver, release-please everywhere

| Field | Value |
|---|---|
| **Repo** | frontend (standard applies to all four repos) |
| **Status** | Accepted |
| **Date** | 2026-06-10 |
| **Cross-references** | ADR-0042 (four-repo system) · `docs/architecture/product-roadmap-v1-v3.md` (v1 gate 2) · backend #40/#43 (release-please manifest-mode precedent) |

## Problem

The product roadmap defines v1/v2/v3 as capability-gated product milestones, but the
repos had no shared definition of what the digits in a version number mean, who is
allowed to cut a release, or how "v1" (a product concept spanning four repos) maps to
git tags (a per-repo concept). The first release-please run in the backend exposed the
conflict: it proposed 1.0.0 while the product was nowhere near its v1 gates.

## Context

- Four repos, one product (ADR-0042). Releases live in GitHub's release system,
  maintained by release-please from conventional commits (system CLAUDE.md §3.6:
  never hand-edit tags or CHANGELOG).
- The backend already runs release-please in manifest mode (pinned 0.1.0 → 0.2.0
  after epic #27); the other three repos had nothing wired.
- Many commits land between releases — the scheme must batch gracefully.

## Options considered

1. **Independent semver per repo** — each repo majors on its own breaking changes,
   like library semver. Tags stop meaning product milestones; "what version is the
   backend at v2?" has no answer.
2. **Frontend carries the product version alone** — siblings version meaninglessly.
3. **Coordinated majors, independent feature/minor digits** — majors are product
   milestones declared by the human across all four repos; between majors each repo
   releases at its own pace.

### Tradeoffs

Option 3 costs a small amount of ceremony at each major (four `Release-As` commits)
and means a repo's major digit conveys product era, not API compatibility. In an
internal product where the four repos ship one experience, milestone meaning is worth
far more than library-style compatibility signaling.

## Decision

Option 3. The full normative standard lives in
[`docs/architecture/versioning-standard.md`](../architecture/versioning-standard.md);
the load-bearing rules:

1. **`MAJOR.FEATURE.MINOR`** — strict 3-digit semver. Major (1st digit) = product
   milestone; feature (2nd) = `feat:` commits; minor (3rd) = `fix:`/patch commits.
   **No 4th digit ever** (GitHub release tooling is 3-digit; the 3rd digit batches
   freely). Prerelease suffixes (`-rc.N`) are permitted if ever needed.
2. **Majors are coordinated and human-declared.** v1.0.0 = employees use the product
   for real; v2/v3 = the roadmap's later capability-gated milestones. When Mark
   declares a milestone, all four repos cut `X.0.0` together via `Release-As`
   commits. A `feat!`/`BREAKING CHANGE` commit must never auto-bump the major — it
   bumps the feature digit and is called out in release notes.
3. **Release authority:** the agent merges Release PRs — feature/minor releases at
   natural batch points without asking, `X.0.0` only after the human declares the
   milestone (decision locked 2026-06-10).
4. **release-please manifest mode in all four repos**, baseline 0.1.0 for repos with
   no prior release (backend is already at 0.2.0), `bootstrap-sha` pinned so
   pre-standard history is not re-released.

## Consequences

- Version numbers become product-meaningful: `1.4.2` is unambiguously "v1 era".
- Releases can lag merges only as far as the next batch point, since the agent has
  standing authority to cut feature/minor releases.
- Repos must keep conventional-commit discipline (already enforced by PR-title
  convention) for the digit mapping to stay truthful.

### Security impact

None direct. Tagged releases improve auditability of what shipped when; release
cutting stays inside GitHub's permission model (no new tokens or secrets).

### Cost impact

None — release-please runs on the existing Actions allotment.

### Operational impact

Each repo gains a release-please workflow + two config files. Cutting a major is a
deliberate four-repo operator step (documented in the standard). The Actions
"allow GitHub Actions to create PRs" repo setting must be enabled per repo.

## Future considerations

- If a repo is ever consumed as a library by outside parties, revisit whether its
  major digit must switch to compatibility semantics (would require a new ADR).
- If release cadence across repos drifts confusingly, consider a product-level
  CHANGELOG aggregating the four repos' releases.
