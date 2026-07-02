# Posture scoring method (Mark-editable — criteria → checks → score, the bands, drift vs noise, newly-non-compliant)

> DEFAULTS authored by the agent 2026-07-01. Tier 2 — the ONE scoring method shared by the
> Bucket-B security-standard workflows: `posture-evaluation` (B2, #1469),
> `security-drift-detection` (B3, #1470), and `standard-reevaluation` (B5, #1472). How a
> ratified standard version's criteria become per-client verdicts, what the
> conforming/drifting/critical bands mean, what counts as drift vs noise, and what
> "newly-non-compliant" means after a re-ratification. The signal-vs-inference +
> audit-by-reference discipline is the shared `conformance-engine` rubric, cited not
> restated. Mark: edit freely; stages cite this, nothing restates it.

## Criteria → checks → verdict

A ratified `security_standard_version` carries a **declarative `criteria` jsonb** document
(the 0256 StandardCriteria shape, BE ADR-0105 there: `minCompositeScore` /
`requiredPillars` / `criticalCompositeFloor`, …). Each criterion is a declarative check
over `posture_snapshot` fields — nothing is scored that the snapshot cannot show.

Per criterion, exactly one verdict:

| Verdict | When |
|---|---|
| **pass** | the snapshot shows the criterion is met (measured evidence present). |
| **fail** | the snapshot shows the criterion is NOT met (measured counter-evidence present). |
| **not-assessable** | the snapshot lacks the field/evidence to decide. **Never a silent pass** — recorded as such and surfaced as a data gap; never estimated into a verdict. |

Unknown criteria fields are **not enforced** (0256: forward-compatible, never a false
critical) — an unrecognized criterion is noted, not failed.

## overall_score + the three bands

The composite `overall_score` aggregates the assessed criteria (not-assessable criteria are
excluded from the composite and listed as gaps). `conformance_status` (the 0256 enum):

| Band | When |
|---|---|
| **conforming** | composite ≥ `minCompositeScore` AND every `requiredPillars` entry passes. |
| **drifting** | composite < `minCompositeScore` OR a required pillar fails — but composite > `criticalCompositeFloor`. |
| **critical** | composite ≤ `criticalCompositeFloor`, or a criterion the standard designates critical fails. |

One verdict per **(account, standard version, posture snapshot)** — the 0256 UNIQUE is the
arbiter, the ledger is append-only, and **persistence is the backend's idempotent
`INSERT … ON CONFLICT DO NOTHING`** (BE #439; LP #399 runs the same scoring on the
scheduled cycle). Vera produces the evaluation; she never writes the row, and a verdict is
always reproducible against its `standard_version_id`.

## Drift vs noise (the B3 definition)

Drift compares a client's **newest verdict against its prior verdict under the SAME
standard version**. It IS drift when:

- the status **downgraded** (conforming → drifting/critical, or drifting → critical), or
- the `overall_score` **crossed a band boundary** downward, or
- a **new criterion failure** appears that the prior verdict did not carry.

It is **noise, not drift**, when: the score moved *within* a band with no new criterion
failure; a criterion flipped to not-assessable because snapshot evidence went missing (a
**data gap**, surfaced as such); or the two verdicts were scored under **different standard
versions** — a standard change is B5's re-evaluation territory, never counted as client
drift. Label measured vs inferred throughout (`conformance-engine` rubric).

## Newly-non-compliant (the B5 definition)

After a new version is ratified, a client is **newly-non-compliant** when its latest verdict
under the **superseded** version was `conforming` AND its verdict under the **newly
ratified** version is `drifting` or `critical` — same snapshot vintage where one exists.
The cause is the standard moving, not the client slipping: it is presented as the
**ratification's impact**, never as client fault or drift.

## What this method never does

No remediation, no client contact, no DB write, no ratification. **Vera measures; Celeste
presents to the client; a human/Datto remediates** (the MSSP boundary, vera.md). Findings
cite the snapshot/verdict **by reference** — never the posture values themselves.
