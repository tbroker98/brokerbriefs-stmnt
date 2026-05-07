import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { StatementExtractorStudio } from "@/components/statement-extractor-studio";

export const metadata: Metadata = {
  title: "Bank Statement Extractor",
  description: "Upload bank statement PDFs and turn them into categorized transaction tables."
};

export default function BankStatementExtractorPage() {
  return (
    <AppShell
      activeHref="/bank-statement-extractor"
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
        <StatementExtractorStudio variant="bank" />
    </AppShell>
  );
}
