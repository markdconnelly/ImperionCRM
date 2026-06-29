# Stage 03 — propose-report

**Job:** write the SLA-compliance summary, separate systemic SLA misses from
one-offs, and attach coaching / process recommendations routed to Dexter /
Jessica. **This stage parks.**

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Assessment | stage 02 `assessment.md` | all assessed tickets + the per-account roll-up | the evidence to summarize |
| Account roll-up | silver `account` · `okf:account` | the accounts the assessed tickets belong to | frame the compliance picture by client |

## Process

1. `[script]` Build the compliance summary from the stage-02 roll-up: breach /
   at-risk / met counts by account, and the overall SLA-adherence rate for the
   window. If the window was empty, the summary states "no tickets in review
   window — no SLA finding" and the run parks; do not fabricate a breach.
2. `[sonnet]` Separate **one-off** SLA misses (a single breach) from **systemic**
   misses (a recurring breach/at-risk pattern across tickets or accounts). State
   the threshold you applied.
3. `[sonnet]` For each systemic miss, write a recommendation: what the SLA pattern
   is (by reference), who owns the fix — **Dexter** (delivery practice) for a
   recurring process miss, **Jessica** (assurance) for the compliance picture — and
   the suggested coaching / process fix. Tess recommends; she does not actuate.
4. `[script]` Mark the run **parked**: the report + recommendation awaits a human.
   No ticket is reopened or re-resolved, no client is notified.

## Outputs

`report.md` — the SLA-compliance summary (counts by account/verdict, the overall
adherence rate), the one-off-vs-systemic split with its threshold, and one routed
coaching / process recommendation per systemic miss (owner = Dexter / Jessica,
suggested fix). On an empty window, an explicit "no finding" summary. All findings
**by reference**. The run ends parked — this is Tess's last act.

## Audit

- [ ] The compliance summary is present (per-account counts + overall adherence
      rate), or an explicit empty-window "no finding"
- [ ] Every systemic flag cites the underlying tickets (by id) that establish the pattern
- [ ] Each recommendation names an owner (Dexter or Jessica) and a suggested fix
- [ ] No breach is asserted on an empty/ungrounded window
- [ ] No verbatim PII / client identifier (audit-by-reference)
- [ ] Run is marked parked — no ticket reopened/re-resolved, no client notified, no send

## Checkpoint

A human (Dexter / Jessica) reviews the compliance report + recommendations. `auto`
may self-approve ONLY the internal compliance summary (the read + assessment sweep
surfaced to the assurance dashboard); it may **never** self-approve a coaching /
process recommendation or any corrective action — every recommendation, reopen,
re-resolve, or client-facing act parks in every mode (Tess is a watcher with no
actuation, ADR-0128 hard ceiling). There is no send path; the fix is the owner's
act, not Tess's.
