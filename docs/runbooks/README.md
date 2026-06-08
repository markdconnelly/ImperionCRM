# 📓 Runbooks

Step-by-step procedures for specific tasks and incidents. Each runbook is a single,
copy-paste-able sequence with a clear trigger and a clear "done" check.

[← Documentation library](../README.md)

## Index

| Runbook | When to use it |
| --- | --- |
| [dev-node-blocked-by-intune-firewall](dev-node-blocked-by-intune-firewall.md) | Local `npm`/Node is blocked by Intune/Defender on a dev machine. |
| [activate-company-credential-wiring](activate-company-credential-wiring.md) | Enable backend Easy Auth + the web-app MI token so company credentials save to Key Vault and go `active` (ADR-0036). |

## What belongs here (to add as needed)

- Apply a database migration to prod (Entra token + `az postgres … -f`).
- Rotate secrets (the deferred pre-go-live pass).
- Inspect the running app via Kudu (AAD bearer token).
- Tail logs / triage a 5xx.

> A runbook differs from [operations](../operations/README.md): operations is the
> standing picture, runbooks are the exact keystrokes for one situation.
