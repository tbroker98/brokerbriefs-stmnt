"use client";

import { useState, useTransition } from "react";
import type { StatementExtractionResult } from "@/lib/statement-extractor";

type ExtractionResponse = StatementExtractionResult & {
  error?: string;
};

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

type StatementExtractorVariant = "credit-card" | "bank";

type StatementExtractorStudioProps = {
  variant?: StatementExtractorVariant;
};

type ExtractorConfig = {
  apiPath: string;
  exportPrefix: string;
  productName: string;
  eyebrow: string;
  heroTitle: string;
  heroCopy: string;
  sourceNounPlural: string;
  sourceDimensionLabel: string;
  emptyStateCopy: string;
};

const EXTRACTOR_CONFIG: Record<StatementExtractorVariant, ExtractorConfig> = {
  "credit-card": {
    apiPath: "/api/statement-extractor",
    exportPrefix: "credit-card-statement-extractor",
    productName: "Credit Card Statement Extractor",
    eyebrow: "Monthly Spend Breakdown",
    heroTitle: "Upload your credit card statements and get a clean spend table back.",
    heroCopy:
      "The extractor reads statement text, finds transaction lines, normalizes merchants, and groups spending into practical buckets like restaurants, hotels, Zomato, Blinkit, Instamart, travel, groceries, fees, and more.",
    sourceNounPlural: "credit card statements",
    sourceDimensionLabel: "card",
    emptyStateCopy: "Your category table, merchant table, and extracted transactions will appear here after upload."
  },
  bank: {
    apiPath: "/api/bank-statement-extractor",
    exportPrefix: "bank-statement-extractor",
    productName: "Bank Statement Extractor",
    eyebrow: "Bank Transaction Breakdown",
    heroTitle: "Upload your bank statements and turn them into a reviewable transaction table.",
    heroCopy:
      "This extractor reads bank statement text, pulls transaction rows, groups recurring merchants, separates credits from debits, and leaves uncertain lines visible for manual review.",
    sourceNounPlural: "bank statements",
    sourceDimensionLabel: "account",
    emptyStateCopy: "Your transaction tables, merchant rollups, and review lines will appear here after upload."
  }
};

