"use client";

import { useState } from "react";
import { assessCompany } from "@/lib/scoring";
import { flagshipCompany, peerCompanies, rules } from "@/lib/data";

// ─── Upload animation config ───────────────────────────────────────────────

const PROCESSING_STEPS = [
  "Uploading 6 documents to secure workspace...",
  "Classifying document types and extracting fields...",
  "Mapping filings to SEBI LODR obligations...",
  "Cross-checking BSE / NSE exchange acknowledgements...",
  "Running compliance scoring engine...",
  "Generating risk alerts and remediation queue..."
];

const STEP_DURATIONS_MS = [850, 700, 1000, 850, 800, 650];

// ─── Helpers ───────────────────────────────────────────────────────────────

function toneClass(status: string) {
  if (status === "Healthy") return "chip chip-good";
  if (status === "Watchlist") return "chip chip-watch";
  return "chip chip-risk";
}

function labelForStatus(status: string) {
  switch (status) {
    case "met": return "Filed";
    case "due_soon": return "Due soon";
    case "delayed": return "Delayed";
    case "missing": return "Missing";
    default: return "Needs review";
  }
}

function chipForStatus(status: string) {
  switch (status) {
    case "met": return "chip chip-good";
    case "due_soon": return "chip chip-watch";
    case "delayed": return "chip chip-risk";
    case "missing": return "chip chip-risk";
    default: return "chip chip-watch";
  }
}

// ─── Component ────────────────────────────────────────────────────────────

