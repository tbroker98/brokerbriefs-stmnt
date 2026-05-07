export type RewriteStyle = "client-ready";

export type AlphaSignal = "high" | "caution" | "downrank";

export type ScoredLine = {
  cleaned: string;
  signal: AlphaSignal | null;
  setup: string | null;
};

export type ParsedAnalystMessage = {
  sender?: string;
  timestamp?: string;
  text: string;
};

const WHATSAPP_EXPORT_PATTERN =
  /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2}(?:\s?[ap]\.?m\.?)?)\s+-\s+([^:]+):\s?(.*)$/i;
const WHATSAPP_BRACKET_EXPORT_PATTERN =
  /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+([^\]]+)\]\s+([^:]+):\s?(.*)$/i;

const PROFANITY_PATTERN =
  /\b(fuck(?:ing|er)?|shit|bitch|asshole|bastard|mc|bc|madarchod|behenchod|chutiya|chu+tiya|gaand|gadha|saala|sala)\b/gi;

const SHORTHAND_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bfr\b/gi, "for"],
  [/\btrgt\b/gi, "target"],
  [/\btrgts\b/gi, "targets"],
  [/\bmkt\b/gi, "market"],
  [/\bsupp\b/gi, "support"],
  [/\bcmp\b/gi, "CMP"],
  [/\bprob\b/gi, "likely"],
  [/\brem\b/gi, "reminder"],
  [/\bbk\b/gi, "Bank"],
  [/\bsl\b/gi, "stop loss"],
  [/\bupmove\b/gi, "up move"]
];

const PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\bke upar\b/gi, "above"],
  [/\bke niche\b/gi, "below"],
  [/\bniche\b/gi, "below"],
  [/\bdur hi rehna\b/gi, "avoid"],
  [/\bdur rehna\b/gi, "avoid"],
  [/\bhimmat karo\b/gi, "can be bought with conviction"],
  [/\bnot bad at all\b/gi, "looks constructive"],
  [/\bout of woods for now\b/gi, "looks out of the woods for now"],
  [/\bsaved for now\b/gi, "holding for now"],
  [/\bgaya samjho\b/gi, "would turn decisively weak"],
  [/\btrigger awaits\b/gi, "trigger awaits"],
  [/\bfresh trigger awaits\b/gi, "fresh trigger awaits"]
];

const COMMON_TEXT_FIXES: Array<[RegExp, string]> = [
  [/\bbreachex\b/gi, "breached"],
  [/\bbreached\b/gi, "breached"],
  [/\bmornning\b/gi, "morning"],
  [/\btodays\b/gi, "today's"],
  [/\bfr now\b/gi, "for now"],
  [/\brs\b/gi, "Rs"],
  [/\bthru\b/gi, "through"],
  [/&/g, "and"],
  [/\bupto\b/gi, "up to"],
  [/\bu\b/gi, "you"],
  [/\bur\b/gi, "your"],
  [/\bv\b/gi, "we"],
  [/\br\b/gi, "are"]
];

const INDEX_ZONE_LABELS = [
  "selling point",
  "buy area",
  "strong buy area",
  "last buy area",
  "grey area",
  "strong bounce back area"
];

export const CLIENT_REWRITE_DESCRIPTION =
  "Clean, client-facing wording that stays short, preserves the analyst's meaning, and avoids excessive jargon.";

export function parseAnalystInput(input: string): ParsedAnalystMessage[] {
  const normalized = input.replace(/\r/g, "").replace(/\u202f/g, " ").trim();

  if (!normalized) {
    return [];
  }

  const lines = normalized.split("\n");
  const messages: ParsedAnalystMessage[] = [];
  let current: ParsedAnalystMessage | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const match = line.match(WHATSAPP_EXPORT_PATTERN);
    const bracketMatch = line.match(WHATSAPP_BRACKET_EXPORT_PATTERN);

    if (match) {
      if (current) {
        messages.push(finalizeMessage(current));
      }

      current = {
        timestamp: `${match[1]}, ${match[2]}`,
        sender: match[3].trim(),
        text: match[4].trim()
      };
      continue;
    }

    if (bracketMatch) {
      if (current) {
        messages.push(finalizeMessage(current));
      }

      current = {
        timestamp: `${bracketMatch[1]}, ${bracketMatch[2].trim()}`,
        sender: bracketMatch[3].trim(),
        text: bracketMatch[4].trim()
      };
      continue;
    }

    if (current) {
      // WA export messages (have sender) can span multiple lines — append.
      // Plain text lines are independent calls — each gets its own message.
      if (current.sender) {
        current.text = `${current.text}\n${line}`.trim();
      } else {
        messages.push(finalizeMessage(current));
        current = { text: line };
      }
      continue;
    }

    current = { text: line };
  }

  if (current) {
    messages.push(finalizeMessage(current));
  }

  return messages.filter((message) => message.text.length > 0);
}

export function buildRewritePrompt(messages: ParsedAnalystMessage[]) {
  const numberedMessages = messages
    .map((message, index) => `${index + 1}. ${message.text}`)
    .join("\n");

  return [
    "You rewrite raw WhatsApp market notes from a technical analyst for onward sharing with equity desk dealers, fund managers, and investment managers.",
    "Preserve tickers, price levels, ranges, targets, stop levels, and directional meaning.",
    "Remove emojis, profanity, taunts, filler, repeated punctuation, and self-congratulatory lines.",
    "Improve English only as much as needed. Do not turn it into a research report.",
    "Use one consistent client-facing tone: clean, crisp, and easy to forward immediately.",
    "Do not add new views, disclaimers, or explanations.",
    "Return one cleaned line per input line, in the same order.",
    "",
    "Raw notes:",
    numberedMessages
  ].join("\n");
}

// Names where support_buy has historically outperformed the family baseline (alpha dossier)
const HIGH_QUALITY_SUPPORT_NAMES = [
  "STAR", "ADANIENT", "HINDALCO", "GLENMARK", "CHENNPETRO", "ARVIND",
  "FACT", "HINDCOPPER", "GMDC", "PAYTM", "EICHERMOT", "GRSE", "BHEL", "KIRIINDUS"
];

