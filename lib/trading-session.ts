import { ScoredSignal } from "./trading-strategy";
import { TradingAgentProfile } from "./trading-agent";

export type SessionContext = {
  minutesFromOpen: number;
  isExpiryDay: boolean;
  strongMarketBreadth: boolean;
  regimeAlignmentScore: number;
  newsShockScore: number;
  marketTexture: "supportive" | "neutral" | "choppy";
  consecutiveLosses: number;
};

export type SessionDecision = {
  actionable: boolean;
  priority: "normal" | "high";
  reasons: string[];
};

function isExceptionalOpenSetup(signal: ScoredSignal, context: SessionContext) {
  return (
    signal.conviction >= 82 &&
    signal.liquidityScore >= 75 &&
    context.regimeAlignmentScore >= 70 &&
    (signal.eventScore >= 65 || signal.breakoutStrength >= 80 || context.newsShockScore >= 70)
  );
}

function passesAdaptiveExpiryFilter(signal: ScoredSignal, context: SessionContext) {
  if (!context.isExpiryDay) {
    return true;
  }

  if (signal.chosenExpiry !== "same_day") {
    return signal.conviction >= 68;
  }

  const breadthBoost = context.strongMarketBreadth ? 5 : 0;
  return signal.conviction + breadthBoost >= 80 && signal.premiumDecayRisk <= 60;
}

export function evaluateSessionPolicy(
  profile: TradingAgentProfile,
  signal: ScoredSignal,
  context: SessionContext
): SessionDecision {
  const reasons: string[] = [];

  if (
    profile.runtime.phaseOneInstrumentScope === "index_options_only" &&
    signal.underlying === "stock"
  ) {
    reasons.push("Phase 1 scope is restricted to index options.");
  }

  if (
    profile.runtime.openingRangePolicy === "avoid_unless_exceptional" &&
    context.minutesFromOpen < profile.runtime.openingRangeMinutes &&
    !isExceptionalOpenSetup(signal, context)
  ) {
    reasons.push(
      `Opening-range filter blocks routine trades in the first ${profile.runtime.openingRangeMinutes} minutes.`
    );
  }

  if (context.isExpiryDay && !passesAdaptiveExpiryFilter(signal, context)) {
    reasons.push("Expiry-day filter rejected the setup because convexity/decay quality is not strong enough.");
  }

  if (
    profile.runtime.choppyMarketPolicy === "stay_out" &&
    context.marketTexture === "choppy"
  ) {
    reasons.push("Choppy market filter rejected the setup.");
  }

  if (
    profile.runtime.lossStreakThrottle.enabled &&
    context.consecutiveLosses >= profile.runtime.lossStreakThrottle.threshold &&
    signal.conviction < 90
  ) {
    reasons.push("Loss-streak throttle only allows exceptional setups until the bot regains footing.");
  }

  const priority =
    signal.conviction >= 85 || (context.isExpiryDay && signal.chosenExpiry === "same_day")
      ? "high"
      : "normal";

  return {
    actionable: reasons.length === 0,
    priority,
    reasons
  };
}
