# S&P and Moody’s Settlements: Referential Services Failure Case Study

## Overview

This document describes how two global credit rating agencies – Standard & Poor’s (S&P) and Moody’s – paid multi‑hundred‑million to billion‑dollar settlements for allegedly misleading credit ratings sold to large institutional clients, and how this maps to a “referential services provider + large client” failure mode suitable for a time‑travel intelligence platform demo.[web:32][web:35][web:41]

It is written so you can ingest it directly into a system like HydraDB and also use it as a narrative reference for slides, demos, or Claude prompts.

---

## Actors and Roles

- **Referential services providers**  
  - Standard & Poor’s Financial Services LLC (S&P), a credit rating agency providing structured finance ratings (RMBS/CDO) to global financial institutions.[web:32]  
  - Moody’s Investors Service, Inc. and Moody’s Analytics, Inc., collectively part of Moody’s Corporation, providing similar ratings and analytics services.[web:35][web:41]

- **Large clients**  
  - Global banks, insurance companies, pension funds, and asset managers that used these ratings as inputs to investment decisions, portfolio risk management, and regulatory capital calculations.[web:32][web:41]

- **Regulators / prosecutors**  
  - U.S. Department of Justice (DOJ) and 19 states plus the District of Columbia in the S&P case.[web:32]  
  - DOJ, 21 states, and D.C. in the Moody’s case.[web:35][web:41]

The key point: S&P and Moody’s are **reference / analytics vendors** whose outputs directly shaped the risk posture of very large clients.

---

## Case 1 – S&P 1.375 B USD Settlement

### Core facts

- In February 2015, the DOJ and a coalition of states announced a **1.375 B USD settlement** with Standard & Poor’s Financial Services LLC and its parent over claims that S&P defrauded investors by misrepresenting its credit ratings on residential mortgage‑backed securities (RMBS) and collateralized debt obligations (CDOs) in the run‑up to the financial crisis.[web:32]
- According to the DOJ, S&P’s ratings on certain structured finance products did not accurately reflect the true credit risks, and S&P allegedly adjusted or delayed rating updates to avoid losing business from issuers and underwriters.[web:32]
- S&P’s clients – including large banks, insurers, pensions, and funds – relied heavily on these ratings to decide whether to buy or hold complex structured products.[web:32]

### Penalty breakdown

- **Total settlement:** 1.375 B USD.[web:32]
- **Federal civil penalty:** 687.5 M USD paid to the U.S. government.[web:32]
- **Payments to states and D.C.:** 687.5 M USD distributed among 19 states and the District of Columbia.[web:32]

### Conduct and control failures

- The government alleged that S&P:  
  - Represented to investors that its ratings were objective and independent, based solely on credit‑related factors.[web:32]  
  - Internally recognized the deteriorating quality of mortgage collateral and increasing risks in RMBS/CDO structures.  
  - Nonetheless issued and maintained high ratings, influenced by issuer fees and competitive pressure (the “issuer‑pays” model).[web:32]
- These allegations describe a **misalignment between internal risk signals and external reference outputs** – exactly the pattern a time‑travel intelligence platform can help detect.

### Remedial measures

- As part of the settlement, S&P agreed to compliance and governance reforms around its rating processes and methodologies.[web:32]
- For your narrative, treat these as “post‑crisis remediation” that a more transparent, versioned data and policy environment could have forced much earlier.

---

## Case 2 – Moody’s ~864 M USD Settlement

### Core facts

- In January 2017, Moody’s Corporation, Moody’s Investors Service, Inc., and Moody’s Analytics, Inc. agreed to a **nearly 864 M USD settlement** with the DOJ, 21 states, and D.C. over similar allegations relating to ratings of RMBS and CDOs.[web:35][web:41]
- Authorities alleged that Moody’s misrepresented to investors that its ratings were objective and based on reliable, transparent methodologies, while internal practices allegedly fell short of those representations.[web:35][web:41]

### Penalty breakdown

- Under the terms of the agreement, Moody’s agreed to pay:  
  - **437.5 M USD civil penalty** to the DOJ to resolve potential claims under FIRREA (the Financial Institutions Reform, Recovery, and Enforcement Act).[web:41]  
  - **426.3 M USD** to 21 states and the District of Columbia, totaling roughly **863.8 M USD**.[web:41]

### Public vs. internal representations

