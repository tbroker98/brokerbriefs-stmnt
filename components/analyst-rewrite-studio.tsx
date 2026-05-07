"use client";

import { useState, useTransition } from "react";
import { CLIENT_REWRITE_DESCRIPTION } from "@/lib/analyst-cleaner";

const SAMPLE_INPUT = `10/10/2019, 10:44 am - Bimalbhai Technicals: GRAPHITE 288 ke upar is a buy fr corrective upmove 😘😘
11/10/2019, 10:21 am - Bimalbhai Technicals: RBL BK galti se agar 257 toda to gaya samjho 😂🤣
21/04/2025, 2:13 pm - Bimalbhai Technicals: Enter suzlon at 60 add more at 62 fr 4 to 8 rs upmove`;

type RewriteResponse = {
  cleanedText?: string;
  cleanedMessages?: string[];
  engine?: string;
  parsedMessages?: number;
  model?: string;
  error?: string;
};

export function AnalystRewriteStudio() {
  const [input, setInput] = useState(SAMPLE_INPUT);
  const [output, setOutput] = useState("");
  const [cleanedMessages, setCleanedMessages] = useState<string[]>([]);
  const [meta, setMeta] = useState<Omit<RewriteResponse, "cleanedText" | "error">>({});
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
  const [queueIndex, setQueueIndex] = useState<number>(0);
  const [queueState, setQueueState] = useState<"idle" | "copied" | "failed">("idle");
  const [isPending, startTransition] = useTransition();

  const canSubmit = input.trim().length > 0 && !isPending;
  const hasBatch = cleanedMessages.length > 0;
  const hasMoreQueuedMessages = hasBatch && queueIndex < cleanedMessages.length;

  function resetResults() {
    setOutput("");
    setCleanedMessages([]);
    setMeta({});
    setError("");
    setCopyState("idle");
    setCopiedMessageIndex(null);
    setQueueIndex(0);
    setQueueState("idle");
  }

  function handleInputChange(nextValue: string) {
    setInput(nextValue);
    resetResults();
  }

  function handleRewrite() {
    if (!input.trim()) {
      return;
    }

    setOutput("");
    setCleanedMessages([]);
    setMeta({});
    setError("");
    setCopyState("idle");
    setCopiedMessageIndex(null);
    setQueueIndex(0);
    setQueueState("idle");

    startTransition(async () => {
      try {
        const response = await fetch("/api/analyst-rewrite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ input })
        });

        const payload = (await response.json()) as RewriteResponse;

        if (!response.ok) {
          throw new Error(payload.error || "Rewrite failed.");
        }

        setOutput(payload.cleanedText || "");
        setCleanedMessages(payload.cleanedMessages || []);
        setMeta({
          engine: payload.engine,
          model: payload.model,
          parsedMessages: payload.parsedMessages
        });
        setQueueIndex(0);
        setQueueState("idle");
      } catch (fetchError) {
        setOutput("");
        setCleanedMessages([]);
        setMeta({});
        setError(fetchError instanceof Error ? fetchError.message : "Rewrite failed.");
        setQueueIndex(0);
        setQueueState("idle");
      }
    });
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function handleCopyMessage(message: string, index: number) {
    try {
      await navigator.clipboard.writeText(message);
      setCopiedMessageIndex(index);
      setCopyState("idle");
    } catch {
      setCopiedMessageIndex(null);
    }
  }

  async function handleCopyNextMessage() {
    if (!hasMoreQueuedMessages) {
      return;
    }

    try {
      await navigator.clipboard.writeText(cleanedMessages[queueIndex]);
      setQueueState("copied");
      setCopyState("idle");
      setCopiedMessageIndex(null);
      setQueueIndex((current) => current + 1);
    } catch {
      setQueueState("failed");
    }
  }

  return (
    <section className="rewrite-shell">
      <div className="rewrite-hero">
        <div className="rewrite-hero-copy">
          <span className="eyebrow analyst-cleaner-eyebrow">Technical Calls Workflow</span>
          <h1>Technical Calls Cleaner</h1>
          <p>
            Convert raw analyst WhatsApp calls into clear client-circulation messages without changing the
            levels, conviction, or trade intent.
          </p>
        </div>

        <div className="rewrite-principles">
          <div className="rewrite-principle">
            <span>01</span>
            <strong>Levels preserved</strong>
            <p>Triggers, bands, targets, and stop references stay intact.</p>
          </div>
          <div className="rewrite-principle">
            <span>02</span>
            <strong>Conviction preserved</strong>
            <p>Strong calls stay strong. The cleaner removes noise, not meaning.</p>
          </div>
          <div className="rewrite-principle">
            <span>03</span>
            <strong>Circulation ready</strong>
            <p>Output is short, professional, and ready to be forwarded immediately.</p>
          </div>
        </div>
      </div>

      <div className="rewrite-workbench">
        <div className="rewrite-column">
          <div className="rewrite-column-head">
            <div>
              <div className="section-kicker">Raw input</div>
              <h2 className="section-title">Paste the original technical call</h2>
            </div>
            <button
              className="button button-secondary"
              type="button"
              onClick={() => handleInputChange(SAMPLE_INPUT)}
            >
              Use sample
            </button>
          </div>

          <div className="rewrite-standard">
            <div className="rewrite-standard-label">Output standard</div>
            <p>{CLIENT_REWRITE_DESCRIPTION}</p>
          </div>

          <label className="rewrite-label" htmlFor="rewrite-input">
            Raw message
          </label>
          <textarea
            id="rewrite-input"
            className="rewrite-textarea"
            value={input}
            onChange={(event) => handleInputChange(event.target.value)}
            placeholder="Paste one technical call or a handful of WhatsApp export lines here."
            spellCheck={false}
          />

          <div className="rewrite-actions">
            <button className="button" type="button" onClick={handleRewrite} disabled={!canSubmit}>
              {isPending ? "Cleaning..." : "Clean Call"}
            </button>
            <span className="rewrite-hint">Paste one line or a small batch from the WhatsApp export.</span>
          </div>

          {error ? <div className="rewrite-error">{error}</div> : null}
        </div>

        <div className="rewrite-column rewrite-column-output">
          <div className="rewrite-column-head">
            <div>
              <div className="section-kicker">Client-ready output</div>
              <h2 className="section-title">Cleaned technical call</h2>
            </div>
            <div className="rewrite-output-actions">
              <button
                className="button"
                type="button"
                onClick={handleCopyNextMessage}
                disabled={!hasMoreQueuedMessages}
              >
                {!hasBatch
                  ? "Copy next"
                  : hasMoreQueuedMessages
                    ? queueState === "failed"
                      ? "Copy failed"
                      : queueIndex === 0
                        ? `Start queue (${cleanedMessages.length})`
                        : `Copy next (${queueIndex + 1}/${cleanedMessages.length})`
                    : `Queue done (${cleanedMessages.length}/${cleanedMessages.length})`}
              </button>
              <button
                className="button button-secondary"
                type="button"
                onClick={handleCopy}
                disabled={!output}
              >
                {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy all"}
              </button>
            </div>
          </div>

          <div className="rewrite-output" aria-live="polite">
            {cleanedMessages.length > 0 ? (
              <div className="cleaned-message-list">
                {cleanedMessages.map((message, index) => (
                  <article key={`${index}-${message}`} className="cleaned-message-card">
                    <div className="cleaned-message-head">
                      <span className="cleaned-message-index">Note {index + 1}</span>
                      <button
                        className="button button-secondary cleaned-message-copy"
                        type="button"
                        onClick={() => handleCopyMessage(message, index)}
                      >
                        {copiedMessageIndex === index ? "Copied" : "Copy note"}
                      </button>
                    </div>
                    <div className="cleaned-message-text">{message}</div>
                  </article>
                ))}
              </div>
            ) : (
              output || "Your cleaned technical call will appear here."
            )}
          </div>

          <div className="rewrite-meta">
            {meta.parsedMessages ? <span>{meta.parsedMessages} note(s) parsed</span> : null}
            {meta.engine ? <span>Engine: {meta.engine}</span> : null}
            {meta.model ? <span>Model: {meta.model}</span> : null}
            {hasBatch ? (
              <span>
                Queue: {Math.min(queueIndex, cleanedMessages.length)}/{cleanedMessages.length}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
