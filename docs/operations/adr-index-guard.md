# ADR index guard — drift scoping + self-heal (#1493)

The ADR index (`docs/decision-records/README.md` table between the
`ADR-INDEX` markers + `docs/decision-records/adr-index.json`) is **generated**
by `scripts/adr-index.mjs` (ADR-0090) and committed. Two CI mechanisms keep it
fresh; this doc explains both and the manual fallback.

## The failure mode this guards (root cause of #1493)

PR status checks run against the merge ref computed **when the run starts**,
and the `main` ruleset does **not** require branches to be up to date
(`strict_required_status_checks_policy=false`). So when several ADR PRs merge
close together — ADR-0128/0129/0130 landed in three squash-merges within seven
minutes — each PR regenerated the index **on its own branch** (each missing the
siblings' rows), each passed `node scripts/adr-index.mjs --check` at push time,
and no event ever re-ran anyone's checks. The combined post-merge `main` index
was stale, which made the `docs` required check fail on **every** open PR
(they all inherit main's tree).

No PR-level check can catch this pre-merge without requiring up-to-date
branches (a deliberate non-choice — it would tax every parallel session with
constant rebase/re-run cycles). The durable fix is post-merge self-repair plus
blast-radius scoping.

## Mechanism 1 — drift scoping in the `docs` job (`.github/workflows/ci.yml`)

`node scripts/adr-index.mjs --check` still runs on every PR and on push to
main. On failure in a PR:

- **The PR touches `docs/decision-records/`** → hard fail. The authoring PR
  must run `node scripts/adr-index.mjs` and commit the regenerated
  `README.md` + `adr-index.json`.
- **The PR does not touch `docs/decision-records/`** → pass with a
  `::warning::` — the drift is by definition inherited from main (the index is
  a pure function of that directory's contents), and blocking innocent PRs is
  exactly the #1493 blast radius. The heal workflow (below) repairs main.

On push to main (and `workflow_dispatch`) the check stays strict.

## Mechanism 2 — `adr-index-heal` workflow (`.github/workflows/adr-index-heal.yml`)

On every push to `main` touching `docs/decision-records/**` or
`scripts/adr-index.mjs`:

1. Run `--check`; exit quietly if fresh.
2. On drift: regenerate, verify `--check` now passes (duplicate ADR numbers or
   broken frontmatter are NOT regen-fixable — the run fails loudly and a human
   or agent fixes the ADR files in a normal PR), force-push the fixed
   `bot/adr-index-heal` branch, and open (or update) the heal PR.
3. Dispatch CI onto the heal branch via `workflow_dispatch` — required because
   `GITHUB_TOKEN`-created PRs never fire `pull_request` runs (the same
   constraint release-please documents; `workflow_dispatch`/`repository_dispatch`
   are GitHub's exceptions to the recursion guard).
4. Poll `gh pr checks`; on green, squash-merge with `--delete-branch`. The
   ruleset is fully respected (PR + green `build`/`test`/`docs`, zero required
   approvals, no bypass actor involved).

Recursion-safe: the bot's own merge push fires no workflows; a human-caused
push to decision records re-enters the workflow, finds no drift, and exits.

Residual race: if another ADR PR merges in the instant between the heal PR's
final check and its bot merge, that human-caused push triggers a fresh heal
run, which regenerates from the newer main. If the *bot* merge itself is the
last write and is somehow stale, no event fires — but the next
decision-records push (or any push-to-main `docs` job, which stays strict)
surfaces it.

## Manual fallback

```bash
node scripts/adr-index.mjs   # regenerates README.md + adr-index.json
git add docs/decision-records/README.md docs/decision-records/adr-index.json
# commit on a branch, open a PR (conventional title), merge on green
```

If the heal workflow errors with "still fails after regeneration", the problem
is content, not staleness: duplicate ADR numbers (renumber per the §10.3
claim-at-merge rule) or missing required frontmatter (`adr`, `title`,
`status`, `date`, `summary`).
