# Agent skills — where they live and how they change

> **Scope.** This is a **developer-skill** convention for the engineering agents
> that build Imperion Business Manager (Claude Code). It is distinct from the ICM
> **runtime** skills the agent workforce loads at run time — see
> [icm.md §6](icm.md). Don't mix the two.

[← The AI suite](README.md) · Governing decision: ADR-0060.

Canonical home: [`plugins/imperion-skills/`](../../plugins/imperion-skills/README.md)
in this repo, served as the `imperion-skills` plugin of the in-repo `imperion`
marketplace (ADR-0060). The README there has the per-machine enablement snippet
and the authoring rules.

The contract in one breath:

- **One canon.** Skills are never checked into sibling repos or kept loose in
  `~/.claude/skills` — the plugin is the only copy.
- **Skills are docs.** They ride the issue → branch → micro-PR loop, one skill
  per PR, and the docs-gate treats them as a doc surface: an ADR that changes a
  reality a skill describes updates the skill in the same PR.
- **Skills are contracts, not status.** Settled, ADR-cited knowledge only;
  volatile state stays in `docs/STATE.md` and issues.
- **No secrets / no PII**, ever — skills replicate to every agent machine.

Current skills: see [`plugins/imperion-skills/skills/`](../../plugins/imperion-skills/skills/).
