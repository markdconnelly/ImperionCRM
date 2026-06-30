# Workflow: cash-flow-forecast (finance v1)

**Job:** read the expected **cash inflow** (AR from the `invoice` mirror) and the expected
**cash outflow** (payroll / recurring from `time_record` + `expense_item`, against the
`budget` plan), and produce a **runway projection** — how cash trends forward from grounded
inputs, with material runway risk **flagged** and raised to the cockpit / Sterling. Read-only;
Audrey projects from the numbers and flags the risk, a human reads and acts.

**Trigger:** a treasury / board-reporting cycle, a period close, or an on-demand "what's our
runway?" ask. One run per as-of date.

**Output identity:** an internal, reversible `operational`-class flag / escalation raised to
the cockpit / Sterling. **There is no external send and no money action in this workflow** —
Audrey reads inflow + outflow, projects the runway, and flags the risk; a human acts.
QuickBooks Online is the system of record for money movement (ADR-0123); Audrey never posts,
alters an invoice, edits the budget, or pushes to QBO.

## The forecast doctrine (D3 — stated on this workflow)

A forecast here is a **TRANSPARENT PROJECTION** from grounded inputs, with its **method,
assumptions, and as-of date shown**, labeled **inference / scenario**, and is a **reversible
signal** — never a gap-fill. **If a forecast INPUT is missing, Audrey escalates THAT gap; she
never guesses the input.** A projection is honestly labeled forward-looking inference built on
measured inputs; it is never presented as a measured fact, and never invented to paper over a
missing input (D3, epic #1394; audrey.md "never estimate into a data gap").

> **Grounding dependency.** This workflow depends on the AR `invoice` silver mirror (#1580)
> for live inflow grounding. Until that mirror hydrates in prod, the workflow ships
> **propose-only / dormant**: it runs against whatever inflow signal exists and escalates the
> missing-mirror gap rather than guessing inflow.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | gather | Read AR inflow (`invoice`) + payroll / recurring outflow (`time_record` / `expense_item` vs `budget`), as-of dated | — |
| 02 | project-runway-and-flag | Project the runway from grounded inputs (method + assumptions shown); flag material runway risk; raise to cockpit / Sterling | **cockpit / Sterling loop** |

## Autonomy

Read-only, **tops out at L2 by structure** (audrey.md — no external-send rung, no money rung
to occupy). Starts `draft` (ADR-0061); when flipped to `auto`, stage 02 may auto-raise the
**internal** runway projection + risk flags to the cockpit / Sterling without being asked —
internal and reversible (a flag can be dismissed). It may **never** post, alter an invoice,
edit the budget, or push to QBO; there is no such action to self-approve. A missing forecast
**input** is escalated as a gap, never guessed. Figures carry their source and **as-of date**,
measured (input) vs derived (projection) labeled (audrey.md; D3).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `forecast-rubric.md` — the inflow / outflow input
sources, the runway projection method + the assumptions it must show, the material-runway-risk
threshold, the transparent-projection (D3) discipline, and the never-estimate-an-input rule.
Mark-editable; stages cite it, nothing restates it. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
