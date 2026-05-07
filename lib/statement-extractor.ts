import { PDFParse } from "pdf-parse";

export type StatementDocument = {
  name: string;
  type?: string;
  text: string;
};

export type StatementTransaction = {
  id: string;
  sourceFile: string;
  date: string;
  description: string;
  merchant: string;
  category: string;
  amount: number;
  kind: "debit" | "credit";
  includeInSpend: boolean;
  confidence: "high" | "medium" | "low";
  rawLine: string;
};

export type SummaryRow = {
  label: string;
  category?: string;
  amount: number;
  transactionCount: number;
};

export type ComparisonRow = {
  label: string;
  category?: string;
  totalAmount: number;
  transactionCount: number;
  amountsByFile: Record<string, number>;
};

export type StatementExtractionResult = {
  files: Array<{
    name: string;
    transactionCount: number;
  }>;
  transactions: StatementTransaction[];
  spendTransactions: StatementTransaction[];
  categorySummary: SummaryRow[];
  merchantSummary: SummaryRow[];
  shoppingBreakdown: SummaryRow[];
  categoryComparison: ComparisonRow[];
  merchantComparison: ComparisonRow[];
  uncertainTransactions: StatementTransaction[];
  totals: {
    grossSpend: number;
    refundsAndCredits: number;
    paymentsExcluded: number;
    netSpend: number;
    merchantCount: number;
  };
  warnings: string[];
};

type MerchantRule = {
  merchant: string;
  category: string;
  pattern: RegExp;
  includeInSpend?: boolean;
  confidence?: StatementTransaction["confidence"];
};

type MerchantMeta = {
  merchant: string;
  category: string;
  includeInSpend: boolean;
  confidence: StatementTransaction["confidence"];
};

type ParsedAmountToken = {
  amount: number;
  kind: "debit" | "credit";
};

const MONTH_TOKEN =
  "(?:JAN|JANUARY|FEB|FEBRUARY|MAR|MARCH|APR|APRIL|MAY|JUN|JUNE|JUL|JULY|AUG|AUGUST|SEP|SEPT|SEPTEMBER|OCT|OCTOBER|NOV|NOVEMBER|DEC|DECEMBER)";
const DATE_TOKEN =
  `(?:\\d{1,2}[/-]\\d{1,2}(?:[/-]\\d{2,4})?|\\d{1,2}\\s+${MONTH_TOKEN}(?:\\s+\\d{2,4})?|${MONTH_TOKEN}\\s+\\d{1,2}(?:,?\\s+\\d{4})?)`;
const LEADING_DATE_PATTERN = new RegExp(`^(${DATE_TOKEN})(?:\\s*\\|\\s*|\\s+)(?:(${DATE_TOKEN})(?:\\s*\\|\\s*|\\s+))?`, "i");
const AMOUNT_PATTERN = /(?:INR|RS\.?)?\s*\(?[+-]?\d[\d,]*\.\d{2}\)?(?:\s?(?:CR|DR))?/gi;
const DUAL_AMOUNT_PATTERN =
  /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+(\d[\d,]*\.\d{2})\s+(DR|CR)\s+(\d[\d,]*\.\d{2})\s+(DR|CR)$/i;
const SINGLE_AMOUNT_ROW_PATTERN =
  /^(\d{2}\/\d{2}\/\d{4})\s+(.*?)\s+(\d[\d,]*\.\d{2})\s+(DR|CR)$/i;
const COMPLETE_TRANSACTION_LINE_PATTERN =
  /(?:\+|-)?\s*[A-Z]?\s*\d[\d,]*\.\d{2}\s*(?:CR|DR|[A-Z])?$/i;

const NON_TRANSACTION_PATTERNS = [
  /TOTAL AMOUNT DUE/,
  /MINIMUM AMOUNT DUE/,
  /PAYMENT DUE DATE/,
  /CREDIT LIMIT/,
  /AVAILABLE LIMIT/,
  /AVAILABLE CASH LIMIT/,
  /OPENING BALANCE/,
  /CLOSING BALANCE/,
  /STATEMENT SUMMARY/,
  /STATEMENT OF ACCOUNT/,
  /REWARD POINT/,
  /THIS MONTH/,
  /PREVIOUS BALANCE/,
  /TOTAL PURCHASE/,
  /TOTAL PAYMENT/,
  /TOTAL CREDITS/,
  /TOTAL DEBITS/,
  /INTEREST CHARGED/,
  /CASH POINT/,
  /CUSTOMER CARE/,
  /AUTODEBIT STATUS/,
  /EMAIL ID/,
  /GSTIN/,
  /PAGE \d+/,
  /ACCOUNT NUMBER/,
  /CARD NUMBER/,
  /MEMBER SINCE/,
  /REWARDS PROGRAM POINTS SUMMARY/,
  /CASH BACK SUMMARY/,
  /SMART EMI LOAN SUMMARY/,
  /GST SUMMARY/,
  /ELIGIBLE FOR EMI TRANSACTIONS/,
  /TRANSACTION TIME CAPTURED IN IST ZONE/,
  /REWARD POINTS_ON_/,
  /POINTS EXPIRING IN/,
  /IMPORTANT INFORMATION/,
  /BENEFITS ON YOUR CARD/,
  /USEFUL LINKS/,
  /STATEMENT & PAYMENT/
];

