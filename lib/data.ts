import { CompanySnapshot, ComplianceRule } from "./types";

export const rules: ComplianceRule[] = [
  {
    id: "fin-results",
    title: "Quarterly financial results and board outcome",
    regulator: "SEBI",
    source: "SEBI LODR Reg. 33",
    frequency: "quarterly",
    severity: "critical",
    dueWindowDays: 45,
    description: "Board-approved results and required board outcome disclosures must be submitted to exchanges within 45 days of quarter-end."
  },
  {
    id: "shareholding",
    title: "Shareholding pattern filing",
    regulator: "SEBI",
    source: "SEBI LODR Reg. 31",
    frequency: "quarterly",
    severity: "high",
    dueWindowDays: 21,
    description: "Monitor quarter-end shareholding submissions. Promoter, public, and institutional breakdown must be accurate and exchange-acknowledged."
  },
  {
    id: "corp-gov",
    title: "Corporate governance report",
    regulator: "SEBI",
    source: "SEBI LODR Reg. 27",
    frequency: "quarterly",
    severity: "high",
    dueWindowDays: 15,
    description: "Governance reporting must be complete with board composition, independent director details, and committee disclosures."
  },
  {
    id: "investor-complaints",
    title: "Statement of investor complaints",
    regulator: "SEBI",
    source: "SEBI LODR Reg. 13",
    frequency: "quarterly",
    severity: "medium",
    dueWindowDays: 21,
    description: "Captures pending complaints, registrar delays, and unresolved investor grievance data from the SEBI SCORES platform."
  },
  {
    id: "annual-report",
    title: "Annual report and AGM package",
    regulator: "SEBI",
    source: "SEBI LODR Reg. 34",
    frequency: "yearly",
    severity: "critical",
    dueWindowDays: 60,
    description: "Annual report issuance, board report completeness, AGM documentation, and director sign-off readiness."
  },
  {
    id: "website-disclosures",
    title: "Website disclosure completeness",
    regulator: "BSE",
    source: "Exchange disclosure checklist",
    frequency: "event_based",
    severity: "medium",
    dueWindowDays: 7,
    description: "Statutory disclosures on the company website must stay current — policies, board composition, committee details, and contact information."
  },
  {
    id: "material-events",
    title: "Material event and promoter disclosures",
    regulator: "NSE",
    source: "SEBI LODR Reg. 29 / 30",
    frequency: "event_based",
    severity: "critical",
    dueWindowDays: 1,
    description: "Market-moving events, promoter transactions, and board decisions must be disclosed without delay to exchanges."
  }
];

// ─── Flagship: Kiran Precision Industries Limited ──────────────────────────
// NSE: KIRANPREC · Auto Ancillaries · ~₹1,450 crore market cap
// Status: Near Breach — credible compliance stress picture for partner demo

export const flagshipCompany: CompanySnapshot = {
  id: "kiran-precision",
  name: "Kiran Precision Industries Ltd.",
  symbol: "KIRANPREC",
  sector: "Auto Ancillaries",
  marketCapBucket: "Small Cap · NSE · ~₹1,450 Cr",
  lastUpdated: "2026-04-03",
  signals: {
    repeatedDelays: 2,
    manualOverrides: 2,
    disclosureQuality: 64,
    marketStressSignals: 35,
    abnormalVolumeDays: 2,
    bulkBlockDealCount: 1
  },
  documents: [
    {
      id: "doc-1",
      name: "Q3 FY26 Financial Results.pdf",
      documentType: "Quarterly results",
      reportingPeriod: "Q3 FY26",
      status: "processed",
      extractedFields: 22
    },
    {
      id: "doc-2",
      name: "Shareholding Pattern Q3 FY26.xlsx",
      documentType: "Shareholding pattern",
      reportingPeriod: "Q3 FY26",
      status: "review",
      extractedFields: 14
    },
    {
      id: "doc-3",
      name: "Corporate Governance Report.pdf",
      documentType: "Governance report",
      reportingPeriod: "Q3 FY26",
      status: "review",
      extractedFields: 18
    },
    {
      id: "doc-4",
      name: "Investor Complaints Statement.pdf",
      documentType: "Investor complaints",
      reportingPeriod: "Q3 FY26",
      status: "processed",
      extractedFields: 9
    },
    {
      id: "doc-5",
      name: "Board Meeting Outcome Oct 2025.pdf",
      documentType: "Board outcome",
      reportingPeriod: "Q3 FY26",
      status: "review",
      extractedFields: 11
    },
    {
      id: "doc-6",
      name: "Website Disclosure Evidence.zip",
      documentType: "Website evidence",
      reportingPeriod: "Current",
      status: "missing",
      extractedFields: 0
    }
  ],
  snapshots: [
    {
      ruleId: "fin-results",
      status: "met",
      daysToDeadline: 18,
      evidencePresent: true,
      note: "Q3 results filed with board outcome. Audit committee sign-off obtained. Exchange acknowledgement received."
    },
    {
      ruleId: "shareholding",
      status: "due_soon",
      daysToDeadline: 4,
      evidencePresent: false,
      note: "Pattern drafted but exchange upload not yet initiated. Promoter pledge status correction still pending from registrar."
    },
    {
      ruleId: "corp-gov",
      status: "delayed",
      daysToDeadline: -5,
      evidencePresent: true,
      note: "One independent director term expired in January. Committee recomposition not yet completed or disclosed. Governance report filed but flagged."
    },
    {
      ruleId: "investor-complaints",
      status: "unverified",
      daysToDeadline: 6,
      evidencePresent: false,
      note: "3 complaints show as pending in SEBI SCORES. Registrar follow-up initiated but reconciliation not yet confirmed."
    },
    {
      ruleId: "annual-report",
      status: "due_soon",
      daysToDeadline: 14,
      evidencePresent: false,
      note: "Annual report draft is with the audit committee. Director sign-offs and CSR annexure not yet received."
    },
    {
      ruleId: "website-disclosures",
      status: "missing",
      daysToDeadline: -8,
      evidencePresent: false,
      note: "ESG policy link is broken. Board composition page not updated since FY25. Vigil mechanism policy missing from website."
    },
    {
      ruleId: "material-events",
      status: "unverified",
      daysToDeadline: 0,
      evidencePresent: false,
      note: "Promoter inter-se transfer of ~1.2% equity not yet formally disclosed. Exchange query expected if not resolved in 24 hours."
    }
  ]
};

