# Technical Incident Response Program

| Field | Value |
| --- | --- |
| **Document** | Technical Incident Response Program |
| **Category** | Information Security — Operations |
| **Owner** | CISO |
| **Reviewer** | Executive Leadership |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual (and after major incidents) |

**Framework Alignment:** NIST CSF 2.0 (DE, RS, RC) · NIST SP 800-61r2 · SOC 2 (CC7.3, CC7.4, CC7.5)

---

## 1. Executive Summary

### 1.1 Scope

This program defines how Imperion prepares for, detects, contains, eradicates, recovers from, and learns from security incidents affecting Imperion or its managed clients. It is designed to meet NIST CSF 2.0 and SOC 2 requirements for incident response.

### 1.2 Objectives

- Prepare Imperion to respond quickly and effectively to security incidents.
- Minimize risk to Imperion, its clients, and its reputation.
- Provide a repeatable, documented process applied uniformly to every incident.

### 1.3 Ownership

The Imperion Security Operations team, led by the CISO, owns this process. Key stakeholders: Cybersecurity, Information Technology / MIS, and the Service Desk.

### 1.4 Governing Policy

This program operates under the Information Security Strategy (IM001) and the Enterprise Information Security Program, and works in conjunction with IM014 (Logging, Monitoring & SIEM) and IM015 (Backup, Recovery & Business Continuity).

## 2. Incident Definitions

An **incident** is any act that violates Imperion's or a client's information security policies. Reportable activities include:

- Unauthorized attempts (failed or successful) to access systems or data, especially sensitive information.
- Disruption or denial of service to systems.
- Unauthorized use of a system for processing or storing data.
- Inappropriate usage under acceptable-use policies (IM010).
- Theft or loss of computing equipment.
- Suspected compromise of credentials or identities.
- Ransomware or destructive malware.
- AI-specific incidents — sensitive data leakage via an AI tool, harmful or unauthorized AI output, or AI agent misbehavior (IM011).
- Any event that could impact confidential records.

All suspected incidents are reported to the Security Officer / Cybersecurity without delay.

## 3. Resources

### 3.1 Computer Emergency Response Team (CERT)

| Name | Role | Direct Line | Cell | Email |
| --- | --- | --- | --- | --- |
| _________ | CISO | | | |
| _________ | CEO | | | |
| _________ | Director of Cybersecurity | | | |
| _________ | Service Desk Lead | | | |

**Responsibilities:** Coordinate response, survey the situation, and lead containment and recovery (remotely or on-site as needed).

**Pre-Incident Procedures:**
- Maintain current network diagrams, firewall rule sets, and asset inventories.
- Ensure credentials and encryption keys are current and securely accessible (managed in 1Password / Azure Key Vault).
- Patch known vulnerabilities (IM002).
- Operate automated detection via Defender XDR and Sentinel; monitor logs continuously (IM014).
- Maintain immutable backups and tested restore points (IM015).

**Incident Procedures:**
- Identify the nature and scope of the incident.
- Determine quickly whether data loss/leakage has occurred or operations are impacted.
- Determine whether operations will be impacted for more than 24 hours.
- Recover and restore operations as required.
- Refer to the ERBC plan if relocation to an alternate site is required.

**Post-Incident Procedures:**
- Complete incident forms and worksheets.
- Assess the effectiveness of the response and modify procedures as needed.
- Conduct a post-incident review to capture lessons learned and prevent recurrence.

### 3.2 Crisis Management Team (CMT)

The CMT is convened only when the Emergency Response and Business Continuity plans must be initiated or when an incident materially affects operations. The CMT tests its plans at least annually and reviews incident reports supplied by the Security Officer.

## 4. Incident Response Lifecycle

### 4.1 Identification

The CERT gathers as much information as possible to determine the nature and scope of the incident:

- Assign the appropriate CERT members aligned to the affected business/system function.
- Begin an incident log using the Incident Summary forms.
- Where forensic preservation is warranted, capture a forensic image of affected systems before changes are made; this preserves evidence for analysis and potential referral to authorities.
- Enable full logging on affected systems; engage third-party forensic teams when required.

### 4.2 Analysis

- Affected systems are **not** returned to the production network; they remain isolated.
- Review for modifications to system software, configuration files, and data; look for attacker tools, network sniffers, and signs of lateral movement.
- Review Defender XDR, Sentinel, firewall, IDS, and local logs for anomalies and logon events.
- Check other systems on the network and at remote/client locations for involvement.

### 4.3 Containment

Containment prevents the incident from spreading. Steps are a flexible guide; the CERT lead exercises best judgment:

- Survey the situation and review the Identification-phase summary.
- For networked threats, isolate or disable affected connectivity where possible (Defender device isolation).
- Assess the risk of continued operation by reviewing logs and attack vectors.
- Review same-subnet and client systems for impact.
- Determine whether the threat originates from a third-party connection and consult business/system owners.
- Change credentials on affected and interfacing systems as needed; revoke sessions and tokens (Entra ID).
- Keep relevant owners updated throughout.

### 4.4 Eradication

- Identify and mitigate all exploited vulnerabilities.
- Run vulnerability scans to find open exposures.
- Remove malware, unauthorized accounts, and other malicious components.
- Close open attack vectors (disable unnecessary accounts and ports, remediate unpatched software).
- If additional affected hosts are discovered, repeat identification and contain/eradicate for them.

### 4.5 Recovery

- Restore systems to a known-good operational state, rebuilding from clean media where any doubt of residual compromise exists. A compromised machine should be assumed fully untrustworthy; the reliable path is reinstallation and full patching before reconnection.
- Restore data only from verified-clean, uncompromised backups (IM015), taking care not to reintroduce the original vulnerability.
- Confirm normal function; disable unnecessary services; install all vendor security patches.
- Apply elevated monitoring for related activity.
- Re-run vulnerability scans; for external services, confirm with the vendor before re-establishing connectivity.

### 4.6 Post-Incident Review

- Document the timeline, root cause, impact, and response effectiveness.
- Record a documented risk assessment (IM006) and update detections, controls, and playbooks.
- Notify clients, regulators, and authorities as required by contract and law, within required timeframes (vendor breach notification no later than 30 days where applicable — see IM009/IM013).

## 5. Appendix — Signs of a Potential Security Incident

**Denial of Service:** unusually slow or unavailable network; inability to reach public resources; mailbox flooded such that legitimate mail cannot be delivered; storage suddenly full.

**Malicious Code:** abnormally slow performance or unexplained crashes; files deleted or corrupted; altered browser/homepage or added components; persistent pop-ups; random error messages; cursor moving without input.

**Unauthorized Access:** equipment not in the condition it was left; files/folders added, deleted, or changed; observation of someone using a system or credentials that are not theirs; unexpected privileged-account activity in Sentinel/Entra logs.

---

*Electronic approval on file.*
