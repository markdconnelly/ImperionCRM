# Stage 01 — scope-framework

**Job:** pin the named compliance framework and resolve its in-scope control
objectives, owning account(s), and posture scope into a bounded readiness scope.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Readiness request | the triggering event (framework + scope ids) | the named framework + scope | the subject |
| Framework objectives | knowledge search (SOC 2 / HIPAA / CMMC) over gold | the named framework | the control universe in scope |
| Account in scope | silver `account` · `okf:account` | the customer(s) under audit | scope + ownership |
| Posture coverage | silver `posture_snapshot` · `okf:posture_snapshot` | in-scope posture | what posture exists to evidence against |

## Process

1. `[script]` Resolve the request to a single named framework (SOC 2 / HIPAA /
   CMMC) and the owning `account`(s). No framework or no account resolvable →
   audit fail.
2. `[sonnet]` Enumerate the in-scope control objectives for the named framework via
   `knowledge.search`; cite each control id from the framework source.
3. `[script]` Bind the posture scope: the `posture_snapshot` coverage available for
   the owning account(s) that the controls will be evidenced against.

## Outputs

`scope.md` — the named framework, the cited list of in-scope control objectives, the
owning `account` id(s), and the bound posture scope. Feeds stage-02 evidence
assembly.

## Audit

- [ ] Exactly one named framework (SOC 2 / HIPAA / CMMC) is pinned
- [ ] Every in-scope control objective carries a cited framework control id
- [ ] The scope resolves to at least one account + posture coverage
- [ ] No client PII or secret material in the record (audit-by-reference)
