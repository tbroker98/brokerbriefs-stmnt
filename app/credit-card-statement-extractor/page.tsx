import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { StatementExtractorStudio } from "@/components/statement-extractor-studio";

export const metadata: Metadata = {
  title: "Credit Card Statement Extractor",
  description: "Upload credit card statement PDFs and turn them into merchant and category spend tables."
};

export default function CreditCardStatementExtractorPage() {
  return (
    <AppShell
      activeHref="/credit-card-statement-extractor"
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
        <StatementExtractorStudio variant="credit-card" />
    </AppShell>
  );
}
