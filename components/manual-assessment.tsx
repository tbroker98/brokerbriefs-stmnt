"use client";

import { useState } from "react";
import { assessFromInput } from "@/lib/scoring";
import { AssessmentInput } from "@/lib/types";

const initialInput: AssessmentInput = {
  companyName: "Orchid Petrochem Limited",
  sector: "Capital Markets",
  marketCapBucket: "Small Cap",
  repeatedDelays: 1,
  manualOverrides: 1,
  disclosureQuality: 80,
  marketStressSignals: 25,
  abnormalVolumeDays: 2,
  bulkBlockDealCount: 1,
  criticalMissing: 0,
  highDelayed: 1,
  dueSoonCritical: 1,
  notes: ""
};

function toneClass(status: string) {
  if (status === "Healthy") {
    return "chip chip-good";
  }

  if (status === "Watchlist") {
    return "chip chip-watch";
  }

  return "chip chip-risk";
}

export function ManualAssessment() {
  const [input, setInput] = useState<AssessmentInput>(initialInput);

  const assessment = assessFromInput(input);

  return (
    <section className="section-grid" style={{ marginTop: 20 }}>
      <div className="panel panel-pad panel-strong">
        <div className="section-kicker">Interactive scenario lab</div>
        <h2 className="section-title">Simulate a fresh upload before the backend exists</h2>
        <p className="section-copy">
          This is the easiest way to show the partner how ComplAI will behave once real company data starts
          flowing in. Change the inputs and watch the risk posture update in real time.
        </p>

        <div className="form-grid">
          <div className="field">
            <label htmlFor="companyName">Company name</label>
            <input
              id="companyName"
              value={input.companyName}
              onChange={(event) => setInput({ ...input, companyName: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="sector">Sector</label>
            <input
              id="sector"
              value={input.sector}
              onChange={(event) => setInput({ ...input, sector: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="marketCapBucket">Market cap bucket</label>
            <select
              id="marketCapBucket"
              value={input.marketCapBucket}
              onChange={(event) => setInput({ ...input, marketCapBucket: event.target.value })}
            >
              <option>Micro Cap</option>
              <option>Small Cap</option>
              <option>Mid Cap</option>
              <option>Large Cap</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="disclosureQuality">Disclosure quality (0-100)</label>
            <input
              id="disclosureQuality"
              type="number"
              min="0"
              max="100"
              value={input.disclosureQuality}
              onChange={(event) =>
                setInput({ ...input, disclosureQuality: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="repeatedDelays">Repeated delays</label>
            <input
              id="repeatedDelays"
              type="number"
              min="0"
              value={input.repeatedDelays}
              onChange={(event) =>
                setInput({ ...input, repeatedDelays: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="manualOverrides">Manual overrides</label>
            <input
              id="manualOverrides"
              type="number"
              min="0"
              value={input.manualOverrides}
              onChange={(event) =>
                setInput({ ...input, manualOverrides: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="marketStressSignals">Market stress signals (0-100)</label>
            <input
              id="marketStressSignals"
              type="number"
              min="0"
              max="100"
              value={input.marketStressSignals}
              onChange={(event) =>
                setInput({ ...input, marketStressSignals: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="abnormalVolumeDays">Abnormal volume days</label>
            <input
              id="abnormalVolumeDays"
              type="number"
              min="0"
              value={input.abnormalVolumeDays}
              onChange={(event) =>
                setInput({ ...input, abnormalVolumeDays: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="bulkBlockDealCount">Bulk / block deals flagged</label>
            <input
              id="bulkBlockDealCount"
              type="number"
              min="0"
              value={input.bulkBlockDealCount}
              onChange={(event) =>
                setInput({ ...input, bulkBlockDealCount: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="criticalMissing">Critical obligations missing</label>
            <input
              id="criticalMissing"
              type="number"
              min="0"
              value={input.criticalMissing}
              onChange={(event) =>
                setInput({ ...input, criticalMissing: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="highDelayed">High-severity delayed items</label>
            <input
              id="highDelayed"
              type="number"
              min="0"
              value={input.highDelayed}
              onChange={(event) =>
                setInput({ ...input, highDelayed: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="dueSoonCritical">Critical items due soon</label>
            <input
              id="dueSoonCritical"
              type="number"
              min="0"
              value={input.dueSoonCritical}
              onChange={(event) =>
                setInput({ ...input, dueSoonCritical: Number(event.target.value) || 0 })
              }
            />
          </div>
          <div className="field field-full">
            <label htmlFor="notes">Analyst / compliance note</label>
            <textarea
              id="notes"
              value={input.notes}
              onChange={(event) => setInput({ ...input, notes: event.target.value })}
              placeholder="Example: promoter pledge update pending, annual report annexures not yet signed."
            />
          </div>
        </div>
      </div>

      <div className="panel panel-pad">
        <div className="summary-banner">
          <span className={toneClass(assessment.status)}>{assessment.status}</span>
          <strong>{assessment.companyName}</strong>
          <p>{assessment.summary}</p>
        </div>

        <div className="mini-summary-grid">
          <article className="mini-summary-card">
            <div className="metric-label">Likely user</div>
            <strong>CS / Compliance Officer</strong>
          </article>
          <article className="mini-summary-card">
            <div className="metric-label">Primary next move</div>
            <strong>{assessment.actions[0]?.title ?? "No immediate action"}</strong>
          </article>
        </div>

        <div className="score-grid" style={{ marginTop: 18 }}>
          <div className="score-box">
            Deterministic
            <strong>{assessment.deterministicScore}</strong>
            <div className="muted">Rule-backed compliance health</div>
          </div>
          <div className="score-box">
            Operational
            <strong>{assessment.operationalScore}</strong>
            <div className="muted">Process and evidence stability</div>
          </div>
          <div className="score-box">
            Surveillance
            <strong>{assessment.surveillanceScore}</strong>
            <div className="muted">Risk pressure, not legal conclusion</div>
          </div>
        </div>

        <div className="chip-row" style={{ marginTop: 16 }}>
          {assessment.riskDrivers.map((driver) => (
            <span className="chip chip-neutral" key={driver}>
              {driver}
            </span>
          ))}
        </div>

        <div className="divider" />

        <h3 className="section-title" style={{ fontSize: 24 }}>
          Active Alerts
        </h3>
        <div className="stack">
          {assessment.alerts.length > 0 ? (
            assessment.alerts.map((alert) => (
              <article className="alert-item" key={`${alert.title}-${alert.body}`}>
                <span className={alert.level === "risk" ? "chip chip-risk" : "chip chip-watch"}>
                  {alert.level === "risk" ? "Immediate Risk" : "Watch Item"}
                </span>
                <p>{alert.title}</p>
                <p>{alert.body}</p>
              </article>
            ))
          ) : (
            <article className="alert-item">
              <p>No active alerts in the current snapshot.</p>
            </article>
          )}
        </div>

        <div className="divider" />

        <h3 className="section-title" style={{ fontSize: 24 }}>
          Recommended Actions
        </h3>
        <div className="stack">
          {assessment.actions.map((action) => (
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
    </section>
  );
}