export function CompanyDashboard() {
  const [phase, setPhase] = useState<"idle" | "running" | "complete">("idle");
  const [currentStep, setCurrentStep] = useState(0);

  const flagshipAssessment = assessCompany(flagshipCompany, rules);
  const peerAssessments = peerCompanies.map((company) => ({
    company,
    assessment: assessCompany(company, rules)
  }));

  function startAssessment() {
    setPhase("running");
    setCurrentStep(0);

    let step = 0;

    function advance() {
      const duration = STEP_DURATIONS_MS[step];
      setTimeout(() => {
        step++;
        if (step >= PROCESSING_STEPS.length) {
          setPhase("complete");
          setCurrentStep(PROCESSING_STEPS.length - 1);
          return;
        }
        setCurrentStep(step);
        advance();
      }, duration);
    }

    advance();
  }

  const progressPct =
    phase === "complete"
      ? 100
      : Math.round(((currentStep + 1) / PROCESSING_STEPS.length) * 100);

  return (
    <>
      {/* ─── Demo workflow section ─────────────────────────── */}
      <section className="section-grid section-top-gap">
        <div className="panel panel-pad panel-strong">
          <div className="section-kicker">Demo workflow</div>
          <h2 className="section-title">What the user sees in the first 5 minutes</h2>
          <p className="section-copy">
            ComplAI is designed for compliance teams first. The user uploads a company packet, the system
            maps the documents to SEBI, BSE, and NSE obligations, and the dashboard highlights what is
            healthy, what is drifting, and what needs fixing before the impact compounds.
          </p>
          <div className="journey-grid">
            <article className="journey-card">
              <span className="journey-step">01</span>
              <h3>Upload</h3>
              <p>Quarterly results, shareholding pattern, board outcome, annual report, website evidence.</p>
            </article>
            <article className="journey-card">
              <span className="journey-step">02</span>
              <h3>Auto-assess</h3>
              <p>Rules are mapped, missing evidence is flagged, and scoring separates compliance from risk.</p>
            </article>
            <article className="journey-card">
              <span className="journey-step">03</span>
              <h3>Act early</h3>
              <p>Teams get a remediation queue before a late filing evolves into market or surveillance stress.</p>
            </article>
          </div>
        </div>

        {/* ─── Upload / processing panel ─── */}
        <div className="panel panel-pad">
          <div className="section-kicker">Live upload queue</div>
          <h2 className="section-title">Sample company packet</h2>

          {phase === "idle" && (
            <>
              <div className="upload-shell">
                <div className="upload-dropzone">
                  <div className="upload-icon">+</div>
                  <strong>Drop filings, PDFs, and spreadsheets here</strong>
                  <p>
                    ComplAI will classify the document, attach it to a reporting period, and map it to the
                    relevant rule family.
                  </p>
                  <div className="chip-row">
                    <span className="chip chip-good">AI classification</span>
                    <span className="chip chip-watch">Evidence checks</span>
                    <span className="chip chip-neutral">Manual override</span>
                  </div>
                </div>
              </div>

              <div className="stack" style={{ marginBottom: 18 }}>
                {flagshipCompany.documents.map((doc) => (
                  <article className="document-card" key={doc.id} style={{ opacity: 0.55 }}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{doc.name}</strong>
                      <div className="card-meta">
                        {doc.documentType} · {doc.reportingPeriod}
                      </div>
                    </div>
                    <span className="chip chip-neutral">Pending</span>
                  </article>
                ))}
              </div>

              <button className="button" style={{ width: "100%" }} onClick={startAssessment}>
                Run Demo Assessment
              </button>
            </>
          )}

          {phase === "running" && (
            <div className="processing-shell">
              <div className="processing-header">
                <div className="processing-pulse" />
                <span className="processing-title">Analysing company packet…</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="processing-steps">
                {PROCESSING_STEPS.map((step, idx) => {
                  const cls =
                    idx < currentStep
                      ? "processing-step step-done"
                      : idx === currentStep
                        ? "processing-step step-active"
                        : "processing-step step-pending";
                  return (
                    <div className={cls} key={step}>
                      <div className="step-dot">
                        {idx < currentStep ? "✓" : idx === currentStep ? "◌" : ""}
                      </div>
                      {step}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {phase === "complete" && (
            <>
              <div className="upload-complete-badge">
                ✓ Assessment complete · {flagshipCompany.documents.length} documents processed
              </div>
              <div className="stack">
                {flagshipCompany.documents.map((doc) => (
                  <article className="document-card" key={doc.id}>
                    <div>
                      <strong style={{ fontSize: 14 }}>{doc.name}</strong>
                      <div className="card-meta">
                        {doc.documentType} · {doc.reportingPeriod}
                      </div>
                    </div>
                    <div className="chip-row" style={{ marginTop: 0 }}>
                      <span
                        className={
                          doc.status === "processed"
                            ? "chip chip-good"
                            : doc.status === "review"
                              ? "chip chip-watch"
                              : "chip chip-risk"
                        }
                      >
                        {doc.status}
                      </span>
                      {doc.extractedFields > 0 && (
                        <span className="chip chip-neutral">{doc.extractedFields} fields</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ─── Dashboard — only visible after assessment ─────── */}
      {phase === "complete" && (
        <>
          {/* ─── Flagship company view ──────────────────────── */}
          <section className="section-grid section-top-gap">
            <div className="panel panel-pad">
              <div className="section-kicker">Flagship issuer · {flagshipCompany.symbol}</div>
              <div className="headline-row">
                <div>
                  <h2 className="section-title" style={{ marginBottom: 0 }}>
                    {flagshipCompany.name}
                  </h2>
                  <div className="card-meta">
                    {flagshipCompany.sector} · {flagshipCompany.marketCapBucket}
                  </div>
                </div>
                <span className={toneClass(flagshipAssessment.status)}>
                  {flagshipAssessment.status}
                </span>
              </div>

              <div className="score-grid" style={{ marginTop: 18 }}>
                <div className="score-box">
                  Deterministic
                  <strong>{flagshipAssessment.deterministicScore}</strong>
                  <div className="muted">Rule-backed filing compliance</div>
                </div>
                <div className="score-box">
                  Operational
                  <strong>{flagshipAssessment.operationalScore}</strong>
                  <div className="muted">Evidence quality and repeat slippage</div>
                </div>
                <div className="score-box">
                  Surveillance
                  <strong>{flagshipAssessment.surveillanceScore}</strong>
                  <div className="muted">Inference layer, not legal conclusion</div>
                </div>
              </div>

              <div className="metric-grid" style={{ marginTop: 14 }}>
                <div className="metric-card">
                  <div className="metric-label">Critical issues</div>
                  <div className="metric-value">{flagshipAssessment.criticalIssues}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">High-risk exposures</div>
                  <div className="metric-value">{flagshipAssessment.highRiskIssues}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Bulk / block alerts</div>
                  <div className="metric-value">{flagshipCompany.signals.bulkBlockDealCount}</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Abnormal vol. days</div>
                  <div className="metric-value">{flagshipCompany.signals.abnormalVolumeDays}</div>
                </div>
              </div>

              <div className="summary-banner">
                <strong>Assessment summary</strong>
                <p>{flagshipAssessment.summary}</p>
              </div>

              <div className="report-strip">
                <article className="report-card">
                  <div className="metric-label">At-risk obligations</div>
                  <strong>{flagshipAssessment.highRiskIssues}</strong>
                  <p>Open obligations that could pull the company toward a near-breach state.</p>
                </article>
                <article className="report-card">
                  <div className="metric-label">First owner</div>
                  <strong>Company Secretary</strong>
                  <p>Most urgent items route through governance and filing coordination.</p>
                </article>
                <article className="report-card">
                  <div className="metric-label">Model stance</div>
                  <strong>Explainable</strong>
                  <p>Every alert ties back to a rule, missing evidence item, or market signal.</p>
                </article>
              </div>

              <div className="divider" />

              <div className="section-kicker" style={{ marginBottom: 12 }}>
                Obligation status by rule
              </div>
              <div className="rule-grid">
                {rules.map((rule) => {
                  const snapshot = flagshipCompany.snapshots.find(
                    (item) => item.ruleId === rule.id
                  );
                  if (!snapshot) return null;
                  return (
                    <article className="rule-item" key={rule.id}>
                      <div className="rule-head">
                        <div>
                          <h4>{rule.title}</h4>
                          <div className="card-meta">
                            {rule.regulator} · {rule.source} · due window {rule.dueWindowDays}d
                          </div>
                        </div>
                        <span className={chipForStatus(snapshot.status)}>
                          {labelForStatus(snapshot.status)}
                        </span>
                      </div>
                      <p>{snapshot.note}</p>
                    </article>
                  );
                })}
              </div>
            </div>

            {/* ─── Actions + alerts column ─── */}
            <div className="stack">
              <div className="panel panel-pad panel-strong">
                <div className="section-kicker">Immediate remediation</div>
                <h2 className="section-title">What needs to happen next</h2>
                <div className="stack">
                  {flagshipAssessment.actions.map((action) => (
                    <article className="action-item" key={action.title}>
                      <header>
                        <h4>{action.title}</h4>
                        <span
                          className={
                            action.priority === "critical"
                              ? "chip chip-risk"
                              : action.priority === "high"
                                ? "chip chip-watch"
                                : "chip chip-good"
                          }
                        >
                          {action.priority}
                        </span>
                      </header>
                      <p>{action.impact}</p>
                      <div className="card-meta">Owner: {action.owner}</div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="panel panel-pad">
                <div className="section-kicker">Risk signal layer</div>
                <h2 className="section-title">Why the surveillance score is elevated</h2>
                <div className="stack">
                  {flagshipAssessment.alerts.map((alert) => (
                    <article className="alert-item" key={alert.title}>
                      <span className={alert.level === "risk" ? "chip chip-risk" : "chip chip-watch"}>
                        {alert.level === "risk" ? "Immediate Risk" : "Watch Item"}
                      </span>
                      <p style={{ fontWeight: 500, color: "var(--ink)" }}>{alert.title}</p>
                      <p>{alert.body}</p>
                    </article>
                  ))}
                  {flagshipAssessment.riskDrivers.map((driver) => (
                    <article className="alert-item" key={driver}>
                      <span className="chip chip-neutral">Signal</span>
                      <p>{driver}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ─── Peer benchmark section ──────────────────────── */}
          <section className="section-grid section-top-gap">
            <div className="panel panel-pad panel-strong">
              <div className="section-kicker">Benchmark lens</div>
              <h2 className="section-title">How the same engine compares peer issuers</h2>
              <p className="section-copy">
                This screen gives funds, advisors, and bankers a way to compare issuers without collapsing
                the story into one opaque score.
              </p>
              <div className="stack">
                {peerAssessments.map(({ company, assessment }) => (
                  <article className="company-card" key={company.id}>
                    <header>
                      <div>
                        <h3>{company.name}</h3>
                        <div className="card-meta">
                          {company.symbol} · {company.marketCapBucket}
                        </div>
                      </div>
                      <span className={toneClass(assessment.status)}>{assessment.status}</span>
                    </header>
                    <div className="chip-row">
                      <span className="chip chip-good">
                        Det. {assessment.deterministicScore}
                      </span>
                      <span className="chip chip-watch">
                        Ops. {assessment.operationalScore}
                      </span>
                      <span className="chip chip-risk">
                        Surv. {assessment.surveillanceScore}
                      </span>
                    </div>
                    <p style={{ marginTop: 12, color: "var(--muted)", fontSize: 13, lineHeight: 1.6 }}>
                      {assessment.summary}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="panel panel-pad">
              <div className="section-kicker">Rules included in this demo</div>
              <h2 className="section-title">Initial obligation coverage</h2>
              <div className="rule-grid">
                {rules.map((rule) => (
                  <article className="rule-item" key={rule.id}>
                    <div className="rule-head">
                      <h4>{rule.title}</h4>
                      <span
                        className={
                          rule.severity === "critical"
                            ? "chip chip-risk"
                            : rule.severity === "high"
                              ? "chip chip-watch"
                              : "chip chip-good"
                        }
                      >
                        {rule.severity}
                      </span>
                    </div>
                    <p>{rule.description}</p>
                    <div className="card-meta">
                      {rule.regulator} · {rule.frequency} · {rule.source}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}
