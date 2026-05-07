const whereMoneyIsMade = [
  "Equity swings: about +₹8,158 since April 1, 2026.",
  "Best winners: NTPC Green +₹12,454, CMDI +₹7,289, Godawari +₹4,756, Lloyds +₹4,669, Dhanlaxmi +₹3,347.",
  "A few selective intraday hits: Shipping Corp +₹7,539 and Jio Financial +₹5,350.",
  "Index options when the move works fast: about +₹7,650 net in the analyzed April derivative book.",
  "Commodity only when the move is immediate and tactical: crude example winner about +₹3,776 in the derivative statement."
];

const whereMoneyIsLost = [
  "Intraday equity churn: about -₹6,431 since April 1, 2026.",
  "Biggest equity damage: Cochin Shipyard -₹9,520, One Mobikwik -₹8,998, Bombay Dyeing -₹7,955, Jaiprakash Power -₹4,984, EPack -₹4,656, Prime Focus -₹4,253.",
  "Index option losses came when continuation was forced and the trade did not work quickly.",
  "Commodity losses came when size and live management were not built for the violence of crude.",
  "You did not lose from no edge. You lost from giveback."
];

const profitableTraits = [
  "The move was real, not small noise.",
  "The stock or option had room to expand.",
  "The trade either worked quickly or had enough room to swing.",
  "Charges were too small to matter relative to the move.",
  "You were in strong names or clear momentum, not average setups.",
  "You were being paid for expansion, not for activity."
];

const losingTraits = [
  "Average setup, full emotional attention.",
  "Oversized fast instrument.",
  "Hope after entry instead of structure after entry.",
  "Caller stop plus your own discomfort stop mixed together.",
  "Trade did not work quickly, but you stayed involved anyway.",
  "No clear re-entry framework, so every bounce felt personal."
];

const reentryNeeded = [
  "Immediate reclaim: price breaks your level, snaps back above it fast, and holds.",
  "Slow reclaim: price bases after your stop-out, makes higher lows, then retakes the pivot.",
  "Retest after breakout: breakout happens, retests the zone, then turns again.",
  "In every valid re-entry, stop and size must be recalculated from scratch."
];

const reentryNotNeeded = [
  "You want back in because the move left without you.",
  "The candle is stretched and the stop would be fake.",
  "You cannot explain the new invalidation level in one sentence.",
  "You are trying to recover emotion, not trade a fresh edge."
];

const thresholds = [
  "Desk R for now: ₹1,500.",
  "Equity swing: 1R = ₹1,500.",
  "Intraday equity: 0.5R to 0.75R = ₹750 to ₹1,125.",
  "Index options: 0.5R max = ₹750.",
  "Commodity/crude: first entry 0.25R = ₹375. Only add another 0.25R after confirmation.",
  "Daily stop: 2R = ₹3,000. Weekly stop: 4R = ₹6,000.",
  "After two messy losses in a row, cut the next R in half."
];

const bottomLine = [
  "You make money from real movers.",
  "You lose money from forced activity.",
  "Equity: strongest in selective swings.",
  "F&O: strongest in fast tactical momentum.",
  "Commodity: dangerous when size gets emotional."
];

function Section({
  kicker,
  title,
  items,
  strong = false
}: {
  kicker: string;
  title: string;
  items: string[];
  strong?: boolean;
}) {
  return (
    <article className={`panel panel-pad${strong ? " panel-strong" : ""}`}>
      <div className="section-kicker">{kicker}</div>
      <h2 className="section-title">{title}</h2>
      <ul className="clean-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}

export function TradingRulebook() {
  return (
    <main className="page rulebook-page">
      <section className="hero rulebook-hero">
        <span className="eyebrow rulebook-eyebrow">Direct Read</span>
        <h1>Tanish, here is the point.</h1>
        <p>
          You make money from a few real expansion trades. You lose it back in churn, hope trades, oversized
          fast products, and weak post-entry ownership.
        </p>
      </section>

      <section className="hero-grid section-top-gap">
        <Section
          kicker="Where You Make Money"
          title="This is what actually pays you"
          items={whereMoneyIsMade}
          strong
        />
        <Section
          kicker="Where You Lose Money"
          title="This is what actually damages you"
          items={whereMoneyIsLost}
        />
      </section>

      <section className="hero-grid section-top-gap">
        <Section
          kicker="Profitable Traits"
          title="Common traits of your good trades"
          items={profitableTraits}
          strong
        />
        <Section
          kicker="Losing Traits"
          title="Common traits of your bad trades"
          items={losingTraits}
        />
      </section>

      <section className="hero-grid section-top-gap">
        <Section
          kicker="Re-entry Needed"
          title="When re-entry makes sense"
          items={reentryNeeded}
          strong
        />
        <Section
          kicker="Re-entry Not Needed"
          title="When you should stay out"
          items={reentryNotNeeded}
        />
      </section>

      <section className="section-grid section-top-gap">
        <Section
          kicker="Thresholds"
          title="Rules to stop the giveback"
          items={thresholds}
          strong
        />
        <Section
          kicker="Bottom Line"
          title="Your trading identity right now"
          items={bottomLine}
        />
      </section>
    </main>
  );
}
