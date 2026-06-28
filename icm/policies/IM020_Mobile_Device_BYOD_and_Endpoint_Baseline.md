# IM020 — Mobile Device, BYOD & Endpoint Baseline Policy

| Field | Value |
| --- | --- |
| **Subject** | IM020 — Mobile Device, BYOD & Endpoint Baseline Policy |
| **Category** | Information Security |
| **Owner** | Director of Cybersecurity |
| **Reviewer** | CISO |
| **Version** | 1.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL devices accessing Imperion or client data, whether company-owned or personal (BYOD) |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.PS, PR.AA, ID.AM) · SOC 2 (CC6.1, CC6.7, CC6.8)

---

## 1. Purpose

To define the minimum security baseline for endpoints and mobile devices and the conditions under which personal (BYOD) devices may access Imperion or client data, enforced through Microsoft Entra ID and Intune.

## 2. Definitions

- **Managed Device** — A device enrolled in Imperion's management (Intune) and subject to compliance policy.
- **BYOD** — Personally owned device used to access company or client resources.
- **Endpoint Baseline** — The minimum required security configuration for any device accessing resources.
- **Compliance Policy** — Entra/Intune policy that evaluates device posture before granting access.

## 3. Statement of Policy

### 3.1 Conditional Access Gate

- Access to Imperion and client resources requires the device to meet Conditional Access requirements in Entra ID (IM004), including compliance status and, where required, management enrollment.
- Non-compliant devices are blocked or granted limited access until remediated.

### 3.2 Endpoint Baseline (All Devices)

Every device accessing resources must have:

- Full-disk encryption (BitLocker / FileVault), enforced and monitored (IM005).
- Endpoint Detection and Response / antimalware (Microsoft Defender for Endpoint) active and reporting.
- Current operating system and applications within patch SLAs (IM002).
- Screen lock with timeout and strong authentication.
- Host firewall enabled; attack-surface-reduction and security baselines applied to managed devices.

### 3.3 Company-Owned Devices

- Enrolled in Intune, configured to the secure baseline, and inventoried as assets (IM003).
- Remote lock and wipe capability is maintained.

### 3.4 BYOD

- BYOD access is permitted only where enrolled in management or constrained by app-protection policies (MAM) that isolate and protect company data without taking full control of the personal device.
- Company data on BYOD can be selectively wiped on separation or compromise without affecting personal data, where technically supported.
- BYOD devices must still meet the endpoint baseline (§3.2) applicable to the access granted.
- Restricted data (IM012) handling on BYOD is limited per classification controls.

### 3.5 Mobile Devices

- Mobile devices accessing email or company apps use app-protection policies (encryption, PIN, copy/paste and save restrictions for company data).
- Jailbroken/rooted devices are blocked.

### 3.6 Lost, Stolen, or Compromised Devices

- Loss, theft, or suspected compromise is reported immediately and handled as a potential incident (Technical Incident Response Program); affected devices are remotely locked or wiped and sessions/tokens revoked.

### 3.7 Decommissioning

- Devices are securely sanitized before reuse or disposal (IM012, IM018).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.PS, PR.AA, ID.AM | Endpoint hardening, device access, asset inventory |
| SOC 2 CC6.1 / CC6.7 / CC6.8 | Logical access, transmission, malicious-software prevention |

---

*Electronic approval on file.*
