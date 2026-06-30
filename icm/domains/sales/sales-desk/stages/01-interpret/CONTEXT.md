# Stage 01 — interpret

**Job:** parse the sales question Nova delegated, determine which sales rooms and facts it
needs to be answered with judgment, and scope it to the asking user's read permission — never
wider than the caller could see.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| The delegated question | trigger payload | the question + the asking user's identity/permission | what Chase is being consulted on, and on whose behalf |
| Opportunities | `` `okf:opportunity` `` | the deal(s) the question touches | the sales object whose judgment is being asked about |
| Owning accounts | `` `okf:account` `` | accounts on the in-scope deals | the segment/relationship frame for the judgment |
| Contacts | `` `okf:contact` `` | contacts on the in-scope deals | who the deal is with, for the qualification read |

## Process

1. `[sonnet]` Parse the delegated question: what judgment is actually being asked for
   (qualification call, deal-risk read, next-best-touch) versus a plain fact Nova would
   answer herself — if it is a plain fact or a cross-domain question, note it routes back to
   Nova, not here.
2. `[script]` Resolve the asking user's read permission from the trigger payload; bound the
   grounding plan to deals/accounts/contacts that user could see — **never-exceed-caller**
   (§5.2). A deal outside the caller's read is out of scope, not redacted-in.
3. `[sonnet]` Build the grounding plan: which OKF rooms (from the declared seven) the answer
   needs and what semantic recall to attempt. It is fine to range across several rooms — a
   consult is broad — but only the rooms the question genuinely needs.

## Outputs

`interpretation.md` — the question restated (what judgment is being asked, on whose behalf),
the caller-permission scope it is bounded to, and the grounding plan: the OKF rooms to read +
the recall to attempt.

## Audit

- [ ] Question restated as a judgment ask (or flagged as a plain-fact/cross-domain question that returns to Nova)
- [ ] Scoped to the asking user's read permission — never-exceed-caller (§5.2); no out-of-scope deal pulled in
- [ ] Grounding plan names only OKF rooms from the declared seven (least privilege)
- [ ] No fact asserted yet, no side effect — this stage only interprets and plans
