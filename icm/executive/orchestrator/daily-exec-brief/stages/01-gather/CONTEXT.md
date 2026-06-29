# Stage 01 — gather

**Job:** pull the five latest C-suite division briefs plus the accounts/contacts
they reference, recall prior exec-brief context, and assemble one grounded gather
record — no ranking.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Division briefs | the five latest pulse/brief run outputs (Rachel `daily-brief`, Dexter `delivery-pulse`, Roman `security-posture-brief`, Sterling `financial-pulse`, Jessica `risk-assurance-sweep`) | today's cycle, one per division | the five division pictures this rolls up |
| Identity spine | silver `entity_xref` · `okf:entity_xref` | entities named in the five briefs | attribute each flag to the right subject across systems |
| Accounts | silver `account` · `okf:account` | accounts named/implied in the briefs | who the flags are about |
| Contacts | silver `contact` · `okf:contact` | people named/implied in the briefs | who the flags are about |
| Prior context | retrieval tier (`knowledge.search` / `memory.recall`) | the prior day's exec brief + related context | recall, always cited |

## Process

1. `[script]` Fetch the five latest division pulse/brief outputs for today's cycle —
   one per division. Read-only.
2. `[script]` If any of the five is missing or stale (not from today's cycle), record
   it as a gap; do not substitute or back-fill. A short division is named, never
   guessed.
3. `[script]` Resolve the accounts/contacts each brief references via `entity_xref` →
   attach `account`/`contact` id + name only. Read-only.
4. `[haiku]` Recall the prior day's exec brief and related context via the retrieval
   tier; attach each item with its source reference. A miss is recorded as "no
   recall," never filled with a guess.

## Outputs

`gather.md` — the five division briefs (or named gaps), the resolved account/contact
ids in scope, and the cited recall items (or an explicit "no recall"). No ranking.

## Audit

- [ ] All five division briefs collected, or each missing/stale one recorded as a gap (none substituted or guessed)
- [ ] Every entity reference states its id; none invented
- [ ] Every recall item carries a source reference; a miss is recorded as "no recall," not a guess
- [ ] Read-only — nothing actuated, nothing written outside the run record
- [ ] No ranking or synthesis performed at this stage — that is stage 02
