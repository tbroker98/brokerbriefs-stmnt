import { TradingAgentProfile } from "./trading-agent";

export type MarketRegime = "trend_up" | "trend_down" | "range" | "breakout" | "high_volatility";
export type StrategyArchetype = "momentum_breakout" | "mean_reversion" | "event_convexity";
export type OptionExpiryBucket = "same_day" | "same_week" | "next_week" | "monthly";
export type StrikePosture = "near_atm" | "slightly_otm" | "aggressive_otm";

export type SignalCandidate = {
  symbol: string;
  underlying: "nifty" | "banknifty" | "stock";
  side: "long_call" | "long_put";
  regime: MarketRegime;
  breakoutStrength: number;
  meanReversionStrength: number;
  trendStrength: number;
  liquidityScore: number;
  eventScore: number;
  newsScore: number;
  volatilityScore: number;
  expectedMovePct: number;
  premiumDecayRisk: number;
  hoursToExpiry: number;
  isExpiryDay: boolean;
};

export type ScoredSignal = SignalCandidate & {
  chosenArchetype: StrategyArchetype;
  chosenExpiry: OptionExpiryBucket;
  strikePosture: StrikePosture;
  conviction: number;
  explanation: string[];
};

function clamp(value: number, floor = 0, ceiling = 100) {
  return Math.min(ceiling, Math.max(floor, value));
}

function preferredArchetypes(profile: TradingAgentProfile, regime: MarketRegime): StrategyArchetype[] {
  if (profile.runtime.strategyBlend === "momentum_breakout") {
    return ["momentum_breakout", "event_convexity"];
  }

  if (profile.runtime.strategyBlend === "mean_reversion") {
    return ["mean_reversion", "event_convexity"];
  }

  if (regime === "trend_up" || regime === "breakout") {
    return ["momentum_breakout", "event_convexity", "mean_reversion"];
  }

  if (regime === "range") {
    return ["mean_reversion", "momentum_breakout", "event_convexity"];
  }

  return ["event_convexity", "momentum_breakout", "mean_reversion"];
}

function scoreArchetype(candidate: SignalCandidate, archetype: StrategyArchetype) {
  if (archetype === "momentum_breakout") {
    return (
      candidate.breakoutStrength * 0.4 +
      candidate.trendStrength * 0.25 +
      candidate.liquidityScore * 0.15 +
      candidate.newsScore * 0.1 +
      candidate.expectedMovePct * 8
    );
  }

  if (archetype === "mean_reversion") {
    return (
      candidate.meanReversionStrength * 0.45 +
      candidate.liquidityScore * 0.2 +
      (100 - candidate.volatilityScore) * 0.15 +
      candidate.newsScore * 0.05 +
      candidate.expectedMovePct * 6
    );
  }

  return (
    candidate.eventScore * 0.4 +
    candidate.volatilityScore * 0.2 +
    candidate.liquidityScore * 0.15 +
    candidate.newsScore * 0.1 +
    candidate.expectedMovePct * 10 -
    candidate.premiumDecayRisk * 0.15
  );
}

export function chooseExpiryBucket(profile: TradingAgentProfile, candidate: SignalCandidate): OptionExpiryBucket {
  if (profile.runtime.expirySelection === "same_week") {
    return candidate.isExpiryDay ? "same_day" : "same_week";
  }

  if (profile.runtime.expirySelection === "next_expiry") {
    return candidate.hoursToExpiry < 24 ? "next_week" : "monthly";
  }

  const wantsConvexity = profile.runtime.allowExpiryDayConvexityTrades && candidate.isExpiryDay;
  const strongEventEdge =
    candidate.eventScore >= 70 && candidate.expectedMovePct >= 0.8 && candidate.premiumDecayRisk <= 55;
  const cleanIntradayBreakout =
    candidate.breakoutStrength >= 75 && candidate.trendStrength >= 70 && candidate.hoursToExpiry <= 8;

  if (wantsConvexity && (strongEventEdge || cleanIntradayBreakout)) {
    return "same_day";
  }

  if (candidate.hoursToExpiry <= 36) {
    return candidate.expectedMovePct >= 1.25 ? "same_week" : "next_week";
  }

  if (candidate.expectedMovePct >= 2.5 || candidate.regime === "trend_up" || candidate.regime === "trend_down") {
    return "next_week";
  }

  return "monthly";
}

export function chooseStrikePosture(profile: TradingAgentProfile, candidate: SignalCandidate): StrikePosture {
  const aggressiveExpiryDaySetup =
    profile.runtime.optionAggression === "expiry_day_rocket_bias" &&
    candidate.isExpiryDay &&
    candidate.eventScore >= 75 &&
    candidate.expectedMovePct >= 1 &&
    candidate.premiumDecayRisk <= 50;

  if (aggressiveExpiryDaySetup) {
    return "aggressive_otm";
  }

  if (profile.runtime.optionAggression === "show_both" && candidate.expectedMovePct >= 1.5) {
    return "slightly_otm";
  }

  if (candidate.volatilityScore >= 75 || candidate.premiumDecayRisk >= 70) {
    return "near_atm";
  }

  return "slightly_otm";
}

export function scoreSignal(profile: TradingAgentProfile, candidate: SignalCandidate): ScoredSignal {
  const archetypes = preferredArchetypes(profile, candidate.regime);
  const archetypeScores = archetypes.map((archetype) => ({
    archetype,
    score: scoreArchetype(candidate, archetype)
  }));
  const best = archetypeScores.sort((left, right) => right.score - left.score)[0];
  const chosenExpiry = chooseExpiryBucket(profile, candidate);
  const strikePosture = chooseStrikePosture(profile, candidate);

  let conviction =
    best.score * 0.55 +
    candidate.liquidityScore * 0.1 +
    candidate.newsScore * 0.08 +
    candidate.eventScore * 0.07 +
    candidate.trendStrength * 0.08;

  if (candidate.underlying !== "stock" && profile.runtime.underlyingPriority === "both") {
    conviction += 4;
  }

  if (candidate.underlying === "nifty" || candidate.underlying === "banknifty") {
    conviction += 3;
  }

  if (chosenExpiry === "same_day") {
    conviction += candidate.isExpiryDay ? 6 : -4;
    conviction -= candidate.premiumDecayRisk * 0.08;
  }

  if (strikePosture === "aggressive_otm") {
    conviction += 3;
  }

  conviction = clamp(conviction);

  const explanation = [
    `Primary archetype: ${best.archetype}.`,
    `Chosen expiry bucket: ${chosenExpiry}.`,
    `Strike posture: ${strikePosture}.`,
    `Regime: ${candidate.regime} with breakout ${candidate.breakoutStrength}/100 and mean reversion ${candidate.meanReversionStrength}/100.`,
    `Event/news composite: ${Math.round((candidate.eventScore + candidate.newsScore) / 2)}/100.`,
    `Premium decay risk: ${candidate.premiumDecayRisk}/100.`
  ];

  if (candidate.isExpiryDay && chosenExpiry === "same_day") {
    explanation.push("Expiry-day convexity was allowed because the setup passed the higher-conviction filter.");
  }

  if (strikePosture === "aggressive_otm") {
    explanation.push("Aggressive OTM posture was selected because the expiry-day setup had unusually strong convexity potential.");
  }

  return {
    ...candidate,
    chosenArchetype: best.archetype,
    chosenExpiry,
    strikePosture,
    conviction,
    explanation
  };
}

export function rankSignals(profile: TradingAgentProfile, candidates: SignalCandidate[]) {
  return candidates.map((candidate) => scoreSignal(profile, candidate)).sort((left, right) => right.conviction - left.conviction);
}