const HARD_SECTION_BREAK_PATTERNS = [
  /^PAGE \d+ OF \d+/,
  /^-- \d+ OF \d+ --$/,
  /^DOMESTIC TRANSACTIONS$/,
  /^INTERNATIONAL TRANSACTIONS$/,
  /^DATE & TIME TRANSACTION DESCRIPTION REWARDS AMOUNT PI$/,
  /^TOTAL AMOUNT$/,
  /^TOTAL$/,
  /^REWARDS PROGRAM POINTS SUMMARY$/,
  /^SR NO\. PROGRAMS BONUS POINTS$/,
  /^CASH BACK SUMMARY$/,
  /^SR NO\. TRANSACTION AMOUNT$/,
  /^SMART EMI LOAN SUMMARY$/,
  /^EMI BALANCES$/,
  /^GST SUMMARY$/,
  /^IGST CGST SGST REVERSAL TOTAL GST$/,
  /^IMPORTANT INFORMATION$/,
  /^BENEFITS ON YOUR CARD$/,
  /^OFFERS ON YOUR CARD$/,
  /^USEFUL LINKS$/,
  /^STATEMENT & PAYMENT$/,
  /^\*TRANSACTION TIME CAPTURED IN IST ZONE\.?$/,
  /^ELIGIBLE FOR EMI TRANSACTIONS$/,
  /^TANISH U BROKER$/,
  /^UDAYAN BROKER$/
];

