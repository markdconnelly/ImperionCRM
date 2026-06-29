# Workflow: rfp-response (sales v1)

**Job:** for an inbound RFP/RFQ/bid invitation tied to an `opportunity`, Chase grounds
and assembles a complete, sourced bid response — capability/approach + pricing (within the
02-C1 envelope) — and parks it at the **SUBMIT GATE**. The **security/compliance section is
not Chase's to author**: **Grace (#1557)** supplies the control/attestation content (A11
seam). **L1 propose-only**: assembly is auto/reversible; *submitting* a bid is a binding
client-facing commitment, dial-proof always-gated, and never auto-executes.

**Trigger:** an inbound RFP/RFQ/bid invitation tied to an open or net-new `opportunity`.
One run per bid.

**What this is NOT:** Chase never authors security or compliance claims. Capability,
certification, and control attestations on the security/compliance section are **Grace's
to source** (Stream 07) and arrive here as a handoff input — Chase assembles them, never
writes them. A security section with no Grace-supplied evidence is **refused, not
fabricated** (a refusal-class precondition, not a best-effort).

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | ground | Parse RFP requirements; recall prior wins + capability evidence; cite + as-of, empty→park | — |
| 02 | assemble | Assemble capability/approach + pricing (within 02-C1; breach→02-C2) + Grace's security SEAM | — |
| 03 | submit-gate | The SUBMIT GATE — human authorizes the binding bid submission (always-gated) | **Yes** |
| 04 | log | On submit → log + attach to the `opportunity` (idempotency-keyed); win→02-A6, loss→02-C7 | — |

## Autonomy

Starts `draft` (ADR-0061). **L1 propose-only through the gate.** Grounding and assembly
(stages 01-02) are internal and reversible (L1/L2, A10 row 1) and proceed. The **bid
submission** (stage 03) is a binding client-facing commitment — a bid and its
pricing/terms bind the company and a submitted bid has no clean undo (A2 class-2/6,
ADR-0128 D2, A10 row 4) — so it is **always-gated, dial-proof** and **never auto-executes
at any rung**. Two refusal-class floors hold in every mode: a capability/certification
claim with no grounding is **refused, never fabricated** (A5b / CS-07 §5); a pricing
breach of the 02-C1 floor **routes to 02-C2 deal desk before submit**, never freelanced.
The security/compliance section is **Grace's content** — absent her evidence, that section
parks (refuse-precondition, A11). **Substrate (dormant, A5c):** worker-recall (#389) and
the Grace handoff seam (#991) are deploy-dormant — this workflow ships propose-only until
they land.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `voice-and-tone.md` (every sales draft sounds the
same). Workflow-local (Tier 3, `./skills/`): `rfp-rules.md` (the no-fabrication
cite-or-refuse rule, the 02-C1 pricing-envelope check, and the Grace security-content
seam). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
