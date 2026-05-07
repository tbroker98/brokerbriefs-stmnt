export type BrokerName = "dhan" | "zerodha";
export type TradingMode = "signals_only" | "assisted_execution" | "auto_execution";
export type StrategyStyle = "intraday" | "swing" | "hybrid";
export type DirectionBias = "long_only" | "long_preferred" | "long_short";
export type DerivativeScope = "none" | "options_only" | "futures_only" | "options_and_futures";
export type UnderlyingScope = "indices_only" | "stocks_only" | "indices_and_stocks";
export type NewsMode = "market_data_only" | "market_data_plus_events" | "market_data_plus_news";
export type AlertChannel = "dashboard" | "whatsapp" | "email";
export type ReviewGate = "none" | "shorts_only" | "all_live_orders";
export type StrategyBlend = "momentum_breakout" | "mean_reversion" | "blend";
export type UnderlyingPriority = "nifty" | "banknifty" | "both";
export type ExpirySelectionMode = "same_week" | "next_expiry" | "dynamic";
export type SetupSelectivity = "elite_only" | "elite_with_select_b_plus" | "broad";
export type OptionAggression = "safer_default" | "show_both" | "expiry_day_rocket_bias";
export type ExitDiscipline = "strict" | "flexible" | "strict_with_flexible_override";
export type AveragingPolicy = "banned" | "rare_mean_reversion_only" | "allowed";
export type EvaluationMetric =
  | "profitability"
  | "max_drawdown"
  | "win_rate"
  | "expectancy"
  | "sharpe";

export type RiskBudget = {
  startingCapitalInr: number;
  hardMaxDrawdownPct: number;
  dailyStopPct: number;
  weeklyStopPct: number;
  userSuggestedMaxRiskPerTradePct: number;
  operatingMaxRiskPerTradePct: number;
  maxCapitalAtWorkPct: number;
  maxOpenSignals: number;
};

export type ExitWindow = {
  minimumHoldSeconds: number;
  softTargetHoldHours: number;
  hardReviewAfterHours: number;
};

export type StrategyRuntime = {
  intradayWindow: ExitWindow;
  swingWindow: {
    softTargetHoldDays: number;
    hardReviewAfterDays: number;
  };
  exitPolicy: "model_driven" | "timeboxed" | "hybrid";
  exitDiscipline: ExitDiscipline;
  strategyBlend: StrategyBlend;
  underlyingPriority: UnderlyingPriority;
  expirySelection: ExpirySelectionMode;
  setupSelectivity: SetupSelectivity;
  optionAggression: OptionAggression;
  allowExpiryDayConvexityTrades: boolean;
  openingRangePolicy: "avoid_unless_exceptional" | "trade_freely";
  openingRangeMinutes: number;
  expiryDayActivity: "elite_only" | "adaptive";
  phaseOneInstrumentScope: "index_options_only" | "index_and_stock_options";
  eventFilters: string[];
  optionStructure: "directional_buys_only" | "directional_buys_and_debit_spreads";
  newsIntegrationMode: "defer_if_complex" | "from_day_one";
  swingExitStyle: "simple_first" | "partial_profits";
  lossStreakThrottle: {
    enabled: boolean;
    threshold: number;
    reducedRiskPct: number;
  };
  choppyMarketPolicy: "stay_out" | "reduce_size" | "normal";
  advisoryMode: "signals_user_decides" | "signals_with_default_recommendation";
  averagingPolicy: AveragingPolicy;
};

export type TradingAgentProfile = {
  name: string;
  brokerPrimary: BrokerName;
  brokerBackup?: BrokerName;
  mode: TradingMode;
  style: StrategyStyle;
  directionBias: DirectionBias;
  derivativeScope: DerivativeScope;
  underlyingScope: UnderlyingScope;
  optionsSellingAllowed: boolean;
  futuresAllowed: boolean;
  overnightAllowed: boolean;
  weekendAllowed: boolean;
  universe: string;
  indexOptionsFirst: boolean;
  signalInputs: NewsMode;
  alertChannels: AlertChannel[];
  whatsappOptional: boolean;
  reviewGate: ReviewGate;
  rolloutEnvironment: "laptop" | "vps" | "cloud";
  externalNewsOptional: boolean;
  evaluationGate: EvaluationMetric[];
  risk: RiskBudget;
  runtime: StrategyRuntime;
  notes: string[];
};

export const seedTradingAgentProfile: TradingAgentProfile = {
  name: "Superior Quant Agent Seed",
  brokerPrimary: "dhan",
  brokerBackup: "zerodha",
  mode: "signals_only",
  style: "hybrid",
  directionBias: "long_preferred",
  derivativeScope: "options_only",
  underlyingScope: "indices_and_stocks",
  optionsSellingAllowed: false,
  futuresAllowed: false,
  overnightAllowed: true,
  weekendAllowed: true,
  universe: "Nifty 500, narrowed dynamically by liquidity, regime, and signal quality",
  indexOptionsFirst: true,
  signalInputs: "market_data_plus_news",
  alertChannels: ["dashboard", "whatsapp"],
  whatsappOptional: true,
  reviewGate: "shorts_only",
  rolloutEnvironment: "laptop",
  externalNewsOptional: true,
  evaluationGate: ["profitability", "max_drawdown", "win_rate", "expectancy", "sharpe"],
  risk: {
    startingCapitalInr: 10_000,
    hardMaxDrawdownPct: 60,
    dailyStopPct: 25,
    weeklyStopPct: 50,
    userSuggestedMaxRiskPerTradePct: 15,
    operatingMaxRiskPerTradePct: 3,
    maxCapitalAtWorkPct: 30,
    maxOpenSignals: 3
  },
  runtime: {
    intradayWindow: {
      minimumHoldSeconds: 10,
      softTargetHoldHours: 3,
      hardReviewAfterHours: 6
    },
    swingWindow: {
      softTargetHoldDays: 10,
      hardReviewAfterDays: 20
    },
    exitPolicy: "model_driven",
    exitDiscipline: "strict_with_flexible_override",
    strategyBlend: "blend",
    underlyingPriority: "both",
    expirySelection: "dynamic",
    setupSelectivity: "elite_with_select_b_plus",
    optionAggression: "expiry_day_rocket_bias",
    allowExpiryDayConvexityTrades: true,
    openingRangePolicy: "avoid_unless_exceptional",
    openingRangeMinutes: 15,
    expiryDayActivity: "adaptive",
    phaseOneInstrumentScope: "index_options_only",
    eventFilters: ["RBI policy", "Fed decision", "Union budget", "major earnings", "expiry volatility spike"],
    optionStructure: "directional_buys_only",
    newsIntegrationMode: "defer_if_complex",
    swingExitStyle: "simple_first",
    lossStreakThrottle: {
      enabled: true,
      threshold: 3,
      reducedRiskPct: 1
    },
    choppyMarketPolicy: "stay_out",
    advisoryMode: "signals_user_decides",
    averagingPolicy: "rare_mean_reversion_only"
  },
  notes: [
    "Signals come first. Live automation is earned only after strong forward performance.",
    "Short-side ideas can exist, but they require manual review before they are actionable.",
    "No option selling or futures in the first release.",
    "Internal soft limits should be tighter than user hard-stop boundaries.",
    "A 15% per-trade loss tolerance is treated as user appetite input, not as the bot's operating default."
  ]
};
