# IM006 — Information Security Risk Management & Analysis Policy

| Field | Value |
| --- | --- |
| **Subject** | IM006 — Risk Management & Analysis Policy |
| **Category** | Information Security |
| **Owner** | CISO |
| **Reviewer** | Executive Leadership |
| **Version** | 2.0 |
| **Effective Date** | _________ |
| **Approval Date** | _________ |
| **Review Cadence** | Annual |

| Scope of Policy (Applies to entities/locations marked below) | |
| --- | --- |
| **X** | This document applies to ALL Imperion and Imperion-managed information systems |
| | Excluded business units: _none_ |

**Framework Alignment:** NIST CSF 2.0 (GV.RM, ID.RA, ID.IM) · SOC 2 (CC3.1–CC3.4, CC4.1)

---

## 1. Purpose

To establish a continual process for evaluating risks and vulnerabilities to the confidentiality, integrity, and availability of information systems owned or managed by Imperion, and to define how those risks are rated, escalated, and treated.

## 2. Definitions

- **Authorized Decision Maker** — An individual with the authority appropriate to make a given risk-response decision.
- **Risk** — The likelihood of a threat exploiting a vulnerability, and the resulting operational, financial, legal, and reputational impact.
- **Threat** — A person, thing, or event likely to cause harm, intentionally or unintentionally.
- **Vulnerability** — A flaw or weakness in logical/physical controls, design, or implementation that could result in a breach or policy violation.

## 3. Statement of Policy

### 3.1 Framework and Approach

Risk management activities align with the **NIST Cybersecurity Framework 2.0** and support the SOC 2 control environment. Methods may be technical or non-technical and may use internal or external resources. The lifecycle comprises Risk Assessment, Risk Response, and Risk Monitoring.

### 3.2 Risk Assessment

- An enterprise-wide risk assessment is performed at least annually by the CISO, delegate, or a qualified third party, and includes technical analysis of assets that process, transmit, or store sensitive information.
- Project- and incident-driven assessments are performed as needed.
- Assessment types include vulnerability scans, access reviews, encryption reviews, physical and technical control reviews, third-party/vendor reviews (IM013), AI system risk assessments (IM011), and threat monitoring.

### 3.3 Risk Response

For each identified risk, one of the following responses is selected:

- **Avoid** — Eliminate the cause by removing the vulnerable process or asset.
- **Mitigate** — Reduce probability or impact through administrative, technical, or physical controls.
- **Accept** — Proceed with little or no mitigation. A contingency plan and VP-level signature are required.
- **Transfer** — Shift responsibility to a third party (e.g., cyber insurance). Transfer covers monetary exposure but not reputational damage.

### 3.4 Risk Monitoring

- Risk monitoring verifies compliance, measures control effectiveness, and identifies changes affecting risk.
- External assessments may be performed by an independent auditor as needed.
- Internal assessments produce a formal report with prioritized remediation recommendations, reviewed with management for corrective action.
- Deficiencies are prioritized by risk rating and tracked to closure.

### 3.5 Risk Rating Scale and Decision Authority

| Risk Level | Required Action | Mitigation Timeframe | Authorized Decision Maker |
| --- | --- | --- | --- |
| **Critical** | Immediate countermeasures; activity should not continue/be implemented until a mitigation plan is in place; notify Executive Leadership and Information Security immediately; initiate Incident Response for active exploits | Immediate | CEO / Vice President |
| **High** | Strong need for safeguards; activity may continue with a mitigation plan; notify leadership and Information Security immediately; document for leadership | Within 10 days | CISO / Security Officer |
| **Elevated** | Mitigation plan required; notify Security Operations immediately; IR team on standby | Within 15 days | CISO / Security Officer |
| **Medium** | Mitigation plan submitted via standard ticketing; follow standard workflow | Standard SLA | MIS / SecOps |
| **Low** | Risk may be acceptable; mitigate via ticketing if pursued | Standard SLA | MIS |

### 3.6 Qualitative Determination

Risk is calculated qualitatively from **Likelihood** (Almost Certain, Likely, Possible, Unlikely, Rare) and **Magnitude of Impact** (Severe, Major, Moderate, Minor, Insignificant), combined per the Enterprise Information Security Program's Qualitative Risk Determination Framework (Appendix A of that document).

### 3.7 Reporting

The CISO reports identified risks and recommended controls to senior management at least annually, with High or greater risks communicated as soon as possible. Risks are recorded in the Enterprise Risk Management profile and tracked with corrective action plans.

## 4. NIST CSF 2.0 / SOC 2 Mapping

| Control | Coverage |
| --- | --- |
| NIST CSF GV.RM, ID.RA-01–06, ID.IM | Risk strategy, assessment, prioritization, improvement |
| SOC 2 CC3.1–CC3.4, CC4.1 | Risk identification, assessment, and monitoring |

---

*Electronic approval on file.*
