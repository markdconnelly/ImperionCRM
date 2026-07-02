# Workflow: standard-definition (platform v1 — Bucket B1)

**Job:** own and version the **evolving client security standard** (#1468) — the declarative
baseline every client fleet is scored against (the `security_standard_version` store, mig
0256). Vera reads the current ratified version plus the fleet's actual posture landscape,
drafts the next version (declarative criteria jsonb + rationale + an explicit diff vs
current), and **parks it for Mark's ratification** — she owns the standard's *content*; the
ratify itself is `always_gate` to Mark, executed as the backend's conditional UPDATE (BE
#439). References the Vera agent epic **#1397**. This is the **client** security standard —
distinct from the internal `docs/security/unified-security-standard.md`
(`./skills/standard-authoring.md`).

**Trigger:** a scheduled standard-review cycle, a Mark request ("tighten the standard"), or
an accumulation of posture-evaluation signals (B2/B3) suggesting the current version no
longer describes the bar. One run per draft version.

**What this is NOT:** no self-ratification — Vera **never** ratifies her own draft (she never
marks her own homework, vera.md); the draft→ratified UPDATE is Mark-gated and backend-owed
(BE #439). No silent weakening — a criterion weaker than the current version is explicitly
flagged in the diff, never slipped through. No scoring (that is B2, #1469), no client
contact, no remediation (**Vera measures; Celeste presents; a human/Datto remediates** — the
MSSP boundary). Not the internal unified-security-standard: that baseline governs Imperion's
own repos, not client fleets. Divergences found by the A1–A8 audits route through A9
(`deviation-lifecycle`, #1467) — this bucket's outputs route via **Celeste/Mark**, never the
A9 queue.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | load-standard-landscape | Load the current ratified version + the fleet posture landscape + golden baselines | — |
| 02 | draft-standard-version | Draft the next version: criteria jsonb, rationale, explicit diff vs current | — |
| 03 | park-for-ratification | Park the draft for Mark's ratify (`always_gate`; backend executes, BE #439) | **Mark ratify gate** |

## Autonomy

Default rung **L1** (draft the standard version → park for Mark); Vera **tops out at L2**
(no L3–L5 — every ratification is `always_gate`, vera.md). Even at L2, nothing changes here:
the ratification is `always_gate` to Mark at every rung, the draft INSERT/UPDATE is
backend-owed (BE #439 — note 0256 grants no draft-INSERT yet; the draft parks as an
artifact until that process lands), and Vera never scores against an unratified draft.

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `standard-authoring.md` (what a criteria document
contains, the draft→ratified→superseded versioning discipline, the Mark ratify gate, and
the explicit NOT-the-internal-standard boundary). The signal-vs-inference +
audit-by-reference discipline is the shared `conformance-engine` rubric, cited not restated.
The structured manifest is `agent.yaml`; the composed prose is `prose.md`.
