---
adr: 0142
title: "Teams human-gate rail — full round-trip via Power Automate + APIM"
status: proposed
date: 2026-07-01
repo: frontend
summary: "Give the human-in-the-loop gate a real round-trip through Microsoft Teams. Chain: a parked action (agent_pending_action) → the backend composes a fixed, schema-validated adaptive card → POST to a Power Automate HTTP-trigger webhook (URL in Key Vault via the credential registry, platform scope, e.g. conn-platform-teams-gate) → adaptive card in a dedicated Team @mentioning the responsible human(s) → verdict + responder AAD identity captured by the flow → POST to APIM → the backend verdict endpoint. Verdicts: Approve → execute through the gauntlet (gate-9 claim-before-send, ADR-0113/mig 0246, is the double-fire defense); Request changes → feedback → RedraftRunner re-synthesis (ADR-0111 seam) → a new card, cycle; Reject → close rejected + create an internal task for the responsible human + update the card thread (Autotask write-back explicitly NOT v1). The card is a fixed envelope: system-owned actions/payloads, agent-composed CONTENT only (agent-voiced body via metered Haiku with template fallback, avatar, agent + procedure name) — freeform agent-built cards are a spoofing/injection surface on the approval path. Backend owns inbound (process custody, ADR-0042); Pipeline receives data webhooks only. Responder authz = flow-provided AAD identity must be in the procedure's approver set; Flow→APIM via subscription key, APIM→backend via the existing Easy Auth caller allowlist. Ingress requires the Mark-gated APIM apply (backend infra/apim Bicep, backend ADR-0074) extended with the verdict route; outbound ships first behind a flag with buttons parked until ingress lights."
tags: [agents, governance, integrations]
---

# ADR-0142: Teams human-gate rail — full round-trip via Power Automate + APIM

> Number **0142** claimed at merge per system CLAUDE.md §10.3 / [ADR-0084](./ADR-0084-merge-time-number-assignment.md)
> (authored against a placeholder, renumbered at merge alongside its companions ADR-0141/ADR-0143).
> Docs-only ADR; claims no migration number.

