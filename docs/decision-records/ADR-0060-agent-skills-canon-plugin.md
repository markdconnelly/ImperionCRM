# ADR-0060: Agent skills canon — an in-repo Claude Code plugin marketplace

| Field | Value |
|---|---|
| **Repo** | frontend (cross-repo contract, same pattern as the unified security standard) |
| **Status** | Accepted (2026-06-12) |
| **Date** | 2026-06-12 |
| **Cross-references** | ADR-0042 (four-repo system), system CLAUDE.md §7–8 (standing tooling pattern), #266, #267 |

## Problem

Agent skills (on-demand domain contracts for Claude Code: the Graph access
model, the Autotask/IT Glue contracts, the pinned vector contract) existed only
in one machine's `~/.claude/skills`. That is invisible to review, unversioned,
unreachable by other clones (`ImperionCRM-agentB`), other machines, and cloud
agents — and it has already drifted: the GDAP skill still taught a model an ADR
superseded. Skills are cross-repo knowledge; they need a canon with the same
guarantees as code.

## Options considered

1. **Claude Code plugin marketplace inside this repo** (this decision):
   `.claude-plugin/marketplace.json` + `plugins/imperion-skills/`. Enabled once
   per machine via `extraKnownMarketplaces` + `enabledPlugins` in user-level
   settings; Claude Code git-syncs it automatically.
2. Check `.claude/skills/` into each of the four repos — rejected: four diverging
   copies of cross-repo contracts, the exact failure mode the system CLAUDE.md
   exists to prevent ("written once and never diverges").
3. Skills in the non-repo parent folder (`C:\Development\GitHub\.claude\skills`)
   — rejected: loads locally but is not git-versioned, not reviewable, not
   distributable; fails docs-as-code.
4. A fifth dedicated skills repo — rejected: ADR-0042's four-repo split is
   settled; this repo already owns cross-repo contracts (security standard,
   schema), and a fifth repo adds release/auth surface for ~10 markdown files.

## Decision

This repo is the canonical home for agent skills, packaged as the
`imperion-skills` plugin in the `imperion` marketplace
([plugins/imperion-skills/README.md](../../plugins/imperion-skills/README.md)
carries the authoring guide and enablement snippet).

- **Change control:** a skill change is a normal unit of work — issue → branch →
  micro-PR → docs-gate. One skill per PR. When an ADR supersedes what a skill
  teaches, updating the skill is part of that ADR's PR.
- **Distribution:** user-level `extraKnownMarketplaces` (git source pointing at
  this repo) + `enabledPlugins: {"imperion-skills@imperion": true}`. User level,
  not project level, so every clone/worktree/sibling repo on the machine gets
  the same skills.
- **Single copy:** once the plugin is enabled on a machine, loose duplicates in
  `~/.claude/skills` are deleted — two copies with one stale is worse than none.

## Security impact

Skills replicate to every agent machine: they must never contain secrets,
connection strings, or client PII (enforced by the authoring guide + normal PR
review; the repo's secret-scanning applies since skills are tracked files).
Marketplace sync is read-only git over the existing authenticated remote — no
new credentials, no new write path.

## Cost / operational impact

None beyond repo bytes. Sync rides Claude Code's built-in marketplace updater.
Rollback: disable the plugin in user settings; the repo content is inert
markdown otherwise.

## Future considerations

- Sibling-repo-specific skills also live here (the plugin is cross-repo by
  design); if volume ever justifies per-repo plugins, add plugins to the same
  marketplace rather than new marketplaces.
- Candidate next skills are tracked as issues (schema-migrations contract,
  Meta-sources contract).
