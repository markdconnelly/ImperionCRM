# Policy Coverage Matrix

Proves every actor and every Operating Procedure is governed, and that no policy is orphaned.
Two views: **agent → governing policies** (the baseline + category set every agent inherits) and
**stream/procedure → driving policy** (the D4 per-procedure binding). The per-procedure rows are
completed in the catalog driving-policy mapping pass (follow-up to #1581/#1588); this scaffold
establishes the structure and the agent/stream-level coverage now.

> **Universal baseline** (inherited by EVERY agent + procedure, not repeated below): the
> [top umbrella](00-imperion-operating-policy-and-code-of-conduct.md) + CS-19 Acceptable Use +
> CS-07 AI Governance + CS-08 Data Classification + CS-10 Logging & SIEM + CS-14 Privacy + the
> relevant category umbrella(s).

## View A — Agent → governing policies (beyond the baseline)

| Agent | Division | Primary category | Key driving policies |
|---|---|---|---|
| Nova (orchestrator) | Executive | All | top umbrella · CS-07 |
| Rachel (Chief of Staff) | G&A | Business Ops | BO-00 · BO-10 · BO-09 |
| Dexter (CTO) | Service Delivery | IT | IT-00 |
| Roman (Deputy CISO) | Security | Cybersecurity | CS-00 · CS-01 · CS-IR |
| Sterling (Deputy CFO) | Finance | Business Ops | BO-00 · BO-06 |
| Jessica (Chief Risk Officer) | Platform & Assurance | Cybersecurity | CS-05 · CS-17 |
| Felix (Service) | Service Delivery | IT | IT-01 · IT-05 · CS-02 |
| Ozzie (NOC) | Service Delivery | IT | IT-04 · IT-05 · IT-03 |
| Sage (L3/Problem) | Service Delivery | IT | IT-05 · IT-02 |
| Marshall (Change/Release) | Service Delivery | IT | IT-02 |
| Scout (Dispatch) | Service Delivery | IT | IT-01 |
| Phoenix (BCDR) | Service Delivery | IT | IT-06 |
| Pierce (Projects) | Service Delivery | IT | IT-10 · BO-09 · CS-02 |
| Cyrus (SOC) | Security | Cybersecurity | CS-10 · CS-IR · CS-13 |
| Grace (GRC) | Security | Cybersecurity | CS-17 · CS-05 |
| Osiris (IAM/JML) | Security | IT/Cyber | IT-08 · IT-09 · CS-02 · CS-03 |
| Holly (HR) | G&A | Business Ops | BO-10 · CS-20 · CS-12 |
| Laurel (Legal) | G&A | Business Ops | BO-09 · CS-09 · CS-14 |
| Tess (QA) | Platform & Assurance | IT/Cyber | CS-17 · IT-01 |
| Vera (Governance) | Platform & Assurance | All | CS-17 · CS-18 · top umbrella |
| Lexicon (Doc-Hygiene) | Platform & Assurance | IT | IT-11 · CS-16 |
| Chase (Sales) | Revenue | Business Ops | BO-02 · BO-01 |
| Belle (Marketing) | Revenue | Business Ops | BO-01 · CS-14 |
| Celeste (Client Success) | Revenue/Client | Business Ops | BO-04 · CS-18 |
| Vance (Procurement) | Revenue | Business Ops | BO-03 · CS-09 |
| Audrey (Finance) | Finance | Business Ops | BO-05 · BO-06 · BO-07 · BO-08 |

## View B — Stream → driving policy (per-procedure rows filled in the mapping pass)

| Stream | Owner(s) | Category | Likely driving policies | Mapping |
|---|---|---|---|---|
| 01 Demand → Lead | Belle | Business Ops | BO-01 · CS-14 | ⏳ pending |
| 02 Lead → Cash | Chase · Vance | Business Ops | BO-02 · BO-03 · CS-09 | ⏳ pending |
| 03 Sold → Live | Pierce | IT | IT-10 · IT-02 · CS-02 · BO-09 | ⏳ pending |
| 04 Request → Fulfil | Felix · Scout · Osiris | IT | IT-01 · IT-08 · IT-09 · CS-02 | ⏳ pending |
| 05 Event → Resolution | Ozzie · Sage | IT | IT-04 · IT-05 · IT-03 | ⏳ pending |
| 06 Change → Release | Marshall | IT | IT-02 | ⏳ pending |
| 07 Protect → Assure | Cyrus · Grace · Roman · Phoenix | Cybersecurity | CS-IR · CS-10 · CS-17 · IT-06 · CS-18 | ⏳ pending |
| 08 Engage → Retain | Celeste | Business Ops | BO-04 · CS-18 | ⏳ pending |
| 09 Record → Report | Audrey · Sterling | Business Ops | BO-05 · BO-06 · BO-07 · BO-08 · CS-16 | ⏳ pending |
| 10 Run the Company | Rachel · Holly · Laurel · Tess · Vera · Jessica · Lexicon · OS-self | All | BO-10 · BO-09 · CS-17 · CS-05 · IT-11 · CS-07 | ⏳ pending |
| 11 Orchestrate | Nova + C-suite | All | top umbrella · CS-07 | ⏳ pending |

## Orphan check
Every policy in the [register](README.md) must appear in View A or B (govern something) once the
mapping completes. Policies with no governed procedure are flagged here for removal or merge.

*(Status: scaffold. Per-procedure rows + the orphan check are completed in the catalog
driving-policy mapping pass, after the distinct policies are authored and #1588 merges.)*
