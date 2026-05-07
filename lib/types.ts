export type RuleSeverity = "low" | "medium" | "high" | "critical";
export type RuleStatus = "met" | "due_soon" | "delayed" | "missing" | "unverified";

export type ComplianceRule = {
  id: string;
  title: string;
  regulator: "SEBI" | "BSE" | "NSE";
  source: string;
  frequency: "quarterly" | "half_yearly" | "yearly" | "event_based";
  severity: RuleSeverity;
  dueWindowDays: number;
  description: string;
};

export type CompanyRuleSnapshot = {
  ruleId: string;
  status: RuleStatus;
  daysToDeadline: number;
  evidencePresent: boolean;
  note: string;
};

export type CompanySnapshot = {
  id: string;
  name: string;
  symbol: string;
  sector: string;
  marketCapBucket: string;
  lastUpdated: string;
  signals: {
    repeatedDelays: number;
    manualOverrides: number;
    disclosureQuality: number;
    marketStressSignals: number;
    abnormalVolumeDays: number;
    bulkBlockDealCount: number;
  };
  documents: CompanyDocument[];
  snapshots: CompanyRuleSnapshot[];
};

export type AssessmentInput = {
  companyName: string;
  sector: string;
  marketCapBucket: string;
  repeatedDelays: number;
  manualOverrides: number;
  disclosureQuality: number;
  marketStressSignals: number;
  abnormalVolumeDays: number;
  bulkBlockDealCount: number;
  criticalMissing: number;
  highDelayed: number;
  dueSoonCritical: number;
  notes: string;
};

export type CompanyDocument = {
  id: string;
  name: string;
  documentType: string;
  reportingPeriod: string;
  status: "processed" | "review" | "missing";
  extractedFields: number;
};

export type Alert = {
  title: string;
  body: string;
  level: "watch" | "risk";
};

export type RecommendedAction = {
  title: string;
  owner: string;
  priority: "medium" | "high" | "critical";
  impact: string;
};

export type CompanyAssessment = {
  companyName: string;
  status: "Healthy" | "Watchlist" | "Near Breach" | "Critical";
  deterministicScore: number;
  operationalScore: number;
  surveillanceScore: number;
  totalRules: number;
  criticalIssues: number;
  highRiskIssues: number;
  summary: string;
  alerts: Alert[];
  actions: RecommendedAction[];
  riskDrivers: string[];
};
