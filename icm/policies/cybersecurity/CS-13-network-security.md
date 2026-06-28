# CS-13 — Network Security

> Distinct Cybersecurity policy. Inherits the
> [Imperion Operating Policy & Code of Conduct](../00-imperion-operating-policy-and-code-of-conduct.md)
> and the [Information Security Program](CS-00-information-security-program.md). Rewritten from the
> legacy `IM023` during the CS re-sort: same controls and framework mappings, restructured to the canon
> template and extended with explicit agent obligations for network-config and remediation actions.

| Field | Value |
| --- | --- |
| **Policy ID** | `CS-13` |
| **Title** | Network Security |
| **Category** | Cybersecurity |
| **Tier** | distinct |
| **Human owner** | Chief Information Security Officer (Mark Connelly); operated by the Deputy CISO |
| **Governing for (agents)** | Cyrus (SOC) for detection/reversible containment; NOC/network agents for monitoring; all firewall/segmentation changes are gated |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Review Cadence** | Annual |
| **Inherits** | [top umbrella](../00-imperion-operating-policy-and-code-of-conduct.md) + [CS-00](CS-00-information-security-program.md) + CS-02 (IAM) · CS-03 (Remote Access & MFA) · CS-10 (Logging & SIEM) · IT change management |

**Framework Alignment:** NIST CSF 2.0 (PR.IR, PR.AA, DE.CM) · SOC 2 (CC6.6, CC6.7, CC7.1).

---

## 1. Purpose

Define the controls protecting Imperion and managed-client networks — perimeter defense, segmentation,
wireless security, and network monitoring — consistent with a Zero Trust model in which network
location never implies trust. This applies to actions taken by humans and by agents that monitor or
propose changes to network configuration.

## 2. Scope

**Who:** all Imperion workforce members and contractors, and agents that monitor or propose network
actions — **Cyrus** (SOC detection and reversible containment) and the NOC/network monitoring agents.
**What:** all Imperion and Imperion-managed networks, perimeter devices, and wireless infrastructure;
the firewall, segmentation, wireless, DNS/egress, and monitoring controls; and every Operating
Procedure with a network-change or network-triage step. The policy binds humans and agents identically
except where §5 narrows or gates an agent's authority. No business units are excluded.

## 3. Definitions

- **Perimeter** — the boundary between trusted internal networks and untrusted external networks.
- **Segmentation** — dividing networks into zones to limit lateral movement.
- **Default-DENY** — a firewall posture that blocks all traffic except that explicitly permitted.

Governance terms defer to the top umbrella.

## 4. Policy Statements

### 4.1 Perimeter defense
1. Perimeter firewalls are configured **default-DENY**; only explicitly justified traffic is permitted.
2. All firewall rules are documented with a valid business justification.
3. Firewall rules are reviewed at least annually for validity and excessive allowances (e.g.,
   "allow all"), with results reported to the CISO.
4. Intrusion prevention/detection is deployed at the perimeter where applicable.

### 4.2 Segmentation
5. Networks are segmented by trust level (guest, corporate, management, on-premises equipment).
6. Guest networks are isolated from corporate resources.
7. In managed-client environments, segmentation is applied per design and contract to limit blast
   radius.

### 4.3 Wireless security
8. Wireless networks use strong, current encryption and authentication (WPA2-Enterprise or WPA3 where
   supported); legacy/weak protocols are prohibited.
9. Guest wireless is segregated from corporate and management networks.
10. Wireless encryption and authentication strength is tested at least annually, with results reported
    to the CISO.

### 4.4 Zero Trust & secure access
11. Network access does not imply trust; access to resources is independently authenticated and
    authorized (CS-02, CS-03).
12. Remote and site-to-site connectivity follows CS-03.

### 4.5 DNS & egress protection
13. DNS filtering / protective DNS is applied; DNS logs are forwarded to **Microsoft Sentinel** (CS-10).
14. Egress is controlled to limit unauthorized outbound connections and data exfiltration.

### 4.6 Monitoring
15. Perimeter, firewall, IDS/IPS, and network telemetry are continuously monitored and correlated in
    Sentinel; anomalies are investigated and escalated to incident response as warranted (CS-10, CS-IR).

### 4.7 Network changes
16. Changes to network configuration, firewall rules, and segmentation follow change management.

## 5. Application to Autonomous Agents

Network agents **measure and propose**; they do not silently re-shape a network.

- **Autonomy ceiling.** Cyrus may auto-execute **reversible** containment under a runbook with an undo
  window (e.g., isolate a host, apply a temporary block) up to its L4 ceiling. NOC/network monitoring
  agents are **observe-and-propose** (≤ L1) for configuration: they detect drift and excessive rules
  and draft the corrective change.
- **`always_gate` actions (dial-proof floor).** Independent of dial level:
  - **Firewall-rule, segmentation, and routing changes** — anything that alters the network's
    enforced boundary is gated (these are config-control changes touching production).
  - **Wireless/authentication policy changes and DNS/egress policy changes** — gated.
  - **Persistent (non-undo-window) containment** that would cut production access — gated; only the
    reversible, time-boxed action auto-fires.
- **Human-in-loop & easy-button (P3).** As Cyrus's dial climbs, routine reversible containment recedes
  to background, but boundary changes stay gated. At each gate the agent hands the human a **one-click**
  apply-this-rule-change with the diff, the justification, and the blast-radius assessment already
  assembled.
- **Escalation & refusal.** An agent refuses to add an "allow all" or otherwise unjustified rule, or to
  weaken encryption/authentication below the standard. Confirmed intrusion or exfiltration escalates to
  CS-IR.
- **Evidence.** Every containment action and every proposed change writes the 3-level `agent_run`
  tracer with the rule diff, the justification, and the human approver.

## 6. Roles & Responsibilities

| Actor | Responsibility |
| --- | --- |
| CISO / Deputy CISO | Own perimeter, segmentation, and wireless posture; approve rule changes; receive review results. |
| Cyrus (SOC agent) | Detect and reversibly contain network threats; escalate confirmed incidents. |
| NOC / network agents | Monitor telemetry; detect drift and excessive rules; propose corrective changes (no auto-apply). |
| All workforce + agents | Use authenticated, authorized access only; route config changes through change management. |

## 7. Enforcement & Audit

Default-DENY, segmentation, and the change-management gate enforce structurally; the gauntlet blocks any
ungated boundary change. Adherence is verified by SOC monitoring in Sentinel, the annual firewall and
wireless reviews, agent eval goldens that test refusal of unjustified rules, and the conformance sweep.
A violation parks the work and escalates; repeated or high-severity violations lower the agent's dial or
trip the kill-switch.

## 8. Related

**Procedures governed:** Stream 07 network-protection procedures and any procedure with a
network-change step. **Related policies:** [CS-02](CS-02-identity-and-access-management.md) ·
[CS-03](CS-03-remote-access-and-mfa.md) ·
[CS-10](CS-10-logging-monitoring-and-siem.md) · [CS-IR](CS-IR-technical-incident-response-program.md).
**ADRs:** ADR-0128 (autonomy ladder) · ADR-0109 (dial + ceilings) · ADR-0058 (gauntlet) ·
ADR-NNNN (policy-canon architecture).