const MERCHANT_RULES: MerchantRule[] = [
  {
    merchant: "Cashback Earned",
    category: "Cashback & Rewards",
    pattern: /CASHBACK\s+CREDIT|CASHBACK\s+FOR\s+REDEMPTION|CASHBACK\s+REDEMPTION/,
    includeInSpend: false
  },
  { merchant: "EMI Principal", category: "EMI Principal", pattern: /EMI\s+PRINCIPAL|OFFUS\s+EMI,PRIN|EMI[, ]+PRIN\b/ },
  { merchant: "EMI Interest", category: "EMI Interest", pattern: /EMI\s+INTEREST|OFFUS\s+EMI,INT|EMI[, ]+INT\b/ },
  { merchant: "Bank Fee", category: "Fees & Charges", pattern: /CONSOLIDATED\s+FCY\s+MARKUP\s+FEE|IGST-VPS|CASHBACK\s+REDEMPTION\s+FEE/ },
  { merchant: "Adani Electricity", category: "Utilities & Bills", pattern: /ADANIELEC|ADANI\s*ELEC/ },
  { merchant: "Life Insurance Corporation", category: "Insurance", pattern: /LIFE\s*INSURANCE\s*CORPORATIO|LIFE\s*INSURANCE\s*CORPORATION|\bLIC\b/ },
  { merchant: "Amar Medical Stores", category: "Healthcare", pattern: /AMAR\s*MEDICAL/ },
  { merchant: "Sheth K C Parik", category: "Medical", pattern: /SHETH\s*K\s*C\s*PARIK|B A N SHETH/ },
  { merchant: "Bharatiya Arogya Nidh", category: "Healthcare", pattern: /BHARATIYA\s*AROGYA\s*NIDH/ },
  { merchant: "Alfa", category: "Alfa", pattern: /\bALFA\b/ },
  { merchant: "Pankaj Textiles", category: "Shopping", pattern: /PANKAJ\s*TEXTILES/ },
  { merchant: "Hi Touch", category: "Shopping", pattern: /HI\s*TOUCH/ },
  { merchant: "Trenzs Unisex Salon", category: "Personal Care", pattern: /TRENZS?\s*UNISEX\s*SALON/ },
  { merchant: "Reflection Salon", category: "Personal Care", pattern: /REFLECTION\s*SALON/ },
  { merchant: "S R Shetty and Sons", category: "Restaurants & Cafes", pattern: /S\s*R\s*SHETTY\s*AND\s*SONS/ },
  { merchant: "Swati Snacks", category: "Restaurants & Cafes", pattern: /SWATI\s*SNACKS/ },
  { merchant: "Instamart", category: "Instamart", pattern: /SWIGGY\s*INSTAMART|INSTAMART|RSP\s*INST|PYU\s*INST|\bINST\b/ },
  { merchant: "Blinkit", category: "Blinkit", pattern: /BLINKIT|BLINK|GROFERS/ },
  { merchant: "Zepto", category: "Zepto", pattern: /ZEPTO|\bZEP\b/ },
  { merchant: "BigBasket", category: "Groceries", pattern: /BIGBASKET|BBNOW|BIG BASKET/ },
  { merchant: "Zomato", category: "Zomato", pattern: /ZOMATO/ },
  { merchant: "Swiggy", category: "Swiggy", pattern: /SWIGGY/ },
  { merchant: "Swiggy", category: "Swiggy", pattern: /BUNDL\s+TECHNOLOGIES/ },
  { merchant: "Starbucks", category: "Restaurants & Cafes", pattern: /STARBUCKS/ },
  { merchant: "McDonald's", category: "Restaurants & Cafes", pattern: /MCDONALD|MCD\b/ },
  { merchant: "Domino's", category: "Restaurants & Cafes", pattern: /DOMINO/ },
  { merchant: "Pizza Hut", category: "Restaurants & Cafes", pattern: /PIZZA\s*HUT/ },
  { merchant: "KFC", category: "Restaurants & Cafes", pattern: /\bKFC\b/ },
  { merchant: "Burger King", category: "Restaurants & Cafes", pattern: /BURGER\s*KING/ },
  { merchant: "Barbeque Nation", category: "Restaurants & Cafes", pattern: /BARBEQUE\s*NATION/ },
  { merchant: "Airbnb", category: "Hotels & Stays", pattern: /AIRBNB/ },
  { merchant: "OYO", category: "Hotels & Stays", pattern: /\bOYO\b/ },
  { merchant: "Marriott", category: "Hotels & Stays", pattern: /MARRIOTT/ },
  { merchant: "Grand Hyatt", category: "Hotels & Stays", pattern: /GRAND\s*HYATT/ },
  { merchant: "Taj Hotels", category: "Hotels & Stays", pattern: /\bTAJ\b.*HOTEL|IHCL|TAJ\s*HOTELS?/ },
  { merchant: "Oberoi", category: "Hotels & Stays", pattern: /OBEROI/ },
  { merchant: "Lemon Tree", category: "Hotels & Stays", pattern: /LEMON\s*TREE/ },
  { merchant: "Uber", category: "Travel & Commute", pattern: /UBER/ },
  { merchant: "Ola", category: "Travel & Commute", pattern: /(^| )OLA( |$)|OLA CABS/ },
  { merchant: "Rapido", category: "Travel & Commute", pattern: /RAPIDO/ },
  { merchant: "IRCTC", category: "Travel & Commute", pattern: /IRCTC/ },
  { merchant: "MakeMyTrip", category: "Travel & Commute", pattern: /MAKEMYTRIP|MMT/ },
  { merchant: "Yatra", category: "Travel & Commute", pattern: /YATRA/ },
  { merchant: "Cleartrip", category: "Travel & Commute", pattern: /CLEARTRIP/ },
  { merchant: "Booking.com", category: "Travel & Commute", pattern: /BOOKING\.?COM|BKNG/ },
  { merchant: "IndiGo", category: "Travel & Commute", pattern: /INDIGO/ },
  { merchant: "Air India", category: "Travel & Commute", pattern: /AIR\s*INDIA/ },
  { merchant: "Akasa Air", category: "Travel & Commute", pattern: /AKASA/ },
  { merchant: "Amazon", category: "Shopping", pattern: /AMAZON|AMAZONIN/ },
  { merchant: "Flipkart", category: "Shopping", pattern: /FLIPKART/ },
  { merchant: "Myntra", category: "Shopping", pattern: /MYNTRA/ },
  { merchant: "Nykaa", category: "Shopping", pattern: /NYKAA/ },
  { merchant: "Ajio", category: "Shopping", pattern: /AJIO/ },
  { merchant: "Croma", category: "Shopping", pattern: /CROMA/ },
  { merchant: "DMart", category: "Groceries", pattern: /DMART|D MART/ },
  { merchant: "JioMart", category: "Groceries", pattern: /JIOMART/ },
  { merchant: "Nature's Basket", category: "Groceries", pattern: /NATURE'?S\s*BASKET/ },
  { merchant: "Indian Oil", category: "Fuel", pattern: /INDIAN\s*OIL|IOCL/ },
  { merchant: "HPCL", category: "Fuel", pattern: /HPCL|HINDUSTAN\s*PETROLEUM/ },
  { merchant: "BPCL", category: "Fuel", pattern: /BPCL|BHARAT\s*PETROLEUM/ },
  { merchant: "Shell", category: "Fuel", pattern: /\bSHELL\b/ },
  { merchant: "Airtel", category: "Utilities & Bills", pattern: /AIRTEL/ },
  { merchant: "Jio", category: "Utilities & Bills", pattern: /RELIANCE\s*JIO|\bJIO\b/ },
  { merchant: "Vodafone Idea", category: "Utilities & Bills", pattern: /VODAFONE|VI\s*POSTPAID|IDEA/ },
  { merchant: "Tata Play", category: "Utilities & Bills", pattern: /TATA\s*PLAY|TATASKY/ },
  { merchant: "Netflix", category: "Subscriptions", pattern: /NETFLIX/ },
  { merchant: "Spotify", category: "Subscriptions", pattern: /SPOTIFY/ },
  { merchant: "YouTube", category: "Subscriptions", pattern: /YOUTUBE/ },
  { merchant: "Hotstar", category: "Subscriptions", pattern: /HOTSTAR|JIOHOTSTAR|DISNEY/ },
  { merchant: "Amazon Prime", category: "Subscriptions", pattern: /AMAZON\s*PRIME|PRIMEVIDEO/ },
  { merchant: "Apple", category: "Subscriptions", pattern: /APPLE\.COM|APPLE\s*SERVICES|ITUNES/ },
  { merchant: "Google", category: "Subscriptions", pattern: /GOOGLE|GOOGLE\s*ONE/ },
  { merchant: "GoDaddy", category: "Subscriptions", pattern: /GODADDY/ },
  { merchant: "Claude", category: "Subscriptions", pattern: /CLAUDE|ANTHROPIC/ },
  { merchant: "OpenAI", category: "Subscriptions", pattern: /OPENAI|CHATGPT/ },
  { merchant: "District", category: "Entertainment", pattern: /DISTRICT\s+MOVIE|DISTRICT\b/ },
  { merchant: "Wasteland", category: "Entertainment", pattern: /WASTELAND/ },
  { merchant: "Protein Pantry", category: "Groceries", pattern: /PROTEIN\s*PANTRY|PROTEINPANTRY/ },
  { merchant: "Apollo", category: "Healthcare", pattern: /APOLLO/ },
  { merchant: "Practo", category: "Healthcare", pattern: /PRACTO/ },
  { merchant: "Tata 1mg", category: "Healthcare", pattern: /1MG/ },
  { merchant: "PharmEasy", category: "Healthcare", pattern: /PHARMEASY/ },
  {
    merchant: "Card Payment",
    category: "Card Payment",
    pattern: /PAYMENT\s+RECEIVED|CREDIT\s+CARD\s+PAYMENT|AUTOPAY|PAYMENT\s+THROUGH|PAYMENT\s+VIA|PAYMENT\s+CREDIT|MB\s+PAYMENT|PAYMENTNET\s+BANKING|PAYMENT\s+NET\s+BANKING/,
    includeInSpend: false
  },
  {
    merchant: "Refund / Reversal",
    category: "Refunds & Reversals",
    pattern: /REFUND|REVERSAL|REVERS|CHARGEBACK|CREDIT\s+VOUCHER|REVERSED/,
    includeInSpend: false
  },
  {
    merchant: "Bank Fee",
    category: "Fees & Charges",
    pattern: /LATE\s+FEE|FINANCE\s+CHARGE|OVERLIMIT|PROCESSING\s+FEE|ANNUAL\s+FEE|GST/,
    includeInSpend: true
  }
];

const GENERIC_CATEGORY_RULES: Array<{
  category: string;
  pattern: RegExp;
  includeInSpend?: boolean;
}> = [
  { category: "Healthcare", pattern: /MEDICAL|HOSPITAL|CLINIC|PHARMA|AROGYA|DIAGNOSTIC/ },
  { category: "Insurance", pattern: /INSURANCE|ASSURANCE|POLICY|PREMIUM/ },
  { category: "Personal Care", pattern: /SALON|SPA|BEAUTY|GROOMING/ },
  { category: "Cashback & Rewards", pattern: /CASHBACK|REWARD/, includeInSpend: false },
  { category: "EMI Principal", pattern: /EMI\s+PRINCIPAL/ },
  { category: "EMI Interest", pattern: /EMI\s+INTEREST/ },
  { category: "Refunds & Reversals", pattern: /REFUND|REVERSAL|CHARGEBACK/, includeInSpend: false },
  { category: "Card Payment", pattern: /PAYMENT\s+RECEIVED|AUTOPAY|PAYMENT\s+THROUGH|MB\s+PAYMENT/, includeInSpend: false },
  { category: "Fees & Charges", pattern: /FEE|CHARGE|GST|INTEREST|SURCHARGE|PENALTY/ },
  { category: "Hotels & Stays", pattern: /HOTEL|RESORT|SUITES|INN|LODGE|HOSPITALITY|STAY/ },
  { category: "Entertainment", pattern: /MOVIE|CINEMA|THEATRE|THEATER|ENTERTAIN|TICKET/ },
  { category: "Restaurants & Cafes", pattern: /RESTAURANT|CAFE|BAR|BISTRO|KITCHEN|DHABA|DINER|BAKERY|PIZZERIA|FOOD COURT/ },
  { category: "Groceries", pattern: /SUPERMARKET|GROCERY|FRESH|HYPERMARKET|STORE/ },
  { category: "Travel & Commute", pattern: /CAB|TAXI|METRO|AIRLINES|FLIGHT|TRAVEL|RAIL|TRAIN|BUS/ },
  { category: "Fuel", pattern: /PETROL|FUEL|DIESEL|GAS STATION/ },
  { category: "Utilities & Bills", pattern: /ELECTRICITY|MOBILE|BROADBAND|POSTPAID|UTILITY|BILLDESK|BBPS/ },
  { category: "Subscriptions", pattern: /SUBSCRIPTION|MEMBERSHIP|RENEWAL/ },
  { category: "Transfers & Wallets", pattern: /PAYTM|PHONEPE|GPAY|GOOGLE PAY|MOBIKWIK|WALLET/, includeInSpend: false }
];

const MERCHANT_STOP_WORDS = new Set([
  "ONLINE",
  "POS",
  "ECOM",
  "ECOMM",
  "DOM",
  "INTL",
  "MERCHANT",
  "PURCHASE",
  "DEBIT",
  "CREDIT",
  "CARD",
  "INDIA",
  "PRIVATE",
  "PVT",
  "LTD",
  "LIMITED",
  "SERVICES",
  "SERVICE",
  "SOLUTIONS",
  "PAYMENT",
  "PAYMENTS",
  "TECHNOLOGIES",
  "TECH",
  "SYSTEMS",
  "STORE",
  "STORES",
  "RETAIL",
  "REF",
  "NO",
  "AUTH",
  "CODE",
  "TXN",
  "UPI",
  "VPA"
]);

export async function extractTextFromUploadedStatement(file: {
  name: string;
  type?: string;
  buffer: Uint8Array;
}) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "pdf" || file.type?.includes("pdf")) {
    const parser = new PDFParse({ data: file.buffer });

    try {
      const result = await parser.getText();
      return cleanExtractedText(result.text);
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  return cleanExtractedText(new TextDecoder("utf-8").decode(file.buffer));
}

export function extractStatementData(documents: StatementDocument[]): StatementExtractionResult {
  const warnings: string[] = [];
  const transactions = documents.flatMap((document) => {
    const documentTransactions = parseStatementDocument(document);

    if (documentTransactions.length === 0) {
      warnings.push(`${document.name}: no transaction lines were confidently detected.`);
    }

    return documentTransactions;
  });

  const spendTransactions = transactions.filter((transaction) => transaction.kind === "debit" && transaction.includeInSpend);
  const grossSpend = roundCurrency(
    spendTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  );
  const refundsAndCredits = roundCurrency(
    transactions
      .filter((transaction) => transaction.kind === "credit")
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
  const paymentsExcluded = roundCurrency(
    transactions
      .filter((transaction) => transaction.category === "Card Payment")
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  );
  const netSpend = roundCurrency(grossSpend - refundsAndCredits);
  const merchantCount = new Set(spendTransactions.map((transaction) => transaction.merchant)).size;

  const lowConfidenceTransactions = transactions.filter((transaction) => transaction.confidence === "low");
  if (lowConfidenceTransactions.length > 0) {
    const merchantPreview = Array.from(new Set(lowConfidenceTransactions.map((transaction) => transaction.merchant)))
      .slice(0, 5)
      .join(", ");
    warnings.push(
      `A few merchants were classified with low confidence: ${merchantPreview}. Review those rows before relying on totals.`
    );
  }

  return {
    files: documents.map((document) => ({
      name: document.name,
      transactionCount: transactions.filter((transaction) => transaction.sourceFile === document.name).length
    })),
    transactions,
    spendTransactions,
    categorySummary: summarizeByCategory(spendTransactions),
    merchantSummary: summarizeByMerchant(spendTransactions),
    shoppingBreakdown: summarizeByMerchant(spendTransactions.filter((transaction) => transaction.category === "Shopping")),
    categoryComparison: buildComparisonRows(spendTransactions, documents.map((document) => document.name), "category"),
    merchantComparison: buildComparisonRows(spendTransactions, documents.map((document) => document.name), "merchant"),
    uncertainTransactions: transactions
      .filter(
        (transaction) =>
          transaction.kind === "debit" &&
          (!transaction.includeInSpend || transaction.confidence === "low" || transaction.category === "Uncategorized")
      )
      .sort((left, right) => right.amount - left.amount),
    totals: {
      grossSpend,
      refundsAndCredits,
      paymentsExcluded,
      netSpend,
      merchantCount
    },
    warnings
  };
}

function parseStatementDocument(document: StatementDocument) {
  const lines = buildLogicalLines(document.text);
  const transactions: StatementTransaction[] = [];

  lines.forEach((line, index) => {
    transactions.push(...parseTransactionLine(line, document.name, index));
  });

  return transactions;
}

function buildLogicalLines(text: string) {
  const physicalLines = cleanExtractedText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const logicalLines: string[] = [];
  let currentLine = "";

  for (const line of physicalLines) {
    if (startsWithDate(line)) {
      if (currentLine) {
        logicalLines.push(currentLine);
      }
      currentLine = line;
      continue;
    }

    if (currentLine) {
      if (shouldAppendContinuation(currentLine, line)) {
        currentLine = `${currentLine} ${line}`.trim();
        continue;
      }

      logicalLines.push(currentLine);
      currentLine = "";
    }
  }

  if (currentLine) {
    logicalLines.push(currentLine);
  }

  return logicalLines;
}

function parseTransactionLine(line: string, sourceFile: string, index: number) {
  const normalizedLine = normalizeStatementLine(line);

  if (!normalizedLine || NON_TRANSACTION_PATTERNS.some((pattern) => pattern.test(normalizedLine))) {
    return [];
  }

  const dualAmountTransactions = parseDualAmountStatementLine(normalizedLine, line, sourceFile, index);
  if (dualAmountTransactions) {
    return dualAmountTransactions;
  }

  const dateMatch = normalizedLine.match(LEADING_DATE_PATTERN);
  if (!dateMatch) {
    return [];
  }

  const rowMatch = normalizedLine.match(SINGLE_AMOUNT_ROW_PATTERN);
  if (rowMatch) {
    const [, date, rawDescription, amountValue, amountKind] = rowMatch;
    return buildPrimaryTransactions({
      date,
      sourceFile,
      index,
      description: rawDescription,
      primary: {
        amount: parseAmount(amountValue),
        kind: amountKind.toUpperCase() === "CR" ? "credit" : "debit"
      },
      rawLine: line.trim()
    });
  }

  const date = dateMatch[1];
  const remainder = normalizedLine.slice(dateMatch[0].length).trim();
  const amountMatches = Array.from(remainder.matchAll(AMOUNT_PATTERN));

  if (amountMatches.length === 0) {
    return [];
  }

  const amountMatch = amountMatches[amountMatches.length - 1];
  const amountToken = amountMatch[0];
  const amountIndex = amountMatch.index ?? remainder.lastIndexOf(amountToken);
  const description = remainder.slice(0, amountIndex).trim();

  return buildPrimaryTransactions({
    date,
    sourceFile,
    index,
    description,
    primary: parseAmountToken(amountToken, description),
    rawLine: line.trim()
  });
}

function parseDualAmountStatementLine(line: string, rawLine: string, sourceFile: string, index: number) {
  const match = line.match(DUAL_AMOUNT_PATTERN);

  if (!match) {
    return null;
  }

  const [, date, description, primaryAmount, primaryKind, secondaryAmount, secondaryKind] = match;
  const cleanedDescription = description.trim();

  if (!cleanedDescription || isStatementHeader(cleanedDescription)) {
    return [];
  }

  const transactions = buildPrimaryTransactions({
    date,
    sourceFile,
    index,
    description: cleanedDescription,
    primary: {
      amount: parseAmount(primaryAmount),
      kind: primaryKind.toUpperCase() === "CR" ? "credit" : "debit"
    },
    rawLine: rawLine.trim(),
    forceCategory:
      /\bMB PAYMENT\b/.test(cleanedDescription)
        ? "Card Payment"
        : /\bCASHBACK CREDIT\b/.test(cleanedDescription)
          ? "Cashback & Rewards"
          : primaryKind.toUpperCase() === "CR" && secondaryKind.toUpperCase() === "DR"
            ? "Refunds & Reversals"
            : undefined,
    forceIncludeInSpend: /\bMB PAYMENT\b|\bCASHBACK CREDIT\b/.test(cleanedDescription) ? false : undefined
  });

  const secondaryValue = parseAmount(secondaryAmount);
  const normalizedSecondaryKind = secondaryKind.toUpperCase() === "CR" ? "credit" : "debit";

  if (secondaryValue > 0 && normalizedSecondaryKind === "credit" && primaryKind.toUpperCase() === "DR") {
    transactions.push(
      createTransaction({
        id: `${sourceFile}-${index}-cashback-${secondaryValue}`,
        sourceFile,
        date,
        description: "Cashback Earned",
        merchant: "Cashback Earned",
        category: "Cashback & Rewards",
        amount: secondaryValue,
        kind: "credit",
        includeInSpend: false,
        confidence: "high",
        rawLine: rawLine.trim()
      })
    );
  }

  if (secondaryValue > 0 && normalizedSecondaryKind === "debit" && primaryKind.toUpperCase() === "CR") {
    transactions.push(
      createTransaction({
        id: `${sourceFile}-${index}-cashback-adjustment-${secondaryValue}`,
        sourceFile,
        date,
        description: "Cashback Adjustment",
        merchant: "Cashback Adjustment",
        category: "Cashback Adjustment",
        amount: secondaryValue,
        kind: "debit",
        includeInSpend: false,
        confidence: "high",
        rawLine: rawLine.trim()
      })
    );
  }

  return transactions;
}

function buildPrimaryTransactions({
  date,
  sourceFile,
  index,
  description,
  primary,
  rawLine,
  forceCategory,
  forceIncludeInSpend
}: {
  date: string;
  sourceFile: string;
  index: number;
  description: string;
  primary: ParsedAmountToken;
  rawLine: string;
  forceCategory?: string;
  forceIncludeInSpend?: boolean;
}) {
  if (!description || !/[A-Z]/.test(description) || NON_TRANSACTION_PATTERNS.some((pattern) => pattern.test(description))) {
    return [];
  }

  if (!primary.amount || primary.amount <= 0) {
    return [];
  }

  const merchantMeta = classifyMerchant(description, forceCategory);
  const normalizedKind =
    merchantMeta.category === "Card Payment" ||
    merchantMeta.category === "Refunds & Reversals" ||
    merchantMeta.category === "Cashback & Rewards"
      ? "credit"
      : primary.kind;

  if (forceIncludeInSpend === false) {
    merchantMeta.includeInSpend = false;
  }

  return [
    createTransaction({
      id: `${sourceFile}-${index}-${merchantMeta.merchant}-${primary.amount}`,
      sourceFile,
      date,
      description: toTitleCase(cleanMerchantDescription(description)),
      merchant: merchantMeta.merchant,
      category: merchantMeta.category,
      amount: primary.amount,
      kind: normalizedKind,
      includeInSpend: merchantMeta.includeInSpend && normalizedKind === "debit",
      confidence: merchantMeta.confidence,
      rawLine
    })
  ];
}

function createTransaction(transaction: StatementTransaction) {
  return {
    ...transaction,
    date: transaction.date.replace(/\s+/g, " ").trim()
  } satisfies StatementTransaction;
}

function classifyMerchant(description: string, forcedCategory?: string): MerchantMeta {
  const normalizedDescription = normalizeStatementLine(description);
  const cleanedDescription = cleanMerchantDescription(description);

  if (forcedCategory) {
    const fallbackMerchant = buildFallbackMerchant(cleanedDescription);
    return {
      merchant: fallbackMerchant,
      category: forcedCategory,
      includeInSpend: false,
      confidence: "high"
    };
  }

  for (const rule of MERCHANT_RULES) {
    if (rule.pattern.test(normalizedDescription) || rule.pattern.test(cleanedDescription)) {
      return {
        merchant: rule.merchant,
        category: rule.category,
        includeInSpend: rule.includeInSpend ?? true,
        confidence: rule.confidence ?? "high"
      };
    }
  }

  for (const rule of GENERIC_CATEGORY_RULES) {
    if (rule.pattern.test(normalizedDescription) || rule.pattern.test(cleanedDescription)) {
      return {
        merchant: buildFallbackMerchant(cleanedDescription),
        category: rule.category,
        includeInSpend: rule.includeInSpend ?? true,
        confidence: "medium" as const
      };
    }
  }

  return {
    merchant: buildFallbackMerchant(cleanedDescription),
    category: "Uncategorized",
    includeInSpend: true,
    confidence: "low" as const
  };
}

function parseAmountToken(amountToken: string, description: string): ParsedAmountToken {
  const amount = parseAmount(amountToken);
  return {
    amount,
    kind: detectKind(description, amountToken, "") === "credit" ? "credit" : "debit"
  };
}

function detectKind(description: string, amountToken: string, category: string) {
  const upperDescription = description.toUpperCase();

  if (
    category === "Refunds & Reversals" ||
    category === "Card Payment" ||
    amountToken.toUpperCase().includes("CR") ||
    /\bCREDIT\b/.test(upperDescription)
  ) {
    return "credit" as const;
  }

  if (amountToken.startsWith("-")) {
    return "credit" as const;
  }

  return "debit" as const;
}

function summarizeByCategory(transactions: StatementTransaction[]) {
  const categoryMap = new Map<string, SummaryRow>();

  for (const transaction of transactions) {
    const existing = categoryMap.get(transaction.category) ?? {
      label: transaction.category,
      amount: 0,
      transactionCount: 0
    };

    existing.amount = roundCurrency(existing.amount + transaction.amount);
    existing.transactionCount += 1;
    categoryMap.set(transaction.category, existing);
  }

  return Array.from(categoryMap.values()).sort((left, right) => right.amount - left.amount);
}

function summarizeByMerchant(transactions: StatementTransaction[]) {
  const merchantMap = new Map<string, SummaryRow>();

  for (const transaction of transactions) {
    const key = `${transaction.merchant}::${transaction.category}`;
    const existing = merchantMap.get(key) ?? {
      label: transaction.merchant,
      category: transaction.category,
      amount: 0,
      transactionCount: 0
    };

    existing.amount = roundCurrency(existing.amount + transaction.amount);
    existing.transactionCount += 1;
    merchantMap.set(key, existing);
  }

  return Array.from(merchantMap.values()).sort((left, right) => right.amount - left.amount);
}

function buildComparisonRows(
  transactions: StatementTransaction[],
  fileNames: string[],
  dimension: "merchant" | "category"
) {
  const comparisonMap = new Map<string, ComparisonRow>();

  for (const transaction of transactions) {
    const key =
      dimension === "merchant" ? `${transaction.merchant}::${transaction.category}` : transaction.category;
    const label = dimension === "merchant" ? transaction.merchant : transaction.category;
    const category = dimension === "merchant" ? transaction.category : undefined;

    const existing =
      comparisonMap.get(key) ??
      {
        label,
        category,
        totalAmount: 0,
        transactionCount: 0,
        amountsByFile: Object.fromEntries(fileNames.map((fileName) => [fileName, 0]))
      };

    existing.totalAmount = roundCurrency(existing.totalAmount + transaction.amount);
    existing.transactionCount += 1;
    existing.amountsByFile[transaction.sourceFile] = roundCurrency(
      (existing.amountsByFile[transaction.sourceFile] || 0) + transaction.amount
    );

    comparisonMap.set(key, existing);
  }

  return Array.from(comparisonMap.values()).sort((left, right) => right.totalAmount - left.totalAmount);
}

function buildFallbackMerchant(description: string) {
  const tokens = description
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((token) => token && !MERCHANT_STOP_WORDS.has(token) && !/^\d+$/.test(token) && token.length > 1);

  const merchant = tokens.slice(0, 3).join(" ").trim();
  return merchant ? toTitleCase(merchant) : "Unknown Merchant";
}

function cleanMerchantDescription(description: string) {
  return normalizeStatementLine(description)
    .replace(/^\d{1,2}(?::|\s)\d{2}\s+/, " ")
    .replace(/\b(?:POS|ECOM|E[\s-]?COM|ONLINE|DOM|INTL|UPI|VISA|MASTERCARD|DEBIT CARD|CREDIT CARD)\b/g, " ")
    .replace(/\b(?:REF(?:ERENCE)?|AUTH|APPROVAL|CODE|TXN|TRACE|RRN|MID|TID|VPA)\b/g, " ")
    .replace(/\bX{2,}\d{2,4}\b/g, " ")
    .replace(/\b\d{6,}\b/g, " ")
    .replace(/[*/|:#()[\]-]+/g, " ")
    .replace(/\b[CL]\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isStatementHeader(description: string) {
  return /^-\s+\d{2}\/\d{2}\/\d{4}/.test(description) || /^LEVEL\s+\d+/.test(description);
}

function parseAmount(amountToken: string) {
  const cleanedToken = amountToken.replace(/(INR|RS\.?|CR|DR|\(|\)|\s)/gi, "");
  return roundCurrency(Number.parseFloat(cleanedToken.replace(/,/g, "")));
}

function startsWithDate(line: string) {
  return LEADING_DATE_PATTERN.test(normalizeStatementLine(line));
}

function normalizeStatementLine(line: string) {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[‐‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function shouldAppendContinuation(currentLine: string, nextLine: string) {
  const normalizedCurrentLine = normalizeStatementLine(currentLine);
  const normalizedNextLine = normalizeStatementLine(nextLine);

  if (!normalizedCurrentLine || !normalizedNextLine) {
    return false;
  }

  if (startsWithDate(nextLine) || isHardSectionBreak(normalizedNextLine)) {
    return false;
  }

  if (looksLikeCompleteTransactionLine(normalizedCurrentLine)) {
    return false;
  }

  return true;
}

function looksLikeCompleteTransactionLine(line: string) {
  return COMPLETE_TRANSACTION_LINE_PATTERN.test(line);
}

function isHardSectionBreak(line: string) {
  return HARD_SECTION_BREAK_PATTERNS.some((pattern) => pattern.test(line));
}

function cleanExtractedText(text: string) {
  return text.replace(/\u0000/g, "").replace(/\r\n/g, "\n").replace(/\t/g, " ");
}

function roundCurrency(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\b(Of|And|For|The)\b/g, (match) => match.toLowerCase());
}
