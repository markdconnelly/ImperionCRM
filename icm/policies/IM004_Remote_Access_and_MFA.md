# IM004 — Remote Access & Multi-Factor Authentication Policy

| Field | Value |
| --- | --- |
| **Subject** | IM004 — Remote Access & MFA Policy |
| **Category** | Information Security |
| **Owner** | CISO |
| **Reviewer** | Executive Leadership |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL remote access to Imperion and Imperion-managed network resources |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (PR.AA, PR.IR) · SOC 2 (CC6.1, CC6.6, CC6.7)

---

## 1. Purpose

To provide a secure framework for remote access to Imperion's and clients' network resources, and to establish authentication requirements consistent with a Zero Trust security model.

## 2. Definitions

- **Multi-Factor Authentication (MFA)** — Authentication requiring two or more independent factors: something you know, something you have, and/or something you are.
- **Phishing-Resistant Authentication** — Authentication methods resistant to interception and replay, including FIDO2/WebAuthn security keys, passkeys, Windows Hello for Business, and certificate-based authentication. These methods do not rely on shared secrets such as OTP codes that can be phished.
- **Conditional Access** — Entra ID policy engine that evaluates signals (user, device, location, risk) to grant, limit, or block access.
- **VPN** — A secure, encrypted tunnel through an untrusted network used to protect data in transit.

## 3. Statement of Policy

### 3.1 Authentication Requirements

- **Always-on MFA is mandatory** for all Imperion workforce members, contractors, and any access to Imperion or client resources. There are no exemptions for convenience.
- **Phishing-resistant authentication is required** for all privileged and administrative access and is strongly recommended — and progressively enforced — for all users. OTP via SMS is deprecated and permitted only as a temporary fallback where no stronger method is technically available, subject to documented exception.
- Authentication is centralized in **Microsoft Entra ID**. Conditional Access policies enforce device compliance, sign-in risk evaluation, and session controls.
- The use of generic or shared accounts for remote access is prohibited.

### 3.2 Eligibility and Justification

- Only individuals with documented business justification are granted remote access. Justification includes employment duties, or a contracted/vendor engagement approved by Imperion.
- Remote access is limited to the minimum necessary for assigned duties.
- Remote access is restricted to Imperion employees, contracted individuals, and approved consultants.

### 3.3 Secure Connectivity

- Remote access to network resources is encrypted via secure VPN or equivalent Zero Trust Network Access (ZTNA) broker.
- All remote sessions are subject to existing access-management and acceptable-use policies (IM010).
- Where MFA cannot be technically applied, source IP allow-listing is used to constrain connections, pending remediation.

### 3.4 Vendor and Third-Party Remote Access

- Remote access for vendors and contractors must be time-limited to the expected engagement completion date.
- Third-party access is not permitted until due diligence (IM013) is complete, controls are implemented, and an executed agreement reflects the vendor's security obligations.
- Vendor systems connecting to managed networks must meet Imperion's minimum endpoint security baseline (EDR/antivirus, email and web protection, host firewall, intrusion prevention).
- Third parties must terminate sessions when complete and guard against unauthorized viewing via session lock.

### 3.5 Site-to-Site (LAN-to-LAN) VPN

- All LAN-to-LAN VPN requests must be sponsored by an Imperion manager or above and submitted via service request.
- All LAN-to-LAN connections must be reviewed and approved by Security Operations before implementation, confirming an executed agreement and a configuration that does not violate policy.
- Connections must be re-reviewed upon significant configuration change (ports, source, destination) and disabled when no longer needed or upon contract expiry.

### 3.6 Monitoring

All remote-access authentication and session activity is logged through Entra ID sign-in logs and forwarded to **Microsoft Sentinel** for correlation, anomaly detection, and alerting (IM014).

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF PR.AA-01/03/05, PR.IR-01 | Strong authentication, least privilege, secure network access |
| SOC 2 CC6.1 / CC6.6 / CC6.7 | Logical access, boundary protection, transmission security |

---

*Electronic approval on file.*
