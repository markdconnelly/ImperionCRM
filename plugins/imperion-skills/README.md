# imperion-skills — the canonical agent skill library

This plugin is the **single canonical home** for Imperion CRM agent skills
(ADR-0060). A skill is a `SKILL.md` that teaches an agent a settled domain
contract on demand — deeper than CLAUDE.md can afford to carry on every session,
narrower than a full doc read.

## Why here

Same precedent as `docs/security/unified-security-standard.md`: cross-repo
contracts are written once, in this repo, and consumed by the siblings. Skills
that lived in `~/.claude/skills` were unversioned, unreviewed, single-machine.
Here they are PR-reviewed, ADR-disciplined, and reach every agent on every
machine that has the marketplace enabled.

## Enabling (one-time, per machine / per agent host)

Add to the **user-level** `~/.claude/settings.json` (user level so all four
repos, extra clones, and worktrees get the skills regardless of cwd):

```json
{
  "extraKnownMarketplaces": {
    "imperion": {
      "source": { "source": "git", "url": "https://github.com/markdconnelly/ImperionCRM.git" }
    }
  },
  "enabledPlugins": { "imperion-skills@imperion": true }
}
```

Claude Code clones/pulls the marketplace into `~/.claude/plugins/marketplaces/`
and keeps it updated; merged skill changes propagate on the next sync. Private
repo: the machine needs working git auth for github.com (the `gh` credential
helper suffices).

## Authoring a skill (the loop is the normal one)

1. **Issue first** in this repo; label `skill`.
2. One skill added/changed per micro-PR, under `plugins/imperion-skills/skills/<name>/SKILL.md`.
3. Frontmatter: `name` (kebab-case, `imperion-` prefix) and `description` —
   the description is the trigger; pack it with the keywords an agent would
   have in context when the skill should fire, and end with
   "...in any ImperionCRM repo".
4. Body rules:
   - Teach the **contract**, not the code — cite ADRs (with repo prefix) instead
     of re-arguing them; point at files instead of pasting them.
   - State who owns what across the four repos when relevant.
   - Keep it under ~100 lines. If it needs more, it is documentation — write the
     doc and make the skill the map to it.
   - Never include secrets, connection strings, tenant-specific tokens, or
     client PII (skills replicate to every agent machine).
5. **A skill is a claim about settled reality.** When an ADR supersedes the
   reality a skill describes, updating the skill is part of that ADR's PR
   (docs-gate applies — the skill IS docs).
6. Bump `version` in `.claude-plugin/plugin.json` (minor for new skills, patch
   for corrections) in the same PR.

## What belongs here vs elsewhere

| Content | Home |
|---|---|
| Always-needed contract (repo roles, change workflow) | CLAUDE.md (loads every session) |
| Settled domain contract needed on demand | **a skill here** |
| Volatile status | `docs/STATE.md` / issues |
| Full reference detail | `/docs` tree; skill links to it |