export function StatementExtractorStudio({ variant = "credit-card" }: StatementExtractorStudioProps) {
  const config = EXTRACTOR_CONFIG[variant];
  const [files, setFiles] = useState<File[]>([]);
  const [result, setResult] = useState<StatementExtractionResult | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canSubmit = files.length > 0 && !isPending;

  function handleFileChange(nextFiles: FileList | null) {
    const selectedFiles = nextFiles ? Array.from(nextFiles) : [];
    setFiles(selectedFiles);
    setResult(null);
    setError("");

    if (selectedFiles.length > 0) {
      runExtraction(selectedFiles);
    }
  }

  function runExtraction(selectedFiles: File[]) {
    if (selectedFiles.length === 0) {
      return;
    }

    setError("");
    setResult(null);

    startTransition(async () => {
      try {
        const formData = new FormData();
        selectedFiles.forEach((file) => {
          formData.append("statements", file);
        });

        const response = await fetch(config.apiPath, {
          method: "POST",
          body: formData
        });

        const contentType = response.headers.get("content-type") || "";
        const rawBody = await response.text();
        const payload = contentType.includes("application/json")
          ? (JSON.parse(rawBody) as ExtractionResponse)
          : null;

        if (!response.ok) {
          if (payload?.error) {
            throw new Error(payload.error);
          }

          throw new Error("Statement extraction failed on the server. Please retry once.");
        }

        if (!payload) {
          throw new Error("Statement extraction returned an unexpected response.");
        }

        setResult(payload);
      } catch (extractError) {
        setError(extractError instanceof Error ? extractError.message : "Statement extraction failed.");
      }
    });
  }

  function handleExtract() {
    runExtraction(files);
  }

  return (
    <section className="stack">
      <section className="note-hero note-hero-tight">
        <div className="note-hero-head">
          <div>
            <span className="note-hero-kicker">{config.eyebrow}</span>
            <h1>{config.productName}</h1>
            <p className="page-sub">{config.heroCopy}</p>
          </div>
          <div>
            <button
              className="btn-ghost"
              type="button"
              onClick={() => result && downloadExtractionCsv(result, config.exportPrefix)}
              disabled={!result}
            >
              Download CSV
            </button>
          </div>
        </div>

        <div className="note-hero-summary">
          <MetricCard
            label={result ? "Gross spend" : "Mode"}
            value={result ? formatter.format(result.totals.grossSpend) : "Rules-led"}
          />
          <MetricCard
            label={result ? "Net spend" : "Format"}
            value={result ? formatter.format(result.totals.netSpend) : "PDF / TXT / CSV"}
          />
          <MetricCard
            label={result ? "Merchants" : "Review"}
            value={result ? String(result.totals.merchantCount) : "Manual lines kept"}
          />
          <MetricCard
            label={result ? "Sources" : "Output"}
            value={result ? String(result.files.length) : "Comparison tables"}
          />
        </div>
      </section>

      <div className="tracker-grid">
        <section className="card tracker-panel-sticky">
          <div className="tracker-section-head">
            <div>
              <div className="section-kicker">Upload</div>
              <h2 className="section-title">Statement files</h2>
              <p className="section-copy">PDF works best. Plain text and CSV are also accepted.</p>
            </div>
          </div>

          <label className="upload-zone" htmlFor="statement-files">
            <input
              id="statement-files"
              className="upload-input"
              type="file"
              accept=".pdf,.txt,.csv"
              multiple
              onChange={(event) => handleFileChange(event.target.files)}
            />
            <span className="upload-title">Choose monthly statements</span>
            <span className="upload-copy">
              Upload one or more {config.sourceNounPlural} for the month. Machine-readable PDFs give the best results.
            </span>
            <span className="upload-copy">Files start extracting right after selection.</span>
          </label>

          <div className="tracker-file-list">
            {files.length > 0 ? (
              files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="tracker-file-pill">
                  <span>{file.name}</span>
                  <span>{Math.max(1, Math.round(file.size / 1024))} KB</span>
                </div>
              ))
            ) : (
              <div className="tracker-empty-row">No files selected yet.</div>
            )}
          </div>

          <div className="tracker-actions">
            <button className="btn-ghost" type="button" onClick={handleExtract} disabled={!canSubmit}>
              {isPending ? "Extracting..." : "Extract Statement"}
            </button>
            <span className="small muted">
              If a PDF is scanned like an image, the parser may need OCR before it can classify merchants.
            </span>
          </div>

          {error ? <div className="status-block status-error">{error}</div> : null}
        </section>

        <section className="tracker-main">
          {result ? (
            <>
              {result.warnings.length > 0 ? (
                <div className="status-block status-warning">
                  {result.warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              ) : null}

              <section className="card tracker-section">
                <div className="tracker-section-head">
                  <div>
                    <div className="section-kicker">Sources</div>
                    <h2 className="section-title">Uploaded files</h2>
                  </div>
                </div>
                <div className="filters">
              {result.files.map((file) => (
                <span key={file.name} className="filter-pill">
                  {file.name} · {file.transactionCount} rows
                </span>
              ))}
                </div>
              </section>

              <ResultTable
                title={`Merchant comparison by ${config.sourceDimensionLabel}`}
                headers={[
                  "Merchant",
                  "Category",
                  ...result.files.map((file) => file.name),
                  "Total",
                  "Transactions"
                ]}
                rows={result.merchantComparison.map((row) => [
                  row.label,
                  row.category || "-",
                  ...result.files.map((file) => formatter.format(row.amountsByFile[file.name] || 0)),
                  formatter.format(row.totalAmount),
                  String(row.transactionCount)
                ])}
              />

              <ResultTable
                title={`Category comparison by ${config.sourceDimensionLabel}`}
                headers={["Category", ...result.files.map((file) => file.name), "Total", "Transactions"]}
                rows={result.categoryComparison.map((row) => [
                  row.label,
                  ...result.files.map((file) => formatter.format(row.amountsByFile[file.name] || 0)),
                  formatter.format(row.totalAmount),
                  String(row.transactionCount)
                ])}
              />

              <ResultTable
                title="Shopping breakdown"
                headers={["Merchant", "Transactions", "Amount"]}
                rows={result.shoppingBreakdown.map((row) => [
                  row.label,
                  String(row.transactionCount),
                  formatter.format(row.amount)
                ])}
              />

              <ResultTable
                title="Manual review lines"
                headers={["Date", "Merchant", "Category", "Amount", "Confidence", "Source"]}
                rows={result.uncertainTransactions.map((row) => [
                  row.date,
                  row.merchant,
                  row.category,
                  formatter.format(row.amount),
                  row.confidence,
                  row.sourceFile
                ])}
              />

              <ResultTable
                title="Category summary"
                headers={["Category", "Transactions", "Amount"]}
                rows={result.categorySummary.map((row) => [
                  row.label,
                  String(row.transactionCount),
                  formatter.format(row.amount)
                ])}
              />

              <ResultTable
                title="Merchant summary"
                headers={["Merchant", "Category", "Transactions", "Amount"]}
                rows={result.merchantSummary.map((row) => [
                  row.label,
                  row.category || "-",
                  String(row.transactionCount),
                  formatter.format(row.amount)
                ])}
              />

              <ResultTable
                title="Extracted transactions"
                headers={["Date", "Merchant", "Category", "Amount", "Type", "Source"]}
                rows={result.transactions.map((row) => [
                  row.date,
                  row.merchant,
                  row.category,
                  formatter.format(row.amount),
                  row.kind,
                  row.sourceFile
                ])}
              />
            </>
          ) : (
            <div className="card tracker-empty">{config.emptyStateCopy}</div>
          )}
        </section>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="note-stat-chip">
      <span className="note-stat-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultTable({
  title,
  headers,
  rows
}: {
  title: string;
  headers: string[];
  rows: string[][];
}) {
  return (
    <section className="card tracker-section">
      <div className="tracker-section-head">
        <div>
          <div className="section-kicker">Data Section</div>
          <h2 className="section-title">{title}</h2>
        </div>
        <span className="tracker-section-meta">{rows.length} row(s)</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length}>No rows found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function downloadExtractionCsv(result: StatementExtractionResult, exportPrefix: string) {
  const sections: string[] = [];

  sections.push(
    toCsvSection("Totals", ["Metric", "Value"], [
      ["Gross spend", String(result.totals.grossSpend)],
      ["Refunds and credits", String(result.totals.refundsAndCredits)],
      ["Payments excluded", String(result.totals.paymentsExcluded)],
      ["Net spend", String(result.totals.netSpend)],
      ["Merchant count", String(result.totals.merchantCount)]
    ])
  );

  sections.push(
    toCsvSection("Files", ["File", "Transaction count"], result.files.map((file) => [file.name, String(file.transactionCount)]))
  );

  sections.push(
    toCsvSection(
      "Merchant comparison by source",
      ["Merchant", "Category", ...result.files.map((file) => file.name), "Total", "Transactions"],
      result.merchantComparison.map((row) => [
        row.label,
        row.category || "",
        ...result.files.map((file) => String(row.amountsByFile[file.name] || 0)),
        String(row.totalAmount),
        String(row.transactionCount)
      ])
    )
  );

  sections.push(
    toCsvSection(
      "Category comparison by source",
      ["Category", ...result.files.map((file) => file.name), "Total", "Transactions"],
      result.categoryComparison.map((row) => [
        row.label,
        ...result.files.map((file) => String(row.amountsByFile[file.name] || 0)),
        String(row.totalAmount),
        String(row.transactionCount)
      ])
    )
  );

  sections.push(
    toCsvSection(
      "Shopping breakdown",
      ["Merchant", "Transactions", "Amount"],
      result.shoppingBreakdown.map((row) => [row.label, String(row.transactionCount), String(row.amount)])
    )
  );

  sections.push(
    toCsvSection(
      "Category summary",
      ["Category", "Transactions", "Amount"],
      result.categorySummary.map((row) => [row.label, String(row.transactionCount), String(row.amount)])
    )
  );

  sections.push(
    toCsvSection(
      "Merchant summary",
      ["Merchant", "Category", "Transactions", "Amount"],
      result.merchantSummary.map((row) => [
        row.label,
        row.category || "",
        String(row.transactionCount),
        String(row.amount)
      ])
    )
  );

  sections.push(
    toCsvSection(
      "Manual review lines",
      ["Date", "Merchant", "Category", "Amount", "Type", "Confidence", "Source"],
      result.uncertainTransactions.map((row) => [
        row.date,
        row.merchant,
        row.category,
        String(row.amount),
        row.kind,
        row.confidence,
        row.sourceFile
      ])
    )
  );

  sections.push(
    toCsvSection(
      "Extracted transactions",
      ["Date", "Merchant", "Category", "Amount", "Type", "Source", "Description", "Raw line"],
      result.transactions.map((row) => [
        row.date,
        row.merchant,
        row.category,
        String(row.amount),
        row.kind,
        row.sourceFile,
        row.description,
        row.rawLine
      ])
    )
  );

  const csv = `Statement Extractor Export\n\n${sections.join("\n\n")}\n`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10);
  anchor.href = url;
  anchor.download = `${exportPrefix}-${timestamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function toCsvSection(title: string, headers: string[], rows: string[][]) {
  const lines = [[title], headers, ...rows];
  return lines.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
}

function escapeCsvCell(value: string) {
  const normalized = value.replace(/\r?\n/g, " ").trim();
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}