- The settlement documents and press materials emphasize that Moody’s:  
  - Publicly described its ratings as objective, independent, and rooted in rigorous analytic models.[web:35][web:41]  
  - Internally faced conflicts of interest and pressures linked to the issuer‑pays business model, similar to S&P.[web:35]  
- Again, this is a **referential services vendor** whose public risk‑reference output diverged from the underlying reality and from what its own back‑testing and internal analytics were signalling.

---

## Why this is a strong "referential services + large client" example

### 1. Vendor’s reference layer became misaligned with reality

- Ratings from S&P and Moody’s served as a **canonical reference** for risk and regulatory capital treatment across global finance.[web:32][web:35]
- When those ratings were inflated, downstream clients accumulated exposures they believed to be safe (AAA) but were in fact far riskier, amplifying systemic risk.

### 2. Internal awareness vs. external outputs

- In both cases, authorities alleged that internal analytics and qualitative assessments showed increasing risk, while external ratings and public marketing language continued to emphasize independence and objectivity.[web:32][web:35][web:41]
- That creates a rich “diff” space between:  
  - Internal memos, model change logs, and back‑testing reports.  
  - Published methodologies and rating distributions by date.

### 3. Large clients and regulators depended on these reference services

- Banks, insurers, pensions, and funds used ratings as inputs to:  
  - Investment mandates and eligibility criteria.  
  - Value‑at‑Risk (VaR) and economic capital models.  
  - Regulatory capital calculations under Basel frameworks.[web:32][web:41]
- When the reference layer failed, **entire portfolios** at large institutions were mis‑specified – a perfect example for your pitch that “even the reference providers themselves need a time‑travel truth layer.”

---

## How a Time‑Travel Intelligence Platform Would Help

Assume a platform that:

- Ingests and versions **all public methodologies, rating criteria documents, and marketing claims** from S&P and Moody’s over time.  
- Ingests **internal documents and analytics** from the client side: back‑testing of ratings vs. performance, collateral quality reports, transaction surveillance.  
- Ingests **regulatory enforcement actions, speeches, and risk alerts** from DOJ, SEC, and other regulators.  
- Stores everything in a **bitemporal graph**, never overwriting history, and supports **time‑sliced, LLM‑driven queries**.

### A. Methodology and marketing drift

A bank or regulator could ask:

> "Between 2003 and 2007, show how S&P’s and Moody’s published rating methodologies for subprime RMBS changed, and how those changes correlate with the share of AAA tranches issued."

Your platform would:

- Diff every version of the public methodology PDFs.  
- Extract and track key criteria (e.g., required credit enhancement levels, LTV limits, FICO thresholds).  
- Join that with a time series of ratings distributions (e.g., AAA/AA/A share of RMBS deals).  
- Output a graph showing **criteria loosening over time while ratings remain high**.

### B. Internal vs. external signal divergence

For a large client (or a regulator inside a supervisory review), the platform could:

- Ingest the client’s **internal performance and loss reports** on securities rated by S&P/Moody’s.  
- At each time slice, compare **actual performance metrics** against what would be expected for AAA/AA ratings.  
- Surface periods where internal loss curves **visibly diverge** from rating‑implied risks, yet the agencies’ methodologies and outputs remain unchanged.

This is exactly the type of divergence that appears in post‑crisis litigation, but your platform would highlight it **in flight**, not years later.

### C. Immutable audit trail and vendor accountability

By versioning every rating, methodology document, and related communication, your platform would allow:

- Large clients to ask:  
  - “On 1 January 2006, what exactly did S&P’s methodology say, what did their marketing decks claim, and what were our internal stress tests showing?”  
- Regulators to reconstruct:  
  - “When did internal analytics at S&P/Moody’s diverge from their external public statements, based on contemporaneous documents?”

This is fundamentally different from generic web search or a Bloomberg terminal, which typically **do not version and cross‑join internal and external narratives over time**.

---

## Example Graphs and Views for a Demo

Below are suggested graphs that naturally fall out of the data once your system ingests the corpus.

### 1. Methodology Tightness vs. AAA Share

- **X‑axis:** Time (by quarter, 2003–2008).  
- **Y‑axis 1:** Numeric score summarizing methodology strictness (e.g., required credit enhancement for a target rating, parsed from PDFs).  
- **Y‑axis 2:** Percentage of tranches rated AAA in new RMBS/CDO issues.

Demo story: “Watch as methodology strictness drifts downward while the share of AAA tranches remains high – and note the dates where public marketing still says ‘conservative, independent ratings’.”

