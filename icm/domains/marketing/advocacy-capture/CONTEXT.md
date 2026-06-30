# Workflow: advocacy-capture (marketing v1)

**Job:** capture a CONSENTED customer **reference** (testimonial / review /
reference_case) as internal proof, and optionally spawn a case-study
`content_asset` backed by it. Belle formats and records the proof; she never
solicits it and never contacts the client. This is the internal, consent-gated
half of advocacy — the solicitation belongs to Celeste. (Stream 01-O; epic
#1696 D4; #1702.)

**Trigger:** Celeste hands over a **consented candidate** — an existing customer
who has already agreed to be referenced, with a recorded `consent_event` and a
scope of use. There is no other entry point: **Belle does not start advocacy by
reaching out** (BO-04 refusal floor). One run per reference.

**Hard precondition (D4):** a `reference` cannot reach `captured` (or any
published state) without a recorded `consent_event` on file. No recorded consent
→ the run **parks** at stage 01; it is never best-efforted forward.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | intake-consent | Ingest the consented candidate + verify the recorded consent_event + scope | — |
| 02 | capture | Format the reference, consent-clean (approved attribution, in-scope verbatim) | — |
| 03 | rights-gate | Gate any name/logo use as a rights commitment | **Yes** |
| 04 | spawn-asset | OPTIONAL: spawn a case-study content_asset backed by this reference | — |
| 05 | reconcile | Link the reference to its account/opportunity; record provenance | — |

## Autonomy

Starts `draft` (ADR-0061). When an admin flips it to `auto`, ONLY the **internal,
reversible** capture/format of an already-consented reference (`reference.write`,
stage 02) self-executes at L2 (ADR-0128 A10 row 1) — and only after stage 01 has
verified a recorded `consent_event`. The **rights-gate** (stage 03, name/logo use)
is `always_gate`, human, **marketing-owned** (not Legal in v1) and **never**
self-approves at any rung — it is a rights commitment, not a routine act. **No
recorded consent → park.** A **use beyond the consented scope → park.**

**Refusal floor (BO-04, stronger than any gate):** Belle **never** 1:1-contacts an
existing customer. This workspace has **no client-contact / send tool** — the
consented solicitation is Celeste's; advocacy-capture only ever begins *after* she
hands over a consented candidate.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing word sounds
the same). Workflow-local (Tier 3, `./skills/`): `consent-and-rights.md` (the
consent precondition + the name/logo-use rights rules). Mark-editable business
content; stages cite, never restate. Rules of the format: `../../../CONVENTIONS.md`.
The structured manifest is `agent.yaml`; the composed workflow prose is `prose.md`.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object + the
end-to-end runnable steps, the rights-gate, the learning on-ramp, and the dormancy
posture — is [`sop.md`](sop.md) (ADR-0136 A8; shape borrowed from the 01-D exemplar,
#1759). This `CONTEXT.md` stays the thin routing surface; `sop.md` is the canonical
prose. The control layer (§A invariants, the B1 archetype rule) is cited there from
ADR-0136, never redefined.