// Names where support_buy reminder continuation has been weaker than expected
const WEAK_SUPPORT_NAMES = ["MCX", "HDFCBANK", "TCS", "BPCL", "VEDL", "INFY"];

function detectSetup(text: string): string | null {
  const t = text.toLowerCase();

  if (/\b(sell|avoid|short|turns weak|distribution|resistance|gaya samjho|dur rehna|dur hi rehna)\b/.test(t)) {
    return "constructive_resistance";
  }

  if (/\b(bib|breakout|fresh trigger|near trigger|only above.*not before)\b/.test(t) ||
      (/\babove\b/.test(t) && /\b(trigger)\b/.test(t))) {
    return "breakout_trigger";
  }

  if (/\b(buy|is a buy|fresh buy|accumulate)\b/.test(t)) {
    return "support_buy";
  }

  if (/\b(watch|holding for now|saved|zone)\b/.test(t)) {
    return "support_note";
  }

  return null;
}

export function scoreAlpha(text: string): { signal: AlphaSignal | null; setup: string | null } {
  const setup = detectSetup(text);
  const t = text.toLowerCase();
  const upper = text.toUpperCase();

  // "rem" gets expanded to "reminder" in cleaned text — check both
  const hasRem = /\b(rem|reminder)\b/.test(t);
  const hasBlindBuy = /\bblind\s*buy\b/.test(t);
  const hasMyCall = /\bmy\s*call\b/.test(t);
  const hasAddMore = /\badd\s*more\b/.test(t);
  const hasHighQualityName = HIGH_QUALITY_SUPPORT_NAMES.some((n) => upper.includes(n));
  const hasWeakName = WEAK_SUPPORT_NAMES.some((n) => new RegExp(`\\b${n}\\b`).test(upper));

  if (setup === "constructive_resistance") {
    // 90.7% useful rate — always high
    return { signal: "high", setup };
  }

  if (setup === "support_buy") {
    if (hasRem && hasHighQualityName) return { signal: "high", setup };
    if (hasRem) return { signal: "high", setup };
    if (hasBlindBuy) return { signal: "high", setup };
    // "my call" lift vanishes after setup-family control
    if (hasMyCall && !hasRem) return { signal: "downrank", setup };
    // weak names without rem underperform
    if (hasWeakName && !hasRem) return { signal: "downrank", setup };
    // add more without rem = little lift
    if (hasAddMore && !hasRem) return { signal: "caution", setup };
    if (hasHighQualityName) return { signal: "caution", setup };
    return { signal: null, setup };
  }

  if (setup === "breakout_trigger") {
    if (upper.includes("TCS")) return { signal: "downrank", setup };
    if (upper.includes("RELIANCE")) return { signal: "caution", setup };
    return { signal: null, setup };
  }

  if (setup === "support_note") {
    // watch_note / informational — useful rate 0-61%, down-weight
    return { signal: "caution", setup };
  }

  return { signal: null, setup: null };
}

export function heuristicRewrite(input: string) {
  const messages = parseAnalystInput(input);
  const sourceMessages = messages.length > 0 ? messages : [{ text: input.trim() }];

  const scoredLines: ScoredLine[] = sourceMessages
    .map((message) => {
      const cleaned = normalizeMessage(message.text);
      if (!cleaned) return null;
      const { signal, setup } = scoreAlpha(cleaned);
      return { cleaned, signal, setup };
    })
    .filter((line): line is ScoredLine => line !== null);

  return {
    cleanedText: scoredLines.map((l) => l.cleaned).join("\n"),
    cleanedMessages: scoredLines.map((l) => l.cleaned),
    scoredLines,
    parsedMessages: sourceMessages.length
  };
}

function finalizeMessage(message: ParsedAnalystMessage): ParsedAnalystMessage {
  return {
    ...message,
    text: message.text
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim()
  };
}

function normalizeMessage(text: string) {
  if (text.includes("\n")) {
    return text
      .split("\n")
      .map((line) => normalizeSingleLine(line))
      .filter(Boolean)
      .join("\n");
  }

  return normalizeSingleLine(text);
}

