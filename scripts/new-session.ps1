<#
.SYNOPSIS
    Bootstrap an isolated git worktree for a parallel Claude Code session.

.DESCRIPTION
    Enforces the system CLAUDE.md §10 concurrency contract mechanically:
      - §10.1  one session = one git worktree (never a shared working tree)
      - §10.2  standard path  C:\Development\GitHub\wt\sNN-issue-<N>\
               standard port  3000 + NN  (written to the worktree's .claude/launch.json)
      - §3     branch named  type/issue-N-slug  off main

    Given a session number and an issue number, it creates the worktree off the
    repo's current main, branches it, assigns the session's dev/preview port, and
    excludes the local launch.json from the index (it is per-session, not committed).

.PARAMETER Session
    Session number 1-99 (the NN in sNN / the port offset). Two concurrent sessions
    must never share a number.

.PARAMETER Issue
    GitHub issue number this unit of work closes. The slug + branch are derived from
    the issue title via `gh`.

.PARAMETER Repo
    Which repo to branch from. Default: ImperionCRM. One of the four repos.

.PARAMETER Type
    Conventional-commit type for the branch prefix (feat|fix|docs|chore|refactor|test).
    Default: feat.

.PARAMETER Base
    Base ref to branch from. Default: main.

.EXAMPLE
    .\scripts\new-session.ps1 -Session 3 -Issue 512
    # -> C:\Development\GitHub\wt\s03-issue-512  (port 3003, branch feat/issue-512-<slug>)

.EXAMPLE
    .\scripts\new-session.ps1 -Session 4 -Issue 488 -Type feat -Repo ImperionCRM
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory)][ValidateRange(1, 99)][int]$Session,
    [Parameter(Mandatory)][int]$Issue,
    [ValidateSet('ImperionCRM', 'ImperionCRM_Backend', 'ImperionCRM_Pipeline', 'ImperionCRM_LocalPipelineEnrichment')]
    [string]$Repo = 'ImperionCRM',
    [ValidateSet('feat', 'fix', 'docs', 'chore', 'refactor', 'test')]
    [string]$Type = 'feat',
    [string]$Base = 'main'
)

$ErrorActionPreference = 'Stop'

$Root    = 'C:\Development\GitHub'
$RepoDir = Join-Path $Root $Repo
if (-not (Test-Path (Join-Path $RepoDir '.git'))) {
    throw "Repo clone not found at $RepoDir"
}

$NN      = '{0:D2}' -f $Session
$Port    = 3000 + $Session
$WtPath  = Join-Path $Root "wt\s$NN-issue-$Issue"

if (Test-Path $WtPath) {
    throw "Worktree path already exists: $WtPath  (pick a different -Session, or remove it: git -C `"$RepoDir`" worktree remove `"$WtPath`")"
}

# Derive a slug from the issue title (fall back to a generic slug if gh is unavailable).
$Slug = "issue-$Issue"
try {
    $title = & gh issue view $Issue --repo "markdconnelly/$Repo" --json title -q .title 2>$null
    if ($title) {
        $s = ($title.ToLower() -replace '[^a-z0-9]+', '-').Trim('-')
        if ($s) { $Slug = ($s -split '-' | Select-Object -First 5) -join '-' }
    }
} catch { Write-Warning "Could not read issue title via gh; using generic slug." }

$Branch = "$Type/issue-$Issue-$Slug"

Write-Host "Creating worktree" -ForegroundColor Cyan
Write-Host "  repo   : $Repo"
Write-Host "  branch : $Branch  (off $Base)"
Write-Host "  path   : $WtPath"
Write-Host "  port   : $Port"

# Fetch so we branch off the freshest base, then add the worktree.
& git -C $RepoDir fetch origin $Base --quiet
& git -C $RepoDir worktree add $WtPath -b $Branch "origin/$Base"

# Assign the session's dev/preview port in the worktree's own launch.json,
# and keep it out of the index (per-session, not committed).
$claudeDir = Join-Path $WtPath '.claude'
New-Item -ItemType Directory -Force -Path $claudeDir | Out-Null
$launch = [ordered]@{
    version        = '0.0.1'
    configurations = @(
        [ordered]@{
            name             = "s$NN"
            runtimeExecutable = 'npm'
            runtimeArgs      = @('run', 'dev', '--', '-p', "$Port")
            port             = $Port
        }
    )
}
$launch | ConvertTo-Json -Depth 5 | Set-Content -Path (Join-Path $claudeDir 'launch.json') -Encoding utf8
$exclude = Join-Path $WtPath '.git\info\exclude'
if (Test-Path $exclude) { Add-Content -Path $exclude -Value '.claude/launch.json' }

Write-Host ""
Write-Host "Ready." -ForegroundColor Green
Write-Host "  cd `"$WtPath`"   # launch the session here"
Write-Host "  dev/preview port: $Port"
Write-Host "  when the PR merges:  git -C `"$RepoDir`" worktree remove `"$WtPath`""
