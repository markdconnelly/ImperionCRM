# Stage 03 — submit-gate

**Job:** the SUBMIT GATE (Stream 02-C5). A human authorizes the bid submission — a binding
client-facing commitment, **always-gated, dial-proof**, never auto at any rung. On
authorization, the submit + log continues in stage 04.

## Inputs

| Source | Location | Scope | Why |
|---|---|---|---|
| Response draft | `response-draft.md` (stage 02 output) | full | what may be submitted |
| Opportunity | the tied `opportunity` · `okf:opportunity` | this deal | the commitment scope + $ value for the preview |

## Process

1. `[script]` Confirm submit preconditions: every claim is sourced (no fabricated /
   unparked gap), the security section is Grace-supplied (not self-authored), and pricing is
   within the 02-C1 floor (a 02-C2 breach **without** a recorded exception cannot reach a
   human as "ready"). Any failure parks — never best-efforts to the gate.
2. `[script]` Present the **4-part easy-button** (A4): the **complete response** · the
   **grounded why** (each claim cited + as-of) · **one-click Submit + one-click
   Cancel-before-submit** (the reversible inverse) · the **consequence preview** (the
   commitment scope + the $ value + a binding-bid irreversibility flag).
3. **Checkpoint** — a human submits, edits, or cancels. This is a binding client-facing
   commitment; it parks every time, at every rung. On authorization ONLY, the bid exits
   through the ADR-0058 send path (continued in stage 04).

## Outputs

`submit-decision.md` — the final response, the approver, and the decision (`submitted` /
`cancelled` / `parked` with reason). On a `submitted` result, **stage 04 (log)** continues
the motion; a `cancelled` / `parked` result is terminal here.

## Audit

- [ ] A human authorized this exact response (no auto-submit, ever)
- [ ] Every claim was sourced and the security section Grace-supplied before the gate
- [ ] Pricing within 02-C1, OR a recorded 02-C2 exception — no unapproved-breach submission
- [ ] Decision recorded (submitted / cancelled / parked + reason)

## Checkpoint

A human approves the bid before it is submitted. **`auto` may self-approve NOTHING here** —
a bid is a binding client-facing commitment (pricing/term), the dial-proof hard ceiling (A2
class-2/6, ADR-0128 D2); it parks at every rung. The submission exits only through ADR-0058.
