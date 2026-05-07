import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AnalystRewriteStudio } from "@/components/analyst-rewrite-studio";

export const metadata: Metadata = {
  title: "HNSPL Technical Calls Cleaner",
  description: "Clean raw technical calls into clear client-facing messages."
};

export default function AnalystCleanerPage() {
  return (
    <div className="analyst-cleaner-page">
      <header className="site-header analyst-header">
        <div className="site-header-inner">
          <div className="site-brand analyst-brand">
            <div className="analyst-logo-wrap">
              <Image src="/hnspl-light-logo.png" alt="HNSPL logo" width={287} height={91} priority />
            </div>
            <div className="analyst-brand-copy">
              <span className="analyst-brand-kicker">HNSPL Internal Tool</span>
              <span className="brand-name analyst-brand-name">Technical Calls Cleaner</span>
            </div>
          </div>
          <div className="site-nav">
            <Link className="nav-tag analyst-nav-tag" href="/credit-card-statement-extractor">
              Credit Cards
            </Link>
            <Link className="nav-tag analyst-nav-tag" href="/bank-statement-extractor">
              Bank Statements
            </Link>
            <Link className="nav-tag analyst-nav-tag" href="/">
              Extractors
            </Link>
          </div>
        </div>
      </header>

      <main className="page analyst-page">
        <AnalystRewriteStudio />
      </main>
    </div>
  );
}
