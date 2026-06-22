# Troubleshooting paths (Mark-editable)

> DEFAULTS authored by the agent 2026-06-21 — Mark: replace with your real runbooks.
> Canonical path catalogue: each path's **entry signals** (stage 03 routing) and its
> basic, **READ-ONLY** diagnostic **step-set** (stage 04). v1 is diagnose-only —
> remediation is a parked proposal, never run here. Identity / backups /
> domain-controllers are **escalate-only**.

## endpoint — a single device / a user's machine

**Entry signals:** symptom tied to one device; that device offline/unhealthy in RMM;
"my computer", an app crash on one machine, a local printer.
**Basic checks (read-only):**
1. Device online + last-seen in `device`.
2. Patch level vs the fleet; any pending reboot.
3. Disk / health flags.
4. Backup posture if there is data-loss risk.
5. Any recent change recorded on that device.

## cloud — a cloud resource / an M365 service / SaaS

**Entry signals:** symptom spans users; a `cloud_asset` stopped/erroring; "the
website/app is down"; a VM or app service.
**Basic checks (read-only):**
1. `cloud_asset` state / region / provider.
2. Recent state change.
3. Scope: one resource vs the whole tenant.
4. *(Follow-up wiring: M365 service-health context for email/Teams — not a v1 read;
   note it as a recommended next step.)*

## network — connectivity / LAN / WAN / firewall

**Entry signals:** multiple users at one site; intermittent drops; "internet is
down"; VPN, Wi-Fi, or a network device unhealthy.
**Basic checks (read-only):**
1. Affected network device status in `device`.
2. Scope: one site vs many.
3. Wired vs wireless vs WAN.
4. Any recent firmware/config change on the device.

## identity — accounts / auth / MFA / domain controllers — ESCALATE-ONLY

**Entry signals:** lockouts, MFA, password resets, conditional access, DC health,
AD/Entra sync.
**Do not troubleshoot blind.** Escalate with the dossier; identity and domain
controllers are too blast-radius-heavy for unattended steps (Felix's guardrail).
Stage 04 runs no steps for this path.

## other — doesn't fit, or needs human scoping

**Entry signals:** ambiguous, spans many domains, or is a request rather than a
fault.
**Basic checks:** none — summarize what's known and propose that a human pick a
path.
