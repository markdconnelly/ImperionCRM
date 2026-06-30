# Workflow: reference-cultivation (client-success v1)

**Job:** Celeste's **advocacy-cultivation** playbook — the **upstream half of advocacy
capture**. Detect a reference-ready account, **draft** a testimonial / reference-case /
logo-use solicitation in the relationship voice, send it **consent-gated and
human-approved** (ADR-0058), and on the client's agreement **record the consent** and
**hand a `reference` at status `consented` to Belle's `advocacy-capture` (Stream 01-O)**.
Soliciting a testimonial = contacting an existing customer, which is **Belle's refusal
floor** — so the client touch is Celeste's (she holds the relationship + the consent-gated
send path). Belle takes the consented `reference` from there and **never contacts the
client**.

**Trigger:** a reference-ready account surfaces (high health + tenure + a clean
relationship), **or** Belle's 01-E listening flags an advocacy candidate that routes here
to solicit. One run per solicitation.

**Boundary:** Celeste owns the **client touch** (detect → draft → consent-gated send →
record consent); Belle owns **advocacy capture** downstream and never contacts the client
— the Celeste→Belle handoff is a **record** (`reference` at `consented`), not a
client-contact path (celeste.md §Seams). Every send is consent-gated; the solicitation is
a non-routine, relationship-sensitive **first touch** → human-approved at every rung.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | identify-advocate | Detect a reference-ready account + choose the ask | — |
| 02 | draft-solicitation | Draft the ask in the relationship voice; assert the consent basis | — |
| 03 | review-send | The consent-gated solicitation send via ADR-0058 | **Yes** |
| 04 | record-consent-handoff | Record consent + hand a consented `reference` to Belle | — |

## Autonomy

Starts `draft` (ADR-0061); the manifest rung is **L1**. The **solicitation send (stage
03)** is a customer-relationship-sensitive, non-routine **first touch** → **human-approved
at EVERY rung, never auto**, and exits only through the ADR-0058 path. The only thing
`auto` may self-execute (at **L2**, once admin-flipped) is the **internal, reversible**
creation of the consented `reference` candidate (`reference.write`, status up to
`consented`) — **and only after** a human approved the send **and** a `consent_event` with
scope was recorded. NO-COMMITS-EVER and MSSP-advisory-only are dial-proof (celeste.md
guardrails 1–2). The Celeste→Belle handoff is a **record handoff**, never a client-contact
path for Belle. Anything unstated parks. The full L0–L5 map is Celeste's (`celeste.md`).

## Runtime skills

Workflow-local (Tier 3, `./skills/`): `advocacy-cultivation.md` (how to detect a
reference-ready account, the consent/scope-of-use ask framing, the Celeste→Belle handoff
contract). Mark-editable; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed prose is
`prose.md`.
