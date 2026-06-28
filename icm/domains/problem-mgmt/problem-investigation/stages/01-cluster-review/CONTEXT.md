# Stage 01 — cluster-review

**Job:** confirm the incidents are one cluster and assemble the evidence base.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Cluster/escalation event | the triggering row (recurring-ticket cluster or Felix escalation) | full payload | the subject |
| Incident history | silver `ticket` · `okf:ticket` | the candidate cluster's tickets + their history | the recurrence evidence |
| Implicated device | silver `device` · `okf:device` | device(s) named across the cluster | CI state + signal history |
| Implicated cloud asset | silver `cloud_asset` · `okf:cloud_asset` | cloud resource(s) across the cluster | CMDB CI state |
| Affected account | silver `account` · `okf:account` | the account(s) the cluster spans | client/blast-radius context |

## Process

1. `[script]` Pull the candidate tickets and their common keys (CI, account,
   symptom, error signature). Fewer than two genuine recurrences → not a problem;
   end the run with a note.
2. `[script]` Resolve the implicated `device`/`cloud_asset` and the affected
   `account` for the cluster. Never write here.
3. `[sonnet]` Confirm the cluster: do these incidents share one underlying
   symptom, or are they coincidental? One sentence stating the common thread.

## Outputs

`cluster.md` — confirmed cluster membership, the shared symptom/signature, the
implicated CIs + account, and the assembled evidence links. A non-cluster ends the
run.

## Audit

- [ ] At least two genuine recurrences confirmed (else run ended as non-cluster)
- [ ] Shared symptom/signature stated
- [ ] Implicated CIs and affected account resolved (or stated unresolved)
