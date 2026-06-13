# Shared runtime skills — the orchestration layer's library

Skills here are loadable by ANY workflow stage and by the orchestrator/
sub-agents on ad-hoc turns (CONVENTIONS.md "Two skill tiers"). Workflow-local
knowledge stays in that workspace's `skills/`; the moment a second workflow
needs it, promote it here and leave a pointer.

Format: one `<slug>.md` per skill, opening with a one-line **Use when:**
description (the orchestrator selects on it), then the content. Same rules as
everywhere in `icm/`: cite ADRs, no secrets, no client PII, issue → micro-PR.

Empty at adoption (2026-06-12) by design — the first promotions will likely be
`voice-and-tone` and consent/escalation rules once a second workflow lands.