// ─── Peers ─────────────────────────────────────────────────────────────────

export const peerCompanies: CompanySnapshot[] = [
  {
    // Healthier peer — Watchlist, well-run but one slip
    id: "bharat-auto-components",
    name: "Bharat Auto Components Ltd.",
    symbol: "BHARATAUTO",
    sector: "Auto Ancillaries",
    marketCapBucket: "Small Cap · NSE · ~₹1,820 Cr",
    lastUpdated: "2026-04-03",
    signals: {
      repeatedDelays: 0,
      manualOverrides: 0,
      disclosureQuality: 88,
      marketStressSignals: 12,
      abnormalVolumeDays: 0,
      bulkBlockDealCount: 0
    },
    documents: [],
    snapshots: [
      {
        ruleId: "fin-results",
        status: "met",
        daysToDeadline: 22,
        evidencePresent: true,
        note: "Results filed on time. No board outcome gaps."
      },
      {
        ruleId: "shareholding",
        status: "met",
        daysToDeadline: 12,
        evidencePresent: true,
        note: "Pattern filed and exchange-acknowledged. Promoter holding unchanged."
      },
      {
        ruleId: "corp-gov",
        status: "due_soon",
        daysToDeadline: 5,
        evidencePresent: true,
        note: "Governance report drafted. Minor committee composition update required before submission."
      },
      {
        ruleId: "investor-complaints",
        status: "met",
        daysToDeadline: 14,
        evidencePresent: true,
        note: "Zero pending complaints. SCORES reconciliation clean."
      },
      {
        ruleId: "annual-report",
        status: "met",
        daysToDeadline: 38,
        evidencePresent: true,
        note: "Annual report finalised. AGM notice in draft."
      },
      {
        ruleId: "website-disclosures",
        status: "met",
        daysToDeadline: 9,
        evidencePresent: true,
        note: "Website policies current. Board composition updated after last AGM."
      },
      {
        ruleId: "material-events",
        status: "met",
        daysToDeadline: 1,
        evidencePresent: true,
        note: "No pending material disclosures in current review window."
      }
    ]
  },
  {
    // Distressed peer — Critical, deteriorating compliance
    id: "vega-precision-tech",
    name: "Vega Precision Tech Ltd.",
    symbol: "VEGAPREC",
    sector: "Auto Components",
    marketCapBucket: "Micro Cap · NSE · ~₹340 Cr",
    lastUpdated: "2026-04-03",
    signals: {
      repeatedDelays: 5,
      manualOverrides: 4,
      disclosureQuality: 31,
      marketStressSignals: 79,
      abnormalVolumeDays: 7,
      bulkBlockDealCount: 5
    },
    documents: [],
    snapshots: [
      {
        ruleId: "fin-results",
        status: "missing",
        daysToDeadline: -14,
        evidencePresent: false,
        note: "Q3 results not yet filed. Board meeting not yet held. Exchange has sent a query letter."
      },
      {
        ruleId: "shareholding",
        status: "missing",
        daysToDeadline: -9,
        evidencePresent: false,
        note: "No exchange-acknowledged filing found for Q3. Promoter pledging data is unverified."
      },
      {
        ruleId: "corp-gov",
        status: "delayed",
        daysToDeadline: -6,
        evidencePresent: false,
        note: "Report not filed. Two independent director positions remain vacant for over 90 days."
      },
      {
        ruleId: "investor-complaints",
        status: "delayed",
        daysToDeadline: -4,
        evidencePresent: false,
        note: "11 complaints marked pending. No registrar response in last 30 days."
      },
      {
        ruleId: "annual-report",
        status: "missing",
        daysToDeadline: -22,
        evidencePresent: false,
        note: "Annual report not issued. AGM overdue. Statutory audit not yet signed off."
      },
      {
        ruleId: "website-disclosures",
        status: "missing",
        daysToDeadline: -18,
        evidencePresent: false,
        note: "Multiple statutory pages missing or returning 404. Board page last updated FY23."
      },
      {
        ruleId: "material-events",
        status: "missing",
        daysToDeadline: -3,
        evidencePresent: false,
        note: "Multiple bulk deal events in last 14 days with no corresponding exchange disclosure. Pattern is anomalous."
      }
    ]
  }
];
