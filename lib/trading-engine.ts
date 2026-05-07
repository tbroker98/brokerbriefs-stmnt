import { TradingAgentProfile } from "./trading-agent";

export type TradingState = {
  capitalInr: number;
  dailyPnlPct: number;
  weeklyPnlPct: number;
  openSignalCount: number;
  capitalAtWorkPct: number;
  consecutiveLosses: number;
  regimeState?: "supportive" | "neutral" | "choppy";
};

export type RiskDecision = {
  canOpenNewSignal: boolean;
  reasons: string[];
  maxNewRiskPct: number;
};

export function shouldStopTrading(profile: TradingAgentProfile, state: TradingState) {
  const reasons: string[] = [];

  if (state.dailyPnlPct <= -profile.risk.dailyStopPct) {
    reasons.push(`Daily stop hit at ${state.dailyPnlPct}%`);
  }

  if (state.weeklyPnlPct <= -profile.risk.weeklyStopPct) {
    reasons.push(`Weekly stop hit at ${state.weeklyPnlPct}%`);
  }

  if (state.openSignalCount >= profile.risk.maxOpenSignals) {
    reasons.push(`Open signal limit reached: ${state.openSignalCount}`);
  }

  if (state.capitalAtWorkPct >= profile.risk.maxCapitalAtWorkPct) {
    reasons.push(`Capital-at-work limit reached: ${state.capitalAtWorkPct}%`);
  }

  if (
    profile.runtime.choppyMarketPolicy === "stay_out" &&
    state.regimeState === "choppy"
  ) {
    reasons.push("Market regime is choppy, so fresh trades are blocked by policy.");
  }

  return {
    stopTrading: reasons.length > 0,
    reasons
  };
}

export function getRiskDecision(profile: TradingAgentProfile, state: TradingState): RiskDecision {
  const stopCheck = shouldStopTrading(profile, state);

  if (stopCheck.stopTrading) {
    return {
      canOpenNewSignal: false,
      reasons: stopCheck.reasons,
      maxNewRiskPct: 0
    };
  }

  const remainingCapitalBudget = Math.max(0, profile.risk.maxCapitalAtWorkPct - state.capitalAtWorkPct);
  let maxNewRiskPct = Math.min(profile.risk.operatingMaxRiskPerTradePct, remainingCapitalBudget);

  if (
    profile.runtime.lossStreakThrottle.enabled &&
    state.consecutiveLosses >= profile.runtime.lossStreakThrottle.threshold
  ) {
    maxNewRiskPct = Math.min(maxNewRiskPct, profile.runtime.lossStreakThrottle.reducedRiskPct);
  }

  if (maxNewRiskPct <= 0) {
    return {
      canOpenNewSignal: false,
      reasons: ["No residual operating risk budget available."],
      maxNewRiskPct: 0
    };
  }

  return {
    canOpenNewSignal: true,
    reasons: [],
    maxNewRiskPct
  };
}

export function summarizeExitPolicy(profile: TradingAgentProfile) {
  const {
    intradayWindow,
    swingWindow,
    eventFilters,
    exitPolicy,
    optionStructure,
    exitDiscipline,
    advisoryMode,
    averagingPolicy
  } = profile.runtime;

  return [
    `Exit policy: ${exitPolicy} (${exitDiscipline}).`,
    `Intraday ideas can exit after ${intradayWindow.minimumHoldSeconds}s and are softly reviewed around ${intradayWindow.softTargetHoldHours}h.`,
    `Swing ideas are softly reviewed around ${swingWindow.softTargetHoldDays} trading days.`,
    `Phase-1 option structure: ${optionStructure}.`,
    `Signal mode: ${advisoryMode}.`,
    `Averaging policy: ${averagingPolicy}.`,
    `Default event filters: ${eventFilters.join(", ")}.`
  ];
}