function normalizeSingleLine(text: string) {
  let value = text.normalize("NFKC");

  value = value
    .replace(/^\[[^\]]+\]\s*[^:]+:\s*/i, "")
    .replace(/<Media omitted>/gi, "")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\uFE0F\u200D]/g, "")
    .replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "")
    .replace(PROFANITY_PATTERN, "")
    .replace(/\.{3,}/g, ". ")
    .replace(/-{3,}/g, "-")
    .replace(/\/{2,}/g, "/")
    .replace(/\s+/g, " ");

  value = normalizeIndexAliases(value);

  for (const [pattern, replacement] of SHORTHAND_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }

  for (const [pattern, replacement] of COMMON_TEXT_FIXES) {
    value = value.replace(pattern, replacement);
  }

  value = value.replace(/\bgalti se agar (\d+(?:\.\d+)?) toda to\b/gi, "below $1");

  for (const [pattern, replacement] of PHRASE_REPLACEMENTS) {
    value = value.replace(pattern, replacement);
  }

  value = value
    .replace(/\bblindbuy\b/gi, "blind buy")
    .replace(/\bat\s+at\b/gi, "at")
    .replace(/\bto\s+be\s+bib\b/gi, "is a buy")
    .replace(/\bworth\s+entering\s+only\s+at\b/gi, "is worth entering only at")
    .replace(/\bdont\b/gi, "do not")
    .replace(/\binminent\b/gi, "imminent")
    .replace(/\bits\s+a\s+clear\s+buy\b/gi, "it is a clear buy")
    .replace(/\bfirst\s*\+/gi, "first buy")
    .replace(/\bke\s+pehle\b/gi, "before")
    .replace(/\bmein\b/gi, "")
    .replace(/\b(\d+(?:\.\d+)?)\s+se\s+(\d+(?:\.\d+)?)\s+Rs\s+milega\b/gi, "could move Rs $1-$2")
    .replace(/\b(\d+(?:\.\d+)?) above (?=(?:is|can|could|turns|turn|opens|looks))/gi, "above $1 ")
    .replace(/\b(\d+(?:\.\d+)?) below (?=(?:is|can|could|turns|turn|opens|looks|would))/gi, "below $1 ")
    .replace(/\bmy call\b/gi, "")
    .replace(/\bblind buy\b/gi, "buy")
    .replace(/\bon the verge of trigger\b/gi, "near trigger")
    .replace(/\bauto sell\b/gi, "automatic sell")
    .replace(/\bsaved so far\b/gi, "holding for now")
    .replace(/\bsaved fr now\b/gi, "holding for now")
    .replace(/\bnew low\b/gi, "at a new low")
    .replace(/\bnew high\b/gi, "at a new high")
    .replace(/\bjust dial\b/gi, "Just Dial")
    .replace(/\btrying\b/gi, "trying to stabilize")
    .replace(/\bto try & do\b/gi, "could move towards")
    .replace(/\bto try and do\b/gi, "could move towards")
    .replace(/\bfor a while below\b/gi, "below")
    .replace(/\bcan show\b/gi, "could see")
    .replace(/\blooks good fr\b/gi, "looks good for")
    .replace(/\bnearest supp\b/gi, "nearest support")
    .replace(/\bstrong supp\b/gi, "strong support")
    .replace(/\bauto buy\b/gi, "buy")
    .replace(/\bbreak out\b/gi, "breakout")
    .replace(/\bclassiest breakout\b/gi, "breakout")
    .replace(/\bclassiest break out\b/gi, "breakout")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+([,:-])/g, "$1")
    .replace(/([,:-])(?=\S)/g, "$1 ")
    .replace(/\.(?=[A-Za-z(])/g, ". ")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!value) {
    return "";
  }

  value = normalizeEmphasisCase(value);
  value = stripNoiseAndBoasts(value);
  value = rewriteStructuredLine(value);
  value = polishGeneralText(value);
  value = tidyClientCasing(value);

  if (!/[.!?]$/.test(value) && /[A-Za-z]/.test(value)) {
    value = `${value}.`;
  }

  return ensureSentenceCase(value);
}

