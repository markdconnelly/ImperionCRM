# CS-15 — Physical & Environmental Security

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from the
> legacy `IM018` during the CS re-sort: same controls and framework mappings, restructured to the canon
> template and extended with the agent obligation — agents have no physical actuation, so their role is
> to monitor and propose, never to act in the physical world.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-15` |
| **Title** | Physical & Environmental Security |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); operated by the Deputy CISO |
| **Governing for (agents)** | Cyrus (SOC) for access-log/camera-telemetry monitoring; otherwise advisory — no agent has physical actuation |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-02 (IAM) · CS-08 (Data Classification) · CS-16 (Retention & Disposal) · IT device management (Intune) |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-06, PR.IR-02) · SOC 2 (CC6.4, CC6.5).

---

## 1. Purpose

Protect Imperion's people, facilities, and physical information assets from unauthorized access, damage,
theft, and environmental threats. Imperion operates a hybrid model — a small office with limited
on-premises equipment and the majority of infrastructure in the cloud — so controls are scaled
accordingly. Agents have no hands in the physical world; their role under this policy is to monitor
physical-security telemetry and surface findings to humans.

## 2. Scope

**Who:** all Imperion workforce members and contractors (physical actors), and **Cyrus** for monitoring
physical-access and camera telemetry. **What:** Imperion office facilities, on-premises equipment, and
remote work locations; facility access control, equipment protection, environmental controls, media
handling, remote-work hygiene, and monitoring; and any Operating Procedure with a physical-handling step.
The policy binds humans and agents identically except where §5 narrows the agent's role (agents observe;
they do not actuate). No business units are excluded.

## 3. Definitions

- **Restricted Area** — any area housing on-premises equipment, network gear, or sensitive information.
- **On-Premises Equipment** — network devices, servers, or other infrastructure physically located in
  Imperion facilities.
- **Remote Work Location** — any non-office location from which a workforce member accesses Imperion or
  client resources.

## 4. Policy Statements

### 4.1 Facility access control
1. Physical access to the office is controlled (locks, badge or keypad entry); access is granted on
   least privilege by role.
2. Visitors are signed in, escorted in restricted areas, and not left unattended near equipment or
   sensitive information.
3. Access rights are reviewed periodically and revoked promptly on termination or role change (CS-02).

### 4.2 Protection of on-premises equipment
4. Network and infrastructure equipment is located in a secured area accessible only to authorized
   personnel.
5. Equipment is physically secured against theft; portable equipment is not left unsecured.
6. Cabling and infrastructure are protected from interference and damage where feasible.

### 4.3 Environmental controls
7. On-premises equipment has appropriate power protection (surge protection / UPS) and adequate cooling
   and ventilation proportional to the small-office footprint.
8. Reasonable protection against fire and water damage is maintained for areas housing equipment.

### 4.4 Media & asset handling
9. Physical media and documents containing sensitive information are stored securely and disposed of per
   CS-08/CS-16 (shredding for paper; NIST SP 800-88 sanitization or destruction for electronic media).
10. A clean-desk practice applies to sensitive information in shared or visitor-accessible areas.
11. Hardware assets are inventoried; disposal and reuse follow secure sanitization (CS-16).

### 4.5 Remote work locations
12. Workforce members take reasonable measures to prevent unauthorized viewing or access (screen locks,
    private workspace, securing devices).
13. Company devices used remotely remain encrypted and managed (Intune compliance) and are not shared
    with non-workforce members.
14. Sensitive information is not printed or left exposed in uncontrolled remote environments.

### 4.6 Monitoring
15. Where access-control or camera systems exist, logs and recordings are reviewed for suspicious
    activity and used to support investigations, accessible only to authorized Information Security staff.

## 5. Application to Autonomous Agents

The defining fact: **agents have no physical actuation.** Nothing in this policy gives an agent the
ability to open a door, move hardware, or sanitize media.

- **Autonomy ceiling.** For physical-security telemetry, Cyrus is **observe-and-propose** (≤ L1): it may
  correlate access-control and camera-system logs in Sentinel, flag anomalies (e.g., off-hours entry,
  badge misuse), and draft an investigation, but it cannot take a physical action.
- **`always_gate` / refusal.** There is no agent path to any physical action, so all physical controls
  are effectively human-only; an agent that is asked to "grant building access," "wipe a drive," or
  "disable a camera" treats it as a refusal and routes a request to a human. Camera/access **recordings
  contain personal data** — an agent applies CS-14 and the pool principle to any telemetry it reads and
  never exports it across a boundary.
- **Human-in-loop & easy-button (P3).** When Cyrus flags a physical anomaly it hands the human a
  one-click "open investigation / notify facilities" with the correlated evidence already assembled.
- **Evidence.** Any monitoring read and any flagged finding writes the `agent_run` tracer; no
  recording or personal identifier is copied into issues, PRs, or docs (aggregate or redact).

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO / Deputy CISO | Own facility, equipment, and environmental controls; approve access; oversee disposal. |
| Workforce + facilities (human) | Enforce access control, clean-desk, secure remote work, and media disposal. |
| Cyrus (SOC agent) | Monitor physical-security telemetry; flag anomalies; propose investigations (no physical action). |
| All agents | No physical actuation; treat physical-action requests as refusals routed to a human; protect any telemetry per CS-14. |

## 7. Enforcement & Audit

Physical controls are enforced by humans and facility systems; the absence of any agent physical-action
path is structural. Adherence is verified by periodic access reviews, the asset inventory, SOC review of
access/camera telemetry, and the conformance sweep. A violation parks any related work and escalates;
repeated or high-severity violations are handled per the umbrella enforcement model.

## 8. Related

**Procedures governed:** facility-access, asset-handling, and media-disposal procedures.
**Related policies:** [CS-02](CS-02-identity-and-access-management.md) ·
[CS-08](CS-08-data-classification-and-handling.md) · [CS-14](CS-14-privacy-and-data-protection.md) ·
[CS-16](CS-16-data-retention-and-disposal.md). **ADRs:** ADR-0128 (autonomy ladder) ·
ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) · ADR-NNNN (policy-canon architecture).