| Field | Value |
|---|---|
| **Repo** | frontend (this ADR + the public avatar route the card image needs, #1838). **Runtime is backend** (composes the card, owns the verdict ingress — process custody, ADR-0042); **Power Automate + APIM** are the transport |
| **Status** | Proposed |
| **Date** | 2026-07-01 |
| **Issue** | epic #1829 (Agent GUI rework); backend halves ImperionCRM_Backend#515 (outbound) + ImperionCRM_Backend#516 (ingress) |
| **Companion** | [ADR-0141](./ADR-0141-per-procedure-autonomy-dial-only-dial.md) (the dial whose parks feed this rail), [ADR-0143](./ADR-0143-agent-profile-db-source-of-truth.md) (avatar + procedure_human_owner the card consumes) |
| **Cross-references** | [ADR-0113](./ADR-0113-verbatim-memory-tier.md) (gate-9 claim-before-send ledger, mig 0246), [ADR-0111](./ADR-0111-agent-event-substrate.md) (the RedraftRunner / re-synthesis seam), [ADR-0129](./ADR-0129-platform-scope-credentials.md) (credential-registry platform scope for the webhook URL), [ADR-0118](./ADR-0118-data-class-third-rls-axis-action-ceiling.md) (the always-gate classes that route here), backend ADR-0074 (APIM callback ingress — the front door extended here), backend ADR-0035 (Easy Auth + caller allowlist), [ADR-0042](./ADR-0042-division-of-labor-reads-direct-processes-backend.md) (process custody / repo boundary) |

## Problem

The autonomy dial (ADR-0141) parks every action above a procedure's level or behind the dial-proof hard cap. Today "parked" means a row in `agent_pending_action` and a cockpit list in the web app — a **pull** surface a human has to remember to visit. For a real human-in-the-loop workforce the gate has to be a **push** round-trip: the accountable human is **told** (where they already work — Microsoft Teams), can **decide** in place, and the verdict flows back and either **executes**, **re-drafts**, or **rejects** — with the responder's identity captured and the whole loop auditable. There is no such rail today.

## Context

- **The platform already standardises on Power Automate for triggers/approvals/notifications** (CLAUDE.md §3) and on **APIM as the front door for external callbacks** (backend ADR-0074, which already fronts the Pipeline webhooks and is the first IaC in the backend, `infra/apim` Bicep). This ADR extends that front door with one route — it does not invent new ingress.
- **Process custody is the backend's** (ADR-0042): every *process* — composing the card, receiving the verdict, executing on approval — is backend. **Pipeline receives data webhooks only**; a human *verdict* is a process signal, not ingested data, so it does **not** go through Pipeline.
- **The double-fire defense already exists.** Gate-9 **claim-before-send** (frontend ADR-0113, mig 0246 `agent_action_execution`) is the replay/idempotency ledger; the Approve path reuses it rather than inventing a new guard.
- **The re-synthesis seam already exists.** The agent-event substrate (frontend ADR-0111) defines a RedraftRunner-style re-synthesis path; Request-changes reuses that seam rather than a bespoke redraft.
- **Secrets go in the registry, platform scope.** The webhook URL is a platform-scope secret in the credential registry → Key Vault (frontend ADR-0129, the `conn-platform-*` precedent) — never hard-coded, never logged.
- **The approver set is data.** Who may approve a given procedure's gate is `procedure_human_owner` (ADR-0143), feeding both the @mention and the verdict-side authorization.

## Options considered

1. **Cockpit-only (status quo)** — a pull list in the web app (rejected as the gate). Fine as a *mirror*, but it is not a round-trip: no push, no in-place decision, no identity capture at the point of decision. Kept as a secondary view, not the rail.
2. **Freeform agent-built adaptive cards** (rejected). Letting the agent emit arbitrary card JSON is maximally flexible and a **spoofing / injection surface on the approval path** — the one path where a forged action or button must never reach a human as if it were system-sanctioned.
3. **Fixed system-owned envelope, agent-composed content only** (chosen). The card schema, its actions, and the action payloads are **system-owned and schema-validated**; the agent supplies **content only** (the voiced body, name, avatar, procedure name). The transport is Power Automate (post) + APIM (verdict return), matching the platform's settled tooling.

### Tradeoffs

The fixed envelope means the agent **cannot** add a novel button or a custom field to a card — every card action is one the system defined and can execute safely. That is the point: it bounds the approval path to a vetted set. The cost is that a genuinely new gate interaction needs a schema change (a code deploy), not an agent decision — an acceptable, deliberate friction on the security-critical surface. The **outbound-first, ingress-dormant** rollout (D6) adds a visible-but-inert phase (cards post, buttons park) so the human-facing surface can be validated before the Mark-gated APIM apply opens the return path.

## Decision

### D1 — The chain

```
agent_pending_action (parked, ADR-0141)
  → backend composes a fixed, schema-validated adaptive card (D3)
  → POST to a Power Automate HTTP-trigger webhook   [URL from KV via credential registry, platform scope]
  → adaptive card posted to a dedicated Team, @mentioning the responsible human(s)   [from procedure_human_owner]
  → human picks a verdict; the flow captures verdict + responder AAD identity
  → POST to APIM   [Flow→APIM: subscription key]
  → backend verdict endpoint   [APIM→backend: existing Easy Auth caller allowlist]
```

### D2 — The three verdicts

- **Approve** → execute the action through the **gauntlet**. The **gate-9 claim-before-send ledger** (frontend ADR-0113 / mig 0246) is the replay/double-fire defense — a re-delivered Approve is a no-op, never a second send.
- **Request changes** → open a feedback dialog; the feedback drives **RedraftRunner-style re-synthesis** (frontend ADR-0111 seam) → a **new card**, and the cycle repeats.
- **Reject** → close the pending action **`rejected`**, **create an internal task assigned to the responsible human** (`procedure_human_owner`), and **update the card thread**. **Autotask write-back is explicitly NOT in v1** (the reject task is app-native).

### D3 — The card is a fixed envelope; the agent composes CONTENT only

The adaptive card is a **system-owned, schema-validated envelope**:

- **System-owned:** the card structure, the verdict **actions** (Approve / Request changes / Reject), and every action **payload** (the pending-action id and the bound action contract). The agent cannot add, rename, or re-target an action.
- **Agent-composed CONTENT only:** the **agent-voiced body** (rendered via **metered Haiku** with a **deterministic template fallback** on failure/cost), the agent **avatar** (via the public route, #1838), the **agent name**, and the **procedure name**.

Rationale: freeform agent-built cards are a spoofing/injection surface on the approval path (Option 2); bounding the agent to content keeps the actionable surface vetted.

### D4 — Responder authorization

The **flow-provided AAD identity** of the responder **must be in the procedure's approver set** (`procedure_human_owner`, ADR-0143). A verdict from an identity outside the set is rejected by the backend. This is authorization on the *decision*, distinct from the transport auth in D5.

### D5 — Ingress security (two hops, defense in depth)

- **Flow → APIM:** APIM **subscription key**.
- **APIM → backend:** the **existing Easy Auth caller allowlist** (backend ADR-0035) — the same gate that already protects the backend.
- The verdict route is added to the backend **`infra/apim` Bicep** (backend ADR-0074). Applying it is **Mark-gated** (an APIM apply is an infra/ingress change, backend ADR-0074 / system CLAUDE.md §2).

### D6 — Outbound ships first; ingress is dormant until the APIM apply

The rail lands in two phases so the human-facing surface is validated before the return path opens:

1. **Phase 1 (outbound, behind `TEAMS_GATE`):** cards compose and post; the buttons **land in a parked state** — a click has no return path yet. Ships without the Mark-gated apply. (ImperionCRM_Backend#515.)
2. **Phase 2 (ingress):** the verdict endpoint + the APIM verdict route go live **only after the Mark-gated APIM apply**; the buttons become live. (ImperionCRM_Backend#516.)

This is the platform's standard **deploy-dormant** pattern (a built surface waiting on a gated credential/apply).

## Consequences

### Security impact

- **The approval path is bounded.** A fixed, schema-validated envelope with system-owned actions/payloads (D3) removes the freeform-card spoofing/injection surface — the agent can voice a card but never mint an action a human might approve.
- **Verdict authorization is data-driven and audited.** Only an AAD identity in the procedure's approver set can decide (D4); the responder becomes the audited actor at execute (the ADR-0113 gate-9 ledger records the claim).
- **Replay-safe by reuse.** Approve rides the existing gate-9 claim-before-send ledger — no new idempotency guard, no double-send/charge.
- **Two-hop ingress.** Subscription key + Easy Auth caller allowlist (D5); no new unauthenticated ingress. The webhook URL is a platform-scope registry secret (ADR-0129), never in code or logs.
- **Custody respected.** The backend owns the process (compose + verdict); Pipeline is untouched (verdicts are not ingested data), preserving ADR-0042.

### Cost impact

- **Metered Haiku** per card body (the cheap tier, ADR-0043), with a **template fallback** that costs nothing — the agent-voiced body degrades gracefully under cost/failure. No new embedding or premium-tier calls. Power Automate + APIM are already in the platform.

### Operational impact

- **Backend (cross-repo, ADR-0042):** the outbound composer behind `TEAMS_GATE` (ImperionCRM_Backend#515) and the verdict ingress + APIM route + reject→internal-task (ImperionCRM_Backend#516).
- **FE:** the public avatar route (#1838) is a hard dependency for the card image; the existing cockpit remains as a secondary mirror of `agent_pending_action`.
- **Mark-gated ledger (tracked on the epic #1829):** create the dedicated Teams team; author the two Power Automate flows (outbound post, inbound verdict→APIM); put the webhook URL in Key Vault via the registry (platform scope); run the APIM apply (turn-word).
- **CONTEXT.md** gains *Human Gate · Responsible Human · Verdict*.

## Future considerations

- **Autotask write-back on reject** — deferred out of v1; a later ADR can mirror the reject/task to Autotask once the write-back seam (ADR-0074 service-desk lineage) is chosen.
- **Additional channels** — the same envelope could drive an Outlook actionable message or a web push; Teams is the v1 channel.
- **SLA/timeout on a parked card** — an unactioned gate should eventually escalate up the `org.yaml` `reports_to` chain (the Notification-routing doctrine, CONTEXT.md) to Nova's gatekeeper queue; the timeout mechanism is a follow-up.