### 2. Default/Loss Curves vs. Rating Expectations

- **X‑axis:** Time since issuance (months).  
- **Y‑axis:** Cumulative default rate or loss severity.  
- Separate curves for tranches originally rated AAA, AA, etc.

Demo story: “By month 24, realized losses on ‘AAA’ tranches exceed the historical bounds the ratings implied – our platform flags this divergence automatically as a risk anomaly.”

### 3. Client Exposure Heatmap

- For a specific large bank or insurer:  
  - **X‑axis:** Time.  
  - **Y‑axis:** Rating buckets (AAA, AA, A, BBB, etc.).  
  - **Color:** Exposure amount.

Overlay vertical lines for key methodology changes and DOJ/AG announcements to show how clients remained concentrated in “AAA” even as methodologies loosened.

### 4. Narrative Graph of Documents and Entities

- Nodes:  
  - Rating methodology versions.  
  - DOJ complaint paragraphs.  
  - Investor presentations.  
  - Internal memos or surveillance reports (from the client side).  
- Edges:  
  - “References,” “supersedes,” “cites,” “contradicts,” etc.  

Demo story: “This is the ‘Git log’ of the risk narrative itself, not just the data – something that neither generic LLMs nor Bloomberg’s historical news features provide.”

---

## Curated Link Set for Seeding Your Database

Below is a minimal but high‑leverage link set you can feed into Claude / HydraDB as a foundation corpus.

### S&P case (core)

- DOJ press release – **1.375 B USD S&P settlement** for defrauding investors with RMBS/CDO ratings (2015‑02‑02):  
  - https://www.justice.gov/archives/opa/pr/justice-department-and-state-partners-secure-1375-billion-settlement-sp-defrauding-inves[web:32]

From this, follow and ingest:

- The full **settlement agreement / consent judgment** (linked in the release).  
- Complaints filed by individual states (e.g., California, New York) that provide more detail on conduct and timelines.

### Moody’s case (core)

- DOJ press release – **nearly 864 M USD Moody’s settlement** on structured finance ratings (2017‑01‑12):  
  - https://www.justice.gov/archives/opa/pr/justice-department-and-state-partners-secure-nearly-864-million-settlement-moody-s-arisi[web:35]
- Moody’s investor‑relations announcement – payment breakdown and remedial measures:  
  - https://ir.moodys.com/press-releases/news-details/2017/Moodys-Reaches-Settlement-with-US-Department-of-Justice-21-US-States-and-District-of-Columbia/default.aspx[web:41]

### Context and comparative reference failures (optional but useful)

These are not the main example, but they give you extra axes for future demos.

- TD Bank record AML fine – shows scale of client‑side AML failure and dependence on monitoring systems:  
  - https://kyc360.com/knowledge-hub/resources/key-takeaways-from-td-banks-record-fine-for-aml-failures[web:33]
- AML/KYC due diligence primer – requirements and best practices for reference:  
  - https://smartroom.com/blog/due-diligence/aml-due-diligence/[web:39]
- World‑Check / Refinitiv – canonical example of a widely used sanctions/adverse media reference database:  
  - Product overview: https://www.lseg.com/en/risk-intelligence/screening-solutions/world-check-kyc-screening[web:27]  
  - Use in AML and sanctions programs: https://giact.com/addressing-sanctions-compliance-and-risk-with-refinitiv-world-check/[web:29]  
  - Market penetration (49 of the 50 largest banks use it): https://linkilawsolicitors.com/insights/clearing-your-record-a-practical-guide-to-risk-databases-like-world-check-refinitiv-and-others[web:30]  
  - How World‑Check works in practice (AML practitioner explainer): https://www.linkedin.com/posts/aml-wizards_aml-worldcheck-financialcrime-activity-7387835675514978304-qHr1[web:40]  
  - Data removal / dispute process (illustrates opacity of vendor data): https://extraditionlawyers.net/services/world-check-data-removal/[web:37]
- OFAC vendor miscommunication case – describes how misalignment between a bank and its sanctions screening vendor led to penalties:  
  - https://www.descartes.com/resources/blog/ofac-cites-three-banks-for-sanctions-compliance-deficiencies[web:31]

---

## How to Use This File

- Ingest this markdown directly into your bitemporal store as a **narrative node** linked to the underlying primary sources.  
- Use the curated links to drive automated crawlers that fetch and version all referenced documents.  
- Use the “Example Graphs and Views” section as the blueprint for building demo dashboards and Claude tool calls.
