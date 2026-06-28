# IM018 — Physical & Environmental Security Policy

| Field | Value |
| --- | --- |
| **Subject** | IM018 — Physical & Environmental Security Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to Imperion office facilities, on-premises equipment, and remote work locations |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.AA-06, PR.IR-02) · SOC 2 (CC6.4, CC6.5)

---

## 1. Purpose

To protect Imperion's people, facilities, and physical information assets from unauthorized access, damage, theft, and environmental threats. Imperion operates a hybrid model: a small office with limited on-premises equipment, with the majority of infrastructure in the cloud. Controls are scaled accordingly.

## 2. Definitions

- **Restricted Area** — Any area housing on-premises equipment, network gear, or sensitive information.
- **On-Premises Equipment** — Network devices, servers, or other infrastructure physically located in Imperion facilities.
- **Remote Work Location** — Any non-office location from which a workforce member accesses Imperion or client resources.

## 3. Statement of Policy

### 3.1 Facility Access Control

- Physical access to the office is controlled (locks, badge or keypad entry); access is granted on the principle of least privilege based on role.
- Visitors are signed in, escorted in restricted areas, and not left unattended near equipment or sensitive information.
- Access rights are reviewed periodically and revoked promptly upon termination or role change (IM007/IM017).

### 3.2 Protection of On-Premises Equipment

- Network and infrastructure equipment is located in a secured area accessible only to authorized personnel.
- Equipment is physically secured against theft; portable equipment is not left unsecured.
- Cabling and infrastructure are protected from interference and damage where feasible.

### 3.3 Environmental Controls

- On-premises equipment is provided with appropriate power protection (surge protection / UPS) and adequate cooling and ventilation proportional to the small-office footprint.
- Reasonable protection against fire and water damage is maintained for areas housing equipment.

### 3.4 Media and Asset Handling

- Physical media and documents containing sensitive information are stored securely and disposed of per IM012 (shredding for paper; NIST SP 800-88 sanitization or destruction for electronic media).
- A clean-desk practice applies to sensitive information in shared or visitor-accessible areas.
- Hardware assets are inventoried; disposal and reuse follow secure sanitization (IM012).

### 3.5 Remote Work Locations

- Workforce members securing remote locations take reasonable measures to prevent unauthorized viewing or access (screen locks, private workspace, securing devices).
- Company devices used remotely remain encrypted and managed (Intune compliance, IM005), and are not shared with non-workforce members.
- Sensitive information is not printed or left exposed in uncontrolled remote environments.

### 3.6 Monitoring

- Where access-control or camera systems exist, logs and recordings are reviewed for suspicious activity and used to support investigations, accessible to authorized Information Security staff.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.AA-06, PR.IR-02 | Physical access control, environmental protection |
| SOC 2 CC6.4 / CC6.5 | Physical access and asset disposal |

---

*Electronic approval on file.*
