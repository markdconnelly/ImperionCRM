# Severity & category rubric (Mark-editable)

> DEFAULTS authored by the agent 2026-06-21 — Mark: edit freely; this is the
> canonical severity/category rubric for service triage. Stages cite it; nothing
> restates it.

## Severity (1–4)

| Sev | Meaning | Signals |
|---|---|---|
| **1 — Critical** | Business-down · many users · security event | site/server/DC down, ransomware or active exposure, org-wide email outage, failed backup on a critical system |
| **2 — High** | One user fully blocked · degraded shared service | can't work at all, a team's shared app/printer down, a single server degraded |
| **3 — Normal** | Single-user issue with a workaround | one app misbehaving, slow, intermittent |
| **4 — Low** | Request · cosmetic · scheduled | how-to, non-urgent new-hire setup, minor annoyance |

## Category (pick one)

`hardware` · `software/application` · `connectivity/network` · `email/M365` ·
`identity/access` · `cloud/infrastructure` · `security` · `request/how-to` ·
`other`.

Severity drives **urgency**; category is a coarse bucket. The actionable routing is
the troubleshooting **path** (see `troubleshooting-paths.md`) — category and path
usually agree, but the path is what stage 04 actually runs.
