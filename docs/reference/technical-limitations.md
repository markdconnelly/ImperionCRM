# Technical-limitations reference (human-in-the-loop register)

Every human-in-the-loop gate in Imperion OS has exactly one of two origins (ADR-0135 §5):

1. **Policy-backed** — the gate exists because a policy requires it. The feature's docs
   cite the policy § (the policy canon, ADR-0134, is the rule SoT; a missing rule is fixed
   by **updating the policy** — only Mark + Derek edit policy — never invented in a persona).
2. **Technical-limitation** — the gate exists because a technical constraint makes
   autonomous action unsafe or impossible *for now*. These are documented **here**, are
   typically **temporary**, and lift when the capability lands (the "deploy-dormant"
   pattern). A gate that traces to neither origin is a policy gap to fill.

This register is the home for the second kind. Each entry names the limitation, the gate it
forces, and the condition that lifts it. (This may later be structured into the database for
long-term tracking — ADR-0135 §5.)

## Register

| ID | Area | The limitation | The HITL gate it forces | Lifts when |
|---|---|---|---|---|
| TL-001 | Agent autonomy | The retrieval substrate (gold + Voyage vectors) is not fully hydrated. | All v1 agents are propose-only regardless of dial. | The substrate hydrates and eval goldens pass. |
| TL-002 | Backend sends | The approval-gated send path (ADR-0058) degrades to a logged stub when the backend is unconfigured. | Outbound sends park / log-only. | Backend send endpoint + provider credential land. |
| TL-003 | Org chart (public) | The public promo-chart renderer is not built (#1539 is the internal /org view). | The public chart is not yet served. | The promo renderer ships from `org.yaml`. |
| TL-004 | Effectiveness metrics | The effectiveness-metric catalog + BI aggregation layer are not built. | Persona §10 metric bindings are declared but not yet computed/rolled-up. | The metric catalog + BI layer land. |

> Add a row when a feature ships a HITL step that is NOT policy-driven. Policy-driven gates
> belong in their policy (ADR-0134), not here.
