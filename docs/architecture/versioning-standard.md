# Versioning & release standard (all four repos)

| Field | Value |
|---|---|
| **Scope** | Cross-repo: `ImperionCRM` · `ImperionCRM_Backend` · `ImperionCRM_Pipeline` · `ImperionCRM_LocalPipelineEnrichment` |
| **Status** | Adopted 2026-06-10 (decisions locked with Mark; ADR-0056, issue #130) |
| **Companions** | [`product-roadmap-v1-v3.md`](product-roadmap-v1-v3.md) (what gates each major) · ADR-0056 (the decision record) · [← Architecture index](README.md) |

This is the normative standard for what version numbers mean, who cuts releases, and
how the tooling is wired. Like `docs/security/unified-security-standard.md`, it is
written once here and consumed by the sibling repos — do not fork or restate it.

## 1. Digit semantics — `MAJOR.FEATURE.MINOR`

| Digit | Name | Bumped by | Meaning |
|---|---|---|---|
| 1st | **Major** | Human declaration only (`Release-As`) | A product milestone. **v1.0.0 = employees use the product for real.** v2/v3 = the roadmap's later capability-gated milestones. |
| 2nd | **Feature** | `feat:` commits (release-please) | New capability shipped since the last release. |
| 3rd | **Minor** | `fix:` and other patch-class commits | Fixes/patches shipped since the last release. |

- **Strict 3-digit semver. No 4th digit, ever** — GitHub's release tooling
  (release-please, semver ordering) is 3-digit. The 3rd digit has unlimited range;
  `1.2.47` is fine and expected, since many commits batch into each release.
- If a pre-release pointer is ever needed, use semver prerelease suffixes
  (`1.0.0-rc.1`), never a 4th digit.
- A release batches everything merged since the previous release; the highest-class
  commit in the batch decides which digit moves (any `feat:` → feature bump).

## 2. Majors are coordinated and human-declared

- v1/v2/v3 are **product** milestones, not per-repo events. When Mark declares one,
  **all four repos cut `X.0.0` together**, each via an empty commit carrying
  `Release-As: X.0.0` in the footer (release-please honors it), merged through the
  normal PR flow.
- Between majors, each repo bumps its feature/minor digits independently at its own
  pace. `Backend 1.4.2` and `Frontend 1.9.0` both belong to the v1 era.
- A `feat!:` / `BREAKING CHANGE:` commit **must never auto-promote a major**. Majors
  do not mean "breaking" here; they mean "milestone". A genuinely breaking contract
  change is still a `feat:` (feature bump) plus an explicit call-out in the PR body
  and release notes. Repos are pre-1.0 today, where release-please already
  suppresses major bumps; after v1.0.0, avoid the `!`/footer syntax entirely.

## 3. Release authority & cadence (locked 2026-06-10)

- **The agent cuts releases.** Feature/minor Release PRs are merged at natural batch
  points — end of an epic, a coherent slice of work, or before a handoff — without
  asking. `X.0.0` Release PRs are cut **only after Mark declares the milestone**;
  the declaration is his single touchpoint.
- Merging a Release PR is the publish event: it creates the tag, the GitHub
  Release, and the CHANGELOG entry. Per system CLAUDE.md §3.6: never hand-edit
  tags or CHANGELOG, never `gh release create` manually.
- Known mechanics: the Release PR is bot-created, so required PR checks don't
  trigger — close/reopen it once (a human-class event) to run the gate, then merge.

## 4. Tooling wiring (identical in all four repos)

Each repo carries:

- `release-please-config.json` — `release-type` per stack (`node` for the TS repos,
  `simple` for the PowerShell repo), manifest mode, `bootstrap-sha` pinned at the
  commit where the standard was adopted so pre-standard history is never
  re-released.
- `.release-please-manifest.json` — the current version. Baseline `0.1.0` for repos
  with no prior release (backend was already at `0.2.0` when the standard landed).
- `.github/workflows/release-please.yml` — runs on push to `main`, maintains the
  Release PR.
- Repo setting "Allow GitHub Actions to create and approve pull requests" enabled
  (one-time, per repo).

## 5. Quick reference

| You want to… | Do |
|---|---|
| Ship a feature release | Merge the open Release PR when the batch is coherent (agent: allowed without asking) |
| Ship a fix-only release | Same — release-please will bump the 3rd digit |
| Declare v1/v2/v3 | Mark says go → empty `Release-As: X.0.0` commit via PR in **each** of the four repos → merge the four Release PRs |
| Mark a breaking contract change | `feat:` + explicit call-out in PR body/release notes — never `feat!:` |
| Pre-release pointer | `X.Y.Z-rc.N` prerelease suffix (rare; needs no config change) |