function rewriteStructuredLine(text: string) {
  const trimmed = text.trim().replace(/\.$/, "");
  let match: RegExpMatchArray | null;

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)$/i);
  if (match) {
    const instrument = match[1].trim();
    if (!/\b(is a buy|nothing wrong with|is worth entering only|can add|our target|friday high|low|high)\b/i.test(instrument)) {
      return `${formatInstrumentName(instrument)} at ${normalizeLevel(match[2])}`;
    }
  }

  match = trimmed.match(/^low\s+([0-9./-]+)$/i);
  if (match) {
    return `Low so far is ${normalizeLevel(match[1])}`;
  }

  match = trimmed.match(/^low\s+([0-9./-]+)\s+so\s+far$/i);
  if (match) {
    return `Low so far is ${normalizeLevel(match[1])}`;
  }

  match = trimmed.match(/^low\s+([0-9./-]+)\.?\s+fresh\s+target\s+([0-9./-]+)\s+done$/i);
  if (match) {
    return `Low so far is ${normalizeLevel(match[1])}. Fresh target ${normalizeLevel(match[2])} done`;
  }

  match = trimmed.match(/^read\s+([A-Za-z][A-Za-z0-9&.\s-]+)\s+as\s+([0-9./-]+)$/i);
  if (match) {
    return `Read ${formatInstrumentName(match[1])} as ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+is\s+a\s+buy\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is a buy at ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+buy\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is a buy at ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+is\s+worth\s+entering\s+only\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is worth entering only at ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\.\s*the day it trades above\s+([0-9./-]+)\s+opens\s+now\s+for\s+(.+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])}. The day it trades above ${normalizeLevel(match[2])}, it opens room for ${normalizeTargetRange(match[3])}`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+above\s+([0-9./-]+)(?:\s*\(([^)]+)\))?\.?\s+opens\s+for\s+(.+)$/i);
  if (match) {
    const instrument = match[1];
    const level = normalizeLevel(match[2]);
    const emphasis = match[3] ? ` (${match[3]})` : "";
    return `${instrument} above ${level}${emphasis} opens room for ${normalizeIndexPath(match[4])}`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+below\s+([0-9./-]+)(?:\s*\(([^)]+)\))?\.?\s+opens\s+for\s+(.+)$/i);
  if (match) {
    const instrument = match[1];
    const level = normalizeLevel(match[2]);
    const emphasis = match[3] ? ` (${match[3]})` : "";
    return `${instrument} below ${level}${emphasis} opens room for ${normalizeIndexPath(match[4])}`;
  }

  match = trimmed.match(/^(?:no\s+)?(buy\s+in\s+)?(Nifty|Bank Nifty)\s+(?:call\s+)?(?:now\s+)?till\s+you\s+cross\s+([0-9./-]+)$/i);
  if (match) {
    const action = match[1] ? "buy in " : "";
    return `No ${action}${match[2]} call until ${match[3]} is crossed`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+below\s+([0-9./-]+)(?:\s+area)?\s+turns\s+weak(?:\s+(intraday))?$/i);
  if (match) {
    const intraday = match[3] ? " intraday" : "";
    return `${match[1]} turns weak below ${normalizeLevel(match[2])}${intraday}`;
  }

  match = trimmed.match(/^fresh\s+buy\s+in\s+(Nifty|Bank Nifty)\s+only\s+above\s+([0-9./-]+)\s+not\s+before$/i);
  if (match) {
    return `Fresh buy in ${match[1]} only above ${normalizeLevel(match[2])}, not before`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+low\s+([0-9./-]+)(?:\s+so\s+far)?\s+holding\s+for\s+now$/i);
  if (match) {
    return `${match[1]} is holding above ${normalizeLevel(match[2])} for now`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+high\s+([0-9./-]+)(?:\s+so\s+far)?$/i);
  if (match) {
    return `${match[1]} high so far is ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^above\s+([0-9./-]+)\s+area\s+(Nifty|Bank Nifty)\s+to\s+be\s+back\s+on\s+course$/i);
  if (match) {
    return `${match[2]} above ${normalizeLevel(match[1])} would be back on course`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)\s+is\s+(?:a\s+)?buy(?:\s+for\s+(.+))?$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    const level = match[2];
    const setup = normalizeTradeTail(match[3]);
    return `${instrument} above ${level} is a buy${setup ? ` for ${setup}` : ""}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+is\s+a\s+fresh\s+buy$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is a fresh buy`;
  }

  match = trimmed.match(/^can\s+buy\s+([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\s+for\s+(.+)\s+Rs\s+up move\.?$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} can be bought at ${normalizeLevel(match[2])} for a Rs ${normalizeTargetRange(match[3])} up move`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\s+to\s+do\s+([0-9./-]+)\s+Rs\s+more$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} at ${normalizeLevel(match[2])} could do Rs ${normalizeLevel(match[3])} more`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+first buy\s+at\s+([0-9./-]+)\.?\s+add more only at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} first buy at ${normalizeLevel(match[2])}. Add more only at ${normalizeLevel(match[3])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+can\s+be\s+bought\s+at\s+([0-9./-]+)\s+for\s+a\s+Rs\s+([0-9./\s-]+)\s+up move$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} can be bought at ${normalizeLevel(match[2])} for a Rs ${normalizeTargetRange(match[3])} up move`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+to\s+be\s+back\s+at\s+([0-9./-]+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} could recover towards ${match[2]}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+could\s+recover\s+towards\s+([0-9./-]+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} could recover towards ${match[2]}`;
  }

  match = trimmed.match(/^enter\s+([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\s+add more at\s+([0-9./-]+)\s+for\s+(.+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    const firstLevel = match[2];
    const secondLevel = match[3];
    const tail = normalizeTradeTail(match[4]);
    return `Enter ${instrument} near ${firstLevel}; add near ${secondLevel}${tail ? ` for ${tail}` : ""}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+below\s+([0-9./-]+)\s+would\s+turn\s+decisively\s+weak$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    const level = match[2];
    return `${instrument} turns weak below ${level}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+below\s+([0-9./-]+)\s+could\s+see\s+(.+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} below ${match[2]} could see ${normalizeTargetRange(match[3])}`;
  }

  match = trimmed.match(/^nothing\s+wrong\s+with\s+([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `Nothing wrong with ${formatInstrumentName(match[1])} at ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^below\s+([0-9./-]+)\s+opens\s+for\s+(.+)$/i);
  if (match) {
    return `Below ${match[1]} opens room for ${normalizeTargetRange(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)\s+opens\s+for\s+(.+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} above ${match[2]} opens room for ${normalizeTargetRange(match[3])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+([0-9./-]+)\.?\s+max\s+seen\s+([0-9./-]+)\s+as\s+stated$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} at ${normalizeLevel(match[2])}. Max seen ${normalizeLevel(match[3])} as stated`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+near\s+trigger$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is close to a trigger`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+nearing\s+fresh\s+trigger$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is nearing a fresh trigger`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+on\s+the\s+verge\s+of\s+fresh\s+trigger$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is on the verge of a fresh trigger`;
  }

  match = trimmed.match(/^above\s+a\s+(?:class\s+)?trigger\s+awaits$/i);
  if (match) {
    return "A trigger awaits above";
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+trying(?:\s+to\s+stabilize)?$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is trying to stabilize`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+holding\s+for\s+now$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is holding for now`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+low\s+([0-9./-]+)\.?\s+is\s+holding\s+for\s+now$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is holding above ${match[2]} for now`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+high\s+([0-9./-]+)\.?\s+is\s+holding\s+for\s+now$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is holding below ${match[2]} for now`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+(\d+(?:\.\d+)?)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    const level = match[2];
    return `${instrument} at ${level}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+triggered$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} has triggered`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+still\s+holds\s+([0-9.kK\s]+)$/i);
  if (match) {
    return `${match[1]} still holds ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+below\s+([0-9./-]+)\s+more so\s+([0-9.kK\s]+)\s+(?:could|can)\s+see\s+(.+)$/i);
  if (match) {
    return `${match[1]} below ${normalizeLevel(match[2])}, more so ${normalizeLevel(match[3])}, could see ${normalizeTargetRange(match[4])}`;
  }

  match = trimmed.match(/^at\s+([0-9./-]+)\s+([A-Za-z][A-Za-z0-9&.\s-]+)\s+can\s+be\s+a\s+surprise\s+stock(?:\.\s*likely\s+(.+))?$/i);
  if (match) {
    const instrument = formatInstrumentName(match[2]);
    const target = match[3] ? `, with ${normalizeTargetRange(match[3])} possible` : "";
    return `${instrument} at ${normalizeLevel(match[1])} can surprise on the upside${target}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+low\s+([0-9./-]+)\.?\s+our\s+support\s+([0-9./-]+)\s+holds$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} low is ${normalizeLevel(match[2])}. Support at ${normalizeLevel(match[3])} holds`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+([0-9./-]+)\s+before\s+dikhna\s+bhi\s+mat$/i);
  if (match) {
    return `Do not look at ${formatInstrumentName(match[1].replace(/\.$/, ""))} before ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+([0-9./-]+)\s+miles and miles to go yet$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} at ${normalizeLevel(match[2])}. More upside remains`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\s+can\s+do\s+([0-9./-]+)\s+area-([0-9./-]+)\.?\s*done$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} at ${normalizeLevel(match[2])} could do ${normalizeLevel(match[3])}-${normalizeLevel(match[4])}. Done`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+low\s+([0-9./-]+)\.?\s+no\s+weakness\s+till\s+you\s+breach\s+this\s+level.*$/i);
  if (match) {
    return `${match[1]} low is ${normalizeLevel(match[2])}. No weakness until this level is breached`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+our\s+target\s+of\s+([0-9./-]+)\s+through\.?\s+above\s+it\s+is\s+a\s+clear\s+buy\s+for\s+(.+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} target of ${normalizeLevel(match[2])} is through. Above that, it is a clear buy for ${normalizeTradeTail(match[3])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)\s+is\s+a\s+clean\s+buy\.?\s+likely\s+(.+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])} is a clean buy. Likely ${normalizeTargetRange(match[3])}`;
  }

  match = trimmed.match(/^can\s+add\s+(Nifty|Bank Nifty)\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `Can add ${match[1]} at ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^(Nifty|Bank Nifty)\s+([0-9./-]+)\s+high$/i);
  if (match) {
    return `${match[1]} high so far is ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+friday\s+high\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} Friday high is ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\s+opens\s+for\s+([0-9./-]+)\s+to\s+([0-9./-]+)\s+Rs\s+up move imminent$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])} opens room for a Rs ${normalizeLevel(match[3])}-${normalizeLevel(match[4])} up move`;
  }

  match = trimmed.match(/^at\s+([0-9./-]+)\s+(.+?)\s+to\s+be\s+bib\s+as\s+buy[\s\S]*?cmp\s+([0-9./-]+)[\s\S]*?blind\s+add\s+on\s+at\s+([0-9./-]+)\.?$/i);
  if (match) {
    return `${formatInstrumentName(match[2])} at ${normalizeLevel(match[1])} is a buy. CMP ${normalizeLevel(match[3])}. Blind add on at ${normalizeLevel(match[4])}`;
  }

  match = trimmed.match(/^at\s+([0-9./-]+)\s+(.+?)\s+to\s+be\s+bib\s+as\s+buy[\s\S]*?cmp\s+([0-9./-]+)[\s\S]*?add\s+on\s+at\s+([0-9./-]+)\.?$/i);
  if (match) {
    return `${formatInstrumentName(match[2])} at ${normalizeLevel(match[1])} is a buy. CMP ${normalizeLevel(match[3])}. Add on at ${normalizeLevel(match[4])}`;
  }

  match = trimmed.match(/^at\s+([0-9./-]+)\s+([A-Za-z][A-Za-z0-9&.\s-]+?)\s+to\s+be\s+bib\s+as\s+buy\.?\s*reminder\.?\s*cmp\s+([0-9./-]+)\.?\s*buy\s+add\s+on\s+at\s+([0-9./-]+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[2]);
    return `${instrument} at ${normalizeLevel(match[1])} is a buy. CMP ${normalizeLevel(match[3])}. Add on at ${normalizeLevel(match[4])}`;
  }

  match = trimmed.match(/^at\s+([0-9./-]+)\s+([A-Za-z][A-Za-z0-9&.\s-]+?)\s+to\s+be\s+bib\s+as\s+buy\.?\s*reminder\.?\s*cmp\s+([0-9./-]+)\.?\s*blind\s+add\s+on\s+at\s+([0-9./-]+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[2]);
    return `${instrument} at ${normalizeLevel(match[1])} is a buy. CMP ${normalizeLevel(match[3])}. Blind add on at ${normalizeLevel(match[4])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+?)\s+at\s+([0-9./-]+)\s+to\s+do\s+([0-9./-]+)\s+imminent\.?\s*reminder\.?\s*cmp\s+([0-9./-]+)\.?\s*above\s+([0-9./-]+)\s+to\s+do\s+([0-9./-]+)(?:\.\s*(?:my\s+fresh\s+call\s+)?reminder)?$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} at ${normalizeLevel(match[2])} could do ${normalizeTargetRange(match[3])} imminently. CMP ${normalizeLevel(match[4])}. Above ${normalizeLevel(match[5])}, it could do ${normalizeTargetRange(match[6])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)\s+opens\s+for\s+([0-9./-]+)\.?\s*earliest\s+entry\s+([0-9./-]+)\.?\s*now\s+above\s+([0-9./-]+)\s+it\s+shall\s+move\s+towards\s+(.+)$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} above ${normalizeLevel(match[2])} opens room for ${normalizeTargetRange(match[3])}. Earliest entry ${normalizeLevel(match[4])}. Above ${normalizeLevel(match[5])}, it could move towards ${normalizeTargetRange(match[6])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+if\s+crosses\s+([0-9.kK./-]+)\s+opens\s+for\s+(.+?)\.?\s+high\s+([0-9./-]+)\.?\s+i\s+am\s+revising\s+my\s+target\s+to\s+(.+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])} opens room for ${normalizeTargetRange(match[3])}. High so far is ${normalizeLevel(match[4])}. Revised target ${normalizeTargetRange(match[5])}`;
  }

  match = trimmed.match(/^buy\s+([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\.?\s+is\s+a\s+buy\s+at\s+([0-9./-]+)\.?\s+blind\s+add\s+on\s+at\s+([0-9./-]+)\s+for\s+(.+)$/i);
  if (match) {
    return `Buy ${formatInstrumentName(match[1])} at ${normalizeLevel(match[2])}. Add near ${normalizeLevel(match[3])}. Blind add on at ${normalizeLevel(match[4])} for ${normalizeTradeTail(match[5])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)\s+could\s+move\s+Rs\s+([0-9./-]+)-([0-9./-]+)\.?\s+CMP\s+([0-9./-]+).*$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])} could move Rs ${normalizeLevel(match[3])}-${normalizeLevel(match[4])}. CMP ${normalizeLevel(match[5])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\.?\s+our\s+target\s+([0-9./-]+)\s+anything\s+above\s+i\s+see\s+([0-9./-]+)\s+plus\.?\s+CMP\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} target is ${normalizeLevel(match[2])}. Above that, it could see ${normalizeLevel(match[3])} plus. CMP ${normalizeLevel(match[4])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\.?\s+our\s+target\s+([0-9./-]+)\s+anything\s+above\s+i\s+see\s+([0-9./-]+)\s+plus\.?\s*cmp\s+at\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} target is ${normalizeLevel(match[2])}. Above that, it could see ${normalizeLevel(match[3])} plus. CMP ${normalizeLevel(match[4])}`;
  }

  match = trimmed.match(/^\(([0-9./-]+)\)\s+is\s+your\s+benchmark\s+support\.?\s+strong\s+market\s+do\s+not\s+breach\s+([0-9./-]+)$/i);
  if (match) {
    return `(${normalizeTargetRange(match[1])}) is your benchmark support. A strong market should not breach ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^low\s+([0-9./-]+)\s+so\s+far\.?\s+we\s+hold\s+all\s+our\s+crucials$/i);
  if (match) {
    return `Low so far is ${normalizeLevel(match[1])}. All crucial levels are holding`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+at\s+([0-9./-]+)\s+is\s+now\s+a\s+fresh\s+buy\.?\s+likely\s+to\s+attempt\s+above$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} at ${normalizeLevel(match[2])} is now a fresh buy`;
  }

  match = trimmed.match(/^well\s+either\s+side\s+triggers\s+are\s+([0-9./-]+)\.?\s*upside\s+we\s+all\s+know\.?\s*now\s+below\s+([0-9./-]+)\s+we\s+can\s+be\s+as\s+bad\s+as\s+(.+)$/i);
  if (match) {
    return `Either-side triggers are ${normalizeTargetRange(match[1])}. Now below ${normalizeLevel(match[2])}, it could weaken towards ${normalizeTargetRange(match[3])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+is\s+buy\s+at\s+([0-9./-]+)\.?\s*reminder$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is a buy at ${normalizeLevel(match[2])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+above\s+([0-9./-]+)\s+could\s+move\s+rs\s+([0-9./-]+)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])} could move Rs ${normalizeLevel(match[3])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+?)\.?\s+maa kasam jis din yeh stock ne\s+([0-9./-]+)\s+cross kiya sidha\s+([0-9./-]+)\s+rs badhega$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} above ${normalizeLevel(match[2])} could move Rs ${normalizeLevel(match[3])}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+sitting\s+on\s+the\s+verge\s+of\s+(?:its\s+)?breakout$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is on the verge of a breakout`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+all\s+our\s+targets?\s+(?:through|thru)\s+trading\s+way\s+above$/i);
  if (match) {
    const instrument = formatInstrumentName(match[1]);
    return `${instrument} is trading well above all our targets`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+new\s+high\s+(\d+(?:\.\d+)?)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is at a new high of ${match[2]}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+(\d+(?:\.\d+)?)\s+new\s+high$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is at a new high of ${match[2]}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+new\s+low\s+(\d+(?:\.\d+)?)$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is at a new low of ${match[2]}`;
  }

  match = trimmed.match(/^([A-Za-z][A-Za-z0-9&.\s-]+)\s+(\d+(?:\.\d+)?)\s+new\s+low$/i);
  if (match) {
    return `${formatInstrumentName(match[1])} is at a new low of ${match[2]}`;
  }

  return trimmed;
}

function polishGeneralText(text: string) {
  let value = text
    .replace(
      /^AT\s+([0-9./-]+)\s+(.+?)\s+TO\s+BE\s+BIB\s+AS\s+BUY\.\s*REMINDER\.\s*CMP\s+([0-9./-]+)\.\s*BLIND\s+ADD\s+ON\s+AT\s+(?:AT\s+)?([0-9./-]+)\.?$/i,
      (_match, level, instrument, cmp, addOn) =>
        `${formatInstrumentName(instrument)} at ${normalizeLevel(level)} is a buy. CMP ${normalizeLevel(cmp)}. Blind add on at ${normalizeLevel(addOn)}`
    )
    .replace(
      /^AT\s+([0-9./-]+)\s+(.+?)\s+TO\s+BE\s+BIB\s+AS\s+BUY\.\s*REMINDER\.\s*CMP\s+([0-9./-]+)\.\s*ADD\s+ON\s+AT\s+(?:AT\s+)?([0-9./-]+)\.?$/i,
      (_match, level, instrument, cmp, addOn) =>
        `${formatInstrumentName(instrument)} at ${normalizeLevel(level)} is a buy. CMP ${normalizeLevel(cmp)}. Add on at ${normalizeLevel(addOn)}`
    )
    .replace(
      /^.*?\b(NO\s+(?:BUY\s+IN\s+)?(?:Nifty|Bank Nifty)(?:\s+CALL)?(?:\s+NOW)?\s+TILL\s+YOU\s+CROSS(?:\s+AT)?\s+[0-9./-]+)\b.*$/i,
      (_match, clause) => normalizeNoCallClause(clause)
    )
    .replace(/\bNO FRESH SELL IN ANY STOCK TILL YOU BREACH MORNING LOWS\b/gi, "No fresh sell signal unless morning lows are breached")
    .replace(
      /\bstocks which have breached their morning lows are automatic sell\b/gi,
      "stocks that have already breached their morning lows remain automatic sells"
    )
    .replace(
      /^Best part of today's market is no fresh sell signal unless morning lows are breached\.?\s+and\s+stocks that have already breached their morning lows remain automatic sells$/i,
      "No fresh sell signal unless morning lows are breached; stocks already below their morning lows remain automatic sells"
    )
    .replace(
      /^Best part of today's mkt is no fresh sell signal unless morning lows are breached\.?\s+and\s+stocks that have already breached their morning lows remain automatic sells$/i,
      "No fresh sell signal unless morning lows are breached; stocks already below their morning lows remain automatic sells"
    )
    .replace(/\bapplies to indices as well\b/gi, "Applies to indices as well")
    .replace(/\bcan be a surprise mover\b/gi, "can surprise on the upside")
    .replace(/\bturns risky again\b/gi, "turns risky again")
    .replace(/\bopens for\b/gi, "opens for")
    .replace(
      /\b([0-9./-]+)\s+AREA\s+ABOVE\s+IS\s+A\s+TRIGGER\s+FOR\s+(Nifty|Bank Nifty)\s+NO IFS AND BUTS\b/gi,
      (_match, level, instrument) => `${instrument} above ${level} is a trigger`
    )
    .replace(/\bnot bad at all\b/gi, "looks constructive")
    .replace(/\bhimmat karo\b/gi, "can be bought with conviction")
    .replace(/\bdur rehna\b/gi, "avoid")
    .replace(/\bdur hi rehna\b/gi, "avoid")
    .replace(/\bsaved so far\b/gi, "is holding for now")
    .replace(/\bsaved fr now\b/gi, "is holding for now")
    .replace(/\bNO\s+(Nifty|Bank Nifty)\s+CALL(?:\s+NOW)?\s+TILL\s+YOU\s+CROSS(?:\s+AT)?\s+([0-9./-]+)\b/gi, "No $1 call until $2 is crossed")
    .replace(/\bNO\s+BUY\s+IN\s+(Nifty|Bank Nifty)\s+TILL\s+YOU\s+CROSS(?:\s+AT)?\s+([0-9./-]+)\b/gi, "No buy in $1 until $2 is crossed")
    .replace(/\bmy\s+call\s+reminder\b/gi, "")
    .replace(/\bmy\s+call\s+rem\b/gi, "")
    .replace(/\bmy\s+fresh\s+call\s+reminder\b/gi, "")
    .replace(/\bmy\s+fresh\s+call\s+rem\b/gi, "")
    .replace(/\breminder\b/gi, "")
    .replace(/\bnow\s+above\b/gi, "above")
    .replace(/\bnow\s+below\b/gi, "below")
    .replace(/\blooks good for\s+([^.]+)/gi, (_match, tail) => {
      const normalizedTail = normalizeTradeTail(tail);
      return `looks good for ${normalizedTail}`;
    })
    .replace(/\bfor\s+for\b/gi, "for")
    .replace(/\brefer\s+for\s+targets\b/gi, "")
    .replace(/\bthrough\b/gi, "through")
    .replace(/\bit\s+shall\s+move\s+towards\b/gi, "it could move towards")
    .replace(/\bupside\s+we\s+all\s+know\b/gi, "")
    .replace(
      /^([A-Za-z][A-Za-z0-9&.\s-]+)\.?\s+our\s+target\s+([0-9./-]+)\s+anything\s+above\s+i\s+see\s+([0-9./-]+)\s+plus\.?\s*cmp\s+at\s+([0-9./-]+)$/i,
      (_match, instrument, target, aboveTarget, cmp) =>
        `${formatInstrumentName(instrument)} target is ${normalizeLevel(target)}. Above that, it could see ${normalizeLevel(aboveTarget)} plus. CMP ${normalizeLevel(cmp)}`
    )
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .replace(/\s+\./g, ".")
    .trim();

  value = value.replace(/\b([A-Za-z][A-Za-z0-9&.\s-]+?)\s+Bank\b/g, (_match, left) => `${formatInstrumentName(left)} Bank`);
  value = capitalizeSentenceStarts(value);

  return value;
}

function normalizeTradeTail(tail?: string) {
  if (!tail) {
    return "";
  }

  return tail
    .replace(/\bcorrective up move\b/gi, "a corrective up move")
    .replace(/\b(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+Rs\s+up move\b/gi, "a Rs $1-$2 up move")
    .replace(/\b(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\s+up move\b/gi, "a $1-$2 up move")
    .replace(/\b(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\b/gi, "$1-$2")
    .replace(/\binminent\b/gi, "imminent")
    .replace(/\bprob\b/gi, "likely")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeTargetRange(value: string) {
  return value
    .replace(/\barea\b/gi, "")
    .replace(/\blevels\b/gi, "")
    .replace(/\b(\d+(?:\.\d+)?)\s+to\s+(\d+(?:\.\d+)?)\b/gi, "$1-$2")
    .replace(/\s*\/\s*/g, "/")
    .replace(/-{2,}/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function normalizeIndexAliases(value: string) {
  return value
    .replace(/\bBANK\s+NIFTY\b/gi, "Bank Nifty")
    .replace(/\bBNK\b/gi, "Bank Nifty")
    .replace(/\bBN\b/gi, "Bank Nifty")
    .replace(/\bNIFTY\b/gi, "Nifty")
    .replace(/\bMKT\b(?=\s+(?:above|below|low|high|turns|opens|saved|save|must|only|needs|reclaiming|makes|no)\b)/gi, "Nifty");
}

function normalizeIndexPath(value: string) {
  let normalized = value
    .replace(/\breminder\b/gi, "")
    .replace(/\bfurther\b/gi, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s*-\s*/g, "-")
    .replace(/\.+/g, ". ")
    .replace(/\s*\(\s*/g, " (")
    .replace(/\s*\)\s*/g, ") ")
    .replace(/\s{2,}/g, " ")
    .trim();

  for (const label of INDEX_ZONE_LABELS) {
    const pattern = new RegExp(`\\(\\s*${label}\\s*\\)`, "gi");
    normalized = normalized.replace(pattern, ` as the ${label}`);
  }

  return normalized.replace(/\s+\./g, ".").trim();
}

function normalizeNoCallClause(value: string) {
  return value
    .replace(/\bNO\s+(Nifty|Bank Nifty)\s+CALL(?:\s+NOW)?\s+TILL\s+YOU\s+CROSS(?:\s+AT)?\s+([0-9./-]+)\b/gi, (_m, i, l) => `No ${i} call until ${normalizeLevel(l)} is crossed`)
    .replace(/\bNO\s+BUY\s+IN\s+(Nifty|Bank Nifty)\s+TILL\s+YOU\s+CROSS(?:\s+AT)?\s+([0-9./-]+)\b/gi, (_m, i, l) => `No buy in ${i} until ${normalizeLevel(l)} is crossed`)
    .trim();
}

function normalizeLevel(value: string) {
  const normalized = value.replace(/\.$/, "").replace(/\s+/g, "").trim();

  if (/^\d+(?:\.\d+)?[kK]$/.test(normalized)) {
    const numeric = Number(normalized.slice(0, -1));
    if (Number.isFinite(numeric)) {
      return String(numeric * 1000);
    }
  }

  return normalized;
}

function formatInstrumentName(value: string) {
  const INSTRUMENT_ALIASES: Record<string, string> = {
    "DANI PORT": "Adani Port",
    "ADANI PORT": "Adani Port",
    HIRECT: "HIRECT",
    "MANDM FIN": "M and M Finance",
    "M ANDM FIN": "M and M Finance",
    "M AND M FIN": "M and M Finance"
  };
  const WORD_OVERRIDES: Record<string, string> = {
    INDS: "Inds",
    TECH: "Tech",
    APP: "App"
  };
  const normalizedValue = value.trim().replace(/\s+/g, " ");
  const aliasKey = normalizedValue.replace(/[.,]+$/g, "").toUpperCase();

  if (INSTRUMENT_ALIASES[aliasKey]) {
    return INSTRUMENT_ALIASES[aliasKey];
  }

  const tokens = normalizedValue.split(" ").filter(Boolean);
  const alphaTokens = tokens.map((part) => part.replace(/[.,]+$/g, "")).filter((part) => /[A-Za-z]/.test(part));
  const isCompactUpperAlias =
    alphaTokens.length > 0 &&
    alphaTokens.every((part) => /^[A-Z]{1,5}$/.test(part));

  if (isCompactUpperAlias) {
    return normalizedValue;
  }

  return normalizedValue
    .trim()
    .split(/\s+/)
    .map((part) => {
      const cleaned = part.replace(/[.,]+$/g, "");
      const suffix = part.slice(cleaned.length);

      if (!cleaned) {
        return part;
      }

      if (/^nifty$/i.test(cleaned)) {
        return `Nifty${suffix}`;
      }

      if (/^bank$/i.test(cleaned)) {
        return `Bank${suffix}`;
      }

      if (/^[A-Z]{1,4}$/.test(cleaned) || /^\d+(?:\.\d+)?$/.test(cleaned)) {
        if (WORD_OVERRIDES[cleaned]) {
          return `${WORD_OVERRIDES[cleaned]}${suffix}`;
        }
        return `${cleaned}${suffix}`;
      }

      if (/^[A-Z]{5,}$/.test(cleaned)) {
        return `${cleaned.charAt(0)}${cleaned.slice(1).toLowerCase()}${suffix}`;
      }

      return `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1).toLowerCase()}${suffix}`;
    })
    .join(" ");
}

function ensureSentenceCase(text: string) {
  if (!text) {
    return "";
  }

  const firstAlphaIndex = text.search(/[A-Za-z]/);

  if (firstAlphaIndex === -1) {
    return text;
  }

  return (
    text.slice(0, firstAlphaIndex) +
    text.charAt(firstAlphaIndex).toUpperCase() +
    text.slice(firstAlphaIndex + 1)
  );
}

function capitalizeSentenceStarts(text: string) {
  return text.replace(/(^|[.!?]\s+)([a-z])/g, (_match, prefix, char) => `${prefix}${char.toUpperCase()}`);
}

function normalizeEmphasisCase(text: string) {
  const LOWERCASE_UPPER_WORDS = new Set([
    "AT", "ABOVE", "BELOW", "ONLY", "FOR", "IS", "A", "AN", "THE", "TO", "BE", "BUY", "FRESH",
    "CLEAR", "WORTH", "ENTERING", "NOTHING", "WRONG", "WITH", "OF", "OUR", "TARGET", "TARGETS",
    "THROUGH", "LIKELY", "MOVE", "MOVES", "OPENS", "AREA", "ARE", "AND", "STILL", "HOLDS",
    "TRUE", "DONE", "NOW", "PLUS", "IF", "CROSSES", "BLIND", "ADD", "ON", "CAN", "CALL", "MASTER",
    "FIRST", "HIGH", "LOW", "SUPPORT", "WEAKNESS", "TILL", "BREACH", "THIS", "LEVEL", "NO"
  ]);

  return text.replace(/\b[A-Z]{2,}\b/g, (word) => {
    if (LOWERCASE_UPPER_WORDS.has(word)) {
      return word.toLowerCase();
    }

    return word;
  });
}

function tidyClientCasing(text: string) {
  return text
    .replace(/\bIs A Buy\b/g, "is a buy")
    .replace(/\bIs Worth Entering Only\b/g, "is worth entering only")
    .replace(/\bNothing Wrong With\b/g, "Nothing wrong with")
    .replace(/\bCan Add\b/g, "Can add")
    .replace(/\bOur Target\b/g, "Our target")
    .replace(/\bAnything Above I See\b/g, "Anything above I see")
    .replace(/\bFriday High\b/g, "Friday high")
    .replace(/Friday high at/gi, "Friday high is")
    .replace(/Friday high is at/gi, "Friday high is")
    .replace(/\bFirst Buy At\b/g, "first buy at")
    .replace(/\bAdd More Only at\b/g, "add more only at")
    .replace(/\bPlus\b/g, "plus")
    .replace(/\bAt At\b/g, "at")
    .replace(/\bAt at\b/g, "at")
    .replace(
      /^([A-Za-z][A-Za-z0-9&.\s-]+)\.\s+Our target\s+([0-9./-]+)\s+Anything above I see\s+([0-9./-]+)\s+plus\.\s+CMP at\s+([0-9./-]+)\.?$/i,
      (_match, instrument, target, aboveTarget, cmp) =>
        `${formatInstrumentName(instrument)} target is ${normalizeLevel(target)}. Above that, it could see ${normalizeLevel(aboveTarget)} plus. CMP ${normalizeLevel(cmp)}`
    );
}

function stripNoiseAndBoasts(text: string) {
  return text
    .replace(/\bi insist\b.*$/i, "")
    .replace(/\bmy golden call\b.*$/i, "")
    .replace(/\bmy abusive call\b.*$/i, "")
    .replace(/\bwhy am i so good\b.*$/i, "")
    .replace(/\bwhat a sell call boss\b.*$/i, "")
    .replace(/\bhats off bimal\b.*$/i, "")
    .replace(/\bwith what ease v are doing our job\b.*$/i, "")
    .replace(/\bwith what ease we are doing our job\b.*$/i, "")
    .replace(/\bwith what ease we do our job\b.*$/i, "")
    .replace(/\bkabhi kabhi khud ki taarif.*$/i, "")
    .replace(/\bmereko jo dikhta hai woh hota hai\b.*$/i, "")
    .replace(/\bisko bada aadmi.*$/i, "")
    .replace(/\bmy fresh call reminder\b.*$/i, "")
    .replace(/\bmy fresh call rem\b.*$/i, "")
    .replace(/\?{2,}/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\./g, ".")
    .trim();
}
