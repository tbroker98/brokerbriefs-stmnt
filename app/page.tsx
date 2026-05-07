import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Statement Extractors",
  description: "Choose between the credit card and bank statement extractors."
};

export default function Home() {
  return (
    <AppShell
      activeHref="/"
      brandMain="BrokerBriefs Extractors"
      brandSub="Structured archive, tracker, and scorecard"
      footerMain="BrokerBriefs Extractors"
      footerSub="Institutional research layer"
      navItems={[
        { href: "/", label: "Overview" },
        { href: "/credit-card-statement-extractor", label: "Credit Cards" },
        { href: "/bank-statement-extractor", label: "Bank Statements" },
        { href: "/analyst-cleaner", label: "Analyst Cleaner" }
      ]}
    >
      <section className="note-hero">
        <div className="note-hero-head">
          <div>
            <span className="note-hero-kicker">Institutional View</span>
            <h1>Choose the extraction workflow you want to run.</h1>
            <p className="page-sub">
              Credit card statements and bank statements now live as separate tools so each parser can be tuned
              without corrupting the other.
            </p>
          </div>
        </div>

        <div className="note-hero-summary">
          <div className="note-stat-chip">
            <span className="note-stat-label">Surfaces</span>
            <strong>2</strong>
          </div>
          <div className="note-stat-chip">
            <span className="note-stat-label">Mode</span>
            <strong>Rules-led</strong>
          </div>
          <div className="note-stat-chip">
            <span className="note-stat-label">Output</span>
            <strong>CSV-ready</strong>
          </div>
        </div>
      </section>

      <section className="card-grid">
        <article className="card">
          <div className="section-kicker">Credit Cards</div>
          <h2 className="section-title">Merchant-wise spend parsing</h2>
          <p className="section-copy">
            Built for card statements, merchant grouping, category comparison by card, and manual review of
            ambiguous lines.
          </p>
          <div className="filters">
            <Link className="btn-ghost" href="/credit-card-statement-extractor">
              Open credit card extractor
            </Link>
          </div>
        </article>

        <article className="card">
          <div className="section-kicker">Bank Statements</div>
          <h2 className="section-title">Account-level transaction extraction</h2>
          <p className="section-copy">
            Separate route and endpoint, ready for bank-specific parsing rules, credit/debit separation, and
            account-wise comparisons.
          </p>
          <div className="filters">
            <Link className="btn-ghost" href="/bank-statement-extractor">
              Open bank statement extractor
            </Link>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
