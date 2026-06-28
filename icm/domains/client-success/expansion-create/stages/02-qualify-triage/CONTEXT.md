# Stage 02 — qualify-triage

**Job:** qualify the candidate against the rubric — declining a non-interest upsell — and
triage a real expansion for assignment.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Candidate | `candidate.md` (stage 01 output) | full | the detected expansion + grounding signal |
| Account / contact | silver `account` / `contact` · `okf:account` `okf:contact` | the resolved records | confirm the subject + ownership for routing |
| Opportunities | silver `opportunity` · `okf:opportunity` | open expansions for this account | idempotency — is this already tracked? |
| Engagement / need | silver `interaction` · `okf:interaction` | the need/intent context | does the spend serve the client's interest? |
| Expansion rubric | `./skills/expansion-rubric.md` | the bar + triage/routing | the qualification + triage rules |

## Process

1. `[sonnet]` Apply the `expansion-rubric` bar: grounded signal, **client interest**,
   resolvable subject, not already tracked. **Decide whose interest the spend serves** —
   a **non-interest upsell** (revenue-only, not in the client's interest) is **flagged and
   declined** here, surfaced with the reason; it never advances to a write (celeste.md
   guardrail 4). Show the decision logic: signals weighed (labeled signal vs inference) and
   the nearest rejected reading.
2. `[script]` Idempotency check: look up an existing open expansion `opportunity` for this
   `account_id`/`contact_id`. Found → mark as UPDATE, not create (at most one per candidate).
3. `[sonnet]` For a qualifying expansion, **triage**: urgency (signal recency / EOL clock /
   renewal proximity), size-if-grounded (never invent a figure), and the **assignment read**
   (account owner / sales seat, else the default sales queue) per the rubric's routing.
4. `[script]` Emit a verdict: `expansion` | `non-interest-upsell` | `not-qualified`, with
   the triage + assignment read attached to `expansion`.

## Outputs

`qualification.md` — verdict (`expansion` / `non-interest-upsell` / `not-qualified`), the
decision logic (signal vs inference), the create-or-update flag, and — for `expansion` — the
triage (urgency, size-if-known) + the assignment read. Any verdict other than `expansion`
ends the run with the reason (no opportunity created — a non-interest upsell is an explicit,
recorded decline).

## Audit

- [ ] Exactly one verdict (`expansion` / `non-interest-upsell` / `not-qualified`) present
- [ ] Client-interest test applied — a non-interest upsell is flagged + declined, never advanced
- [ ] Decision logic cites rubric signals and labels signal vs inference (not a bare verdict)
- [ ] For `expansion`: create-or-update flag set + triage + assignment read present
