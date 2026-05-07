import {
  AssessmentInput,
  Alert,
  CompanyAssessment,
  CompanySnapshot,
  ComplianceRule,
  RecommendedAction,
  RuleStatus
} from "./types";

const statusPenalty: Record<RuleStatus, number> = {
  met: 0,
  due_soon: 0.35,
  delayed: 0.75,
  missing: 1,
  unverified: 0.5
};

const severityWeight = {
  low: 1,
  medium: 1.5,
  high: 2.5,
  critical: 4
};

const priorityOwner = {
  finResults: "CFO + Company Secretary",
  governance: "Company Secretary",
  website: "Compliance Team",
  complaints: "Investor Relations",
  annual: "Board Secretariat"
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

export function assessCompany(
  company: CompanySnapshot,
  rules: ComplianceRule[]
): CompanyAssessment {
  const joined = rules.map((rule) => {
    const snapshot = company.snapshots.find((item) => item.ruleId === rule.id);

    return {
      rule,
      snapshot
    };
  });

  const maxWeight = joined.reduce((sum, item) => sum + severityWeight[item.rule.severity], 0);
  const penalty = joined.reduce((sum, item) => {
    if (!item.snapshot) {
      return sum + severityWeight[item.rule.severity];
    }

    const weight = severityWeight[item.rule.severity];
    const evidencePenalty = item.snapshot.evidencePresent ? 0 : 0.2;
    return sum + weight * Math.min(1, statusPenalty[item.snapshot.status] + evidencePenalty);
  }, 0);

  const deterministicScore = round(100 - (penalty / maxWeight) * 100);
  const operationalScore = round(
    100 -
      (company.signals.repeatedDelays * 9 +
        company.signals.manualOverrides * 5 +
        (100 - company.signals.disclosureQuality) * 0.35)
  );
  const surveillanceScore = round(
    100 -
      (company.signals.marketStressSignals * 0.65 +
        company.signals.abnormalVolumeDays * 3 +
        company.signals.bulkBlockDealCount * 4 +
        company.signals.repeatedDelays * 6 +
        criticalIssueCount(joined) * 8)
  );

  const criticalIssues = joined.filter(
    (item) =>
      item.rule.severity === "critical" &&
      item.snapshot &&
      ["delayed", "missing", "unverified"].includes(item.snapshot.status)
  ).length;
  const highRiskIssues = joined.filter(
    (item) =>
      ["high", "critical"].includes(item.rule.severity) &&
      item.snapshot &&
      ["due_soon", "delayed", "missing", "unverified"].includes(item.snapshot.status)
  ).length;

  const alerts = buildAlerts(joined);
  const actions = buildActions(joined);
  const riskDrivers = buildRiskDrivers(
    company.signals.abnormalVolumeDays,
    company.signals.bulkBlockDealCount,
    company.signals.marketStressSignals
  );

  const status =
    criticalIssues >= 2 || deterministicScore < 45 || surveillanceScore < 40
      ? "Critical"
      : criticalIssues >= 1 || highRiskIssues >= 3 || deterministicScore < 65
        ? "Near Breach"
        : highRiskIssues >= 1 || deterministicScore < 82
          ? "Watchlist"
          : "Healthy";

  return {
    companyName: company.name,
    status,
    deterministicScore: clamp(deterministicScore, 0, 100),
    operationalScore: clamp(operationalScore, 0, 100),
    surveillanceScore: clamp(surveillanceScore, 0, 100),
    totalRules: rules.length,
    criticalIssues,
    highRiskIssues,
    summary: buildSummary(status, company.name, alerts.length, criticalIssues, highRiskIssues),
    alerts,
    actions,
    riskDrivers
  };
}

function criticalIssueCount(
  joined: { rule: ComplianceRule; snapshot: CompanySnapshot["snapshots"][number] | undefined }[]
) {
  return joined.filter(
    (item) =>
      item.rule.severity === "critical" &&
      item.snapshot &&
      ["delayed", "missing", "unverified"].includes(item.snapshot.status)
  ).length;
}

function buildAlerts(
  joined: { rule: ComplianceRule; snapshot: CompanySnapshot["snapshots"][number] | undefined }[]
): Alert[] {
  return joined
    .filter(
      (item) =>
        item.snapshot &&
        ["due_soon", "delayed", "missing", "unverified"].includes(item.snapshot.status)
    )
    .slice(0, 4)
    .map((item) => ({
      title: item.rule.title,
      level:
        item.rule.severity === "critical" || item.snapshot?.status === "missing" ? "risk" : "watch",
      body: `${item.snapshot?.note} Severity: ${item.rule.severity}. Source: ${item.rule.source}.`
    }));
}

function buildActions(
  joined: { rule: ComplianceRule; snapshot: CompanySnapshot["snapshots"][number] | undefined }[]
): RecommendedAction[] {
  const actions: RecommendedAction[] = joined
    .filter(
      (item) =>
        item.snapshot &&
        ["due_soon", "delayed", "missing", "unverified"].includes(item.snapshot.status)
    )
    .map((item) => ({
      title: `Resolve ${item.rule.title.toLowerCase()}`,
      owner: inferOwner(item.rule.id),
      priority:
        item.rule.severity === "critical"
          ? "critical"
          : item.rule.severity === "high"
            ? "high"
            : "medium",
      impact: `${item.snapshot?.status.replace("_", " ")} status is depressing the compliance score and raising review risk.`
    }));

  return actions.slice(0, 5);
}

function inferOwner(ruleId: string) {
  switch (ruleId) {
    case "fin-results":
      return priorityOwner.finResults;
    case "corp-gov":
    case "shareholding":
      return priorityOwner.governance;
    case "website-disclosures":
      return priorityOwner.website;
    case "investor-complaints":
      return priorityOwner.complaints;
    case "annual-report":
      return priorityOwner.annual;
    default:
      return "Compliance Officer";
  }
}

function buildSummary(
  status: CompanyAssessment["status"],
  companyName: string,
  alertCount: number,
  criticalIssues: number,
  highRiskIssues: number
) {
  if (status === "Critical") {
    return `${companyName} is at the brink of material compliance deterioration. ${criticalIssues} critical items and ${highRiskIssues} high-severity exposures need immediate closure.`;
  }

  if (status === "Near Breach") {
    return `${companyName} is close to non-compliance on key obligations. Fast remediation over the next few filing cycles can materially reduce risk.`;
  }

  if (status === "Watchlist") {
    return `${companyName} is broadly manageable, but ${alertCount} active watch items could turn into meaningful breaches if left open.`;
  }

  return `${companyName} is currently in a healthy compliance posture with only limited near-term watchpoints.`;
}

function buildRiskDrivers(
  abnormalVolumeDays: number,
  bulkBlockDealCount: number,
  marketStressSignals: number
) {
  const drivers: string[] = [];

  if (abnormalVolumeDays > 0) {
    drivers.push(`${abnormalVolumeDays} abnormal trading-volume day(s) recorded in the current window`);
  }

  if (bulkBlockDealCount > 0) {
    drivers.push(`${bulkBlockDealCount} bulk / block deal signal(s) need contextual review`);
  }

  if (marketStressSignals >= 60) {
    drivers.push("Market-stress conditions are elevated enough to justify a surveillance-style watchlist");
  } else if (marketStressSignals >= 35) {
    drivers.push("Market activity is not yet extreme, but it is active enough to monitor alongside compliance");
  }

  if (drivers.length === 0) {
    drivers.push("No material trading-activity flags detected in the current review window");
  }

  return drivers;
}

export function assessFromInput(input: AssessmentInput): CompanyAssessment {
  const criticalIssues = input.criticalMissing;
  const highRiskIssues = input.criticalMissing + input.highDelayed + input.dueSoonCritical;
  const deterministicScore = clamp(
    round(100 - input.criticalMissing * 22 - input.highDelayed * 12 - input.dueSoonCritical * 6),
    0,
    100
  );
  const operationalScore = clamp(
    round(
      100 -
        input.repeatedDelays * 8 -
        input.manualOverrides * 5 -
        (100 - input.disclosureQuality) * 0.4
    ),
    0,
    100
  );
  const surveillanceScore = clamp(
    round(
      100 -
        input.marketStressSignals * 0.7 -
        input.abnormalVolumeDays * 3 -
        input.bulkBlockDealCount * 4 -
        input.criticalMissing * 10 -
        input.highDelayed * 6 -
        input.repeatedDelays * 4
    ),
    0,
    100
  );

  const status =
    criticalIssues >= 2 || deterministicScore < 45 || surveillanceScore < 40
      ? "Critical"
      : criticalIssues >= 1 || highRiskIssues >= 3 || deterministicScore < 65
        ? "Near Breach"
        : highRiskIssues >= 1 || deterministicScore < 82
          ? "Watchlist"
          : "Healthy";

  const summary =
    status === "Critical"
      ? `${input.companyName} is very close to serious non-compliance. Immediate action is needed on critical filings and documentation quality.`
      : status === "Near Breach"
        ? `${input.companyName} has enough unresolved pressure points that it could slip into material non-compliance without quick action.`
        : status === "Watchlist"
          ? `${input.companyName} is still recoverable, but deadlines and evidence quality need tighter control.`
          : `${input.companyName} appears healthy on the current snapshot.`;

  const alerts = [
    input.criticalMissing > 0
      ? {
          title: "Critical obligations missing",
          body: `${input.criticalMissing} critical items appear unresolved. Missing high-value filings should be closed first.`,
          level: "risk" as const
        }
      : null,
    input.highDelayed > 0
      ? {
          title: "High-severity delays building up",
          body: `${input.highDelayed} high-severity items are delayed and could escalate quickly if exchange evidence is incomplete.`,
          level: "watch" as const
        }
      : null,
    input.dueSoonCritical > 0
      ? {
          title: "Critical deadlines close",
          body: `${input.dueSoonCritical} critical obligations are approaching due dates and need a pre-filing readiness check.`,
          level: "watch" as const
        }
      : null,
    input.notes
      ? {
          title: "Analyst note",
          body: input.notes,
          level: "watch" as const
        }
      : null
  ].filter(Boolean) as CompanyAssessment["alerts"];

  const actions: RecommendedAction[] = [
    {
      title: "Close all critical filings first",
      owner: "Company Secretary + CFO",
      priority: "critical",
      impact: "This has the fastest impact on deterministic compliance health."
    },
    {
      title: "Reconcile evidence pack and exchange acknowledgements",
      owner: "Compliance Team",
      priority: "high",
      impact: "Reduces unverified exposure and improves auditability."
    },
    {
      title: "Run a 30-day filing readiness calendar",
      owner: "Board Secretariat",
      priority: "high",
      impact: "Prevents near-term due soon items from becoming delays."
    }
  ];

  const riskDrivers = buildRiskDrivers(
    input.abnormalVolumeDays,
    input.bulkBlockDealCount,
    input.marketStressSignals
  );

  return {
    companyName: input.companyName,
    status,
    deterministicScore,
    operationalScore,
    surveillanceScore,
    totalRules: 6,
    criticalIssues,
    highRiskIssues,
    summary,
    alerts,
    actions,
    riskDrivers
  };
}
