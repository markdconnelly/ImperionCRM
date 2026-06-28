# IM023 — Network Security Policy

| Field | Value |
| --- | --- |
| **Subject** | IM023 — Network Security Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed networks, perimeter devices, and wireless infrastructure |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.IR, PR.AA, DE.CM) · SOC 2 (CC6.6, CC6.7, CC7.1)

---

## 1. Purpose

To define the controls protecting Imperion and managed-client networks, including perimeter defense, segmentation, wireless security, and network monitoring, consistent with a Zero Trust model.

## 2. Definitions

- **Perimeter** — The boundary between trusted internal networks and untrusted external networks.
- **Segmentation** — Dividing networks into zones to limit lateral movement.
- **Default-DENY** — A firewall posture that blocks all traffic except that explicitly permitted.

## 3. Statement of Policy

### 3.1 Perimeter Defense

- Perimeter firewalls are configured to **default-DENY**; only explicitly justified traffic is permitted.
- All firewall rules are documented with a valid business justification.
- Firewall rules are reviewed at least annually for validity and excessive allowances (e.g., "allow all"), with results reported to the CISO.
- Intrusion prevention/detection capabilities are deployed at the perimeter where applicable.

### 3.2 Segmentation

- Networks are segmented to separate trust levels (e.g., guest, corporate, management, on-premises equipment).
- Guest networks are isolated from corporate resources.
- In managed-client environments, segmentation is applied per design and contract to limit blast radius.

### 3.3 Wireless Security

- Wireless networks use strong, current encryption and authentication (WPA2-Enterprise or WPA3 where supported); legacy/weak protocols are prohibited.
- Guest wireless is segregated from corporate and management networks.
- Wireless encryption and authentication strength is tested at least annually, with results reported to the CISO.

### 3.4 Zero Trust and Secure Access

- Network access does not imply trust; access to resources is independently authenticated and authorized (IM004/IM008).
- Remote and site-to-site connectivity follows IM004.

### 3.5 DNS and Egress Protection

- DNS filtering/protective DNS is applied; DNS logs are forwarded to **Microsoft Sentinel** (IM014).
- Egress is controlled to limit unauthorized outbound connections and data exfiltration.

### 3.6 Monitoring

- Perimeter, firewall, IDS/IPS, and network telemetry are continuously monitored and correlated in Sentinel; anomalies are investigated and escalated to incident response as warranted (IM014).

### 3.7 Network Changes

- Changes to network configuration, firewall rules, and segmentation follow change management (IM016).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.IR-01, PR.AA, DE.CM | Network protection, access, monitoring |
| SOC 2 CC6.6 / CC6.7 / CC7.1 | Boundary protection, transmission, detection |

---

*Electronic approval on file.*
