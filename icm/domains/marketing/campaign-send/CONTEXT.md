# Workflow: campaign-send (marketing v1)

**Job:** build and ground one Campaign Send, gate consent **per recipient at send
time**, then deliver it to a consented audience — drafted by Belle, approved by a
human (v1), routed through the one outbound send path. This is Belle's outbound-comms
act: it exercises L1 build → the per-recipient consent hard filter → the L3
routine-send gate → the always-gate blast escalation. (Stream 01-I; ADR-0058 send path,
ADR-0053 send mechanics.)

**Trigger:** a campaign/newsletter Campaign Send is scheduled (fixed time or relative
to an Event start), or a nurture journey (01-H) delegates a send. One run per Campaign
Send.

**Sender identity:** the send goes out from the **shared marketing mailbox** (the
brand sender identity, ADR-0058), through the backend-only send path — never an
operator's personal mailbox, never a second send route.

## Stages

| # | Stage | Job | Checkpoint |
|---|---|---|---|
| 01 | build-ground | Build the send + resolve the audience/segment; cite + as-of, no fabricated claim | — |
| 02 | consent-gate | Hard-filter the recipient list per recipient (CAN-SPAM, opt-out, frequency caps) | — |
| 03 | send-gate | Route the send as a ProposedAction → gauntlet → cockpit; new/large escalates | **Yes** |
| 04 | send-log | Idempotency-keyed fire; read back delivery; reconcile attribution → metrics | — |

## Autonomy

Starts `draft` (ADR-0061). When an admin flips it to `auto`, stage 03 may self-approve
ONLY a **routine** send: consent-clean, to a **known/established** audience within
frequency caps, with a clean audit — that send reaches **L3** (execute-then-notify,
ADR-0128). A send to a **new or materially larger** audience is a **dial-proof
`always_gate` blast** (CONSTITUTION §5.4 / ADR-0136 A2 class-2) — staged, never auto, a
human commits it. Any **unsubstantiated** claim, an **opt-out/consent violation**, or
**any audit failure** parks for a human in every mode. **Money never enters this
workflow** — a paid boost/ad is a separate procedure (01-B/01-C), `always_gate`.

## Runtime skills

Domain-shared (Tier 2, `../skills/`): `brand-voice.md` (every marketing draft sounds the
same). Mark-editable business content; stages cite, never restate. Rules of the format:
`../../../CONVENTIONS.md`. The structured manifest is `agent.yaml`; the composed
workflow prose is `prose.md`.

## SOP (the dual-audience document)

The full human+machine SOP for this procedure — frontmatter procedure-object + the
end-to-end runnable steps, the stage-03 routine-vs-blast send-gate contract, the learning
on-ramp, and the dormancy posture — is [`sop.md`](sop.md) (ADR-0136 A8; mirrors the
template-defining exemplar `social-inbox/sop.md`, #1759). This `CONTEXT.md` stays the thin
routing surface; `sop.md` is the canonical prose. The control layer (§A invariants, the B7
archetype rule) is cited there from ADR-0136, never redefined.
