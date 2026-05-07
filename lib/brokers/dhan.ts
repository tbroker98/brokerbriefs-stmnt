const DHAN_BASE_URL = "https://api.dhan.co/v2";

export type DhanTrackedUnderlying = "nifty" | "banknifty";
export type DhanExchangeSegment = "IDX_I" | "NSE_FNO";

type DhanApiStatus = "success" | "failure";

type DhanApiEnvelope<T> = {
  status: DhanApiStatus;
  data: T;
};

export type DhanProfile = {
  dhanClientId: string;
  tokenValidity: string;
  activeSegment: string;
  ddpi: "Active" | "Deactive";
  mtf: "Active" | "Deactive";
  dataPlan: "Active" | "Deactive";
  dataValidity: string;
};

type DhanQuotePayload = Record<DhanExchangeSegment, number[]>;

type DhanDepthLevel = {
  quantity: number;
  orders: number;
  price: number;
};

export type DhanQuote = {
  last_price: number;
  average_price: number;
  buy_quantity: number;
  sell_quantity: number;
  volume: number;
  oi?: number;
  oi_day_high?: number;
  oi_day_low?: number;
  net_change: number;
  lower_circuit_limit: number;
  upper_circuit_limit: number;
  depth: {
    buy: DhanDepthLevel[];
    sell: DhanDepthLevel[];
  };
  ohlc: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
};

type DhanQuoteResponse = DhanApiEnvelope<Record<string, Record<string, DhanQuote>>>;

export type DhanOptionGreeks = {
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
};

export type DhanOptionLeg = {
  average_price: number;
  greeks: DhanOptionGreeks;
  implied_volatility: number;
  last_price: number;
  oi: number;
  previous_close_price: number;
  previous_oi: number;
  previous_volume: number;
  security_id: number;
  top_ask_price: number;
  top_ask_quantity: number;
  top_bid_price: number;
  top_bid_quantity: number;
  volume: number;
};

type DhanOptionPair = {
  ce?: DhanOptionLeg;
  pe?: DhanOptionLeg;
};

type DhanOptionChainResponse = DhanApiEnvelope<{
  last_price: number;
  oc: Record<string, DhanOptionPair>;
}>;

type DhanExpiryListResponse = DhanApiEnvelope<string[]>;

export type DhanOptionRow = {
  strike: number;
  ce?: DhanOptionLeg;
  pe?: DhanOptionLeg;
  distanceFromAtm: number;
};

export type DhanUnderlyingSnapshot = {
  key: DhanTrackedUnderlying;
  label: string;
  securityId: number;
  quoteSegment: DhanExchangeSegment;
  lastPrice: number;
  netChange: number;
  volume: number;
  activeExpiry: string | null;
  trackedStrikes: DhanOptionRow[];
};

export type DhanLiveSnapshot = {
  broker: "dhan";
  asOf: string;
  profile: DhanProfile;
  underlyings: DhanUnderlyingSnapshot[];
};

export const DHAN_UNDERLYINGS: Record<
  DhanTrackedUnderlying,
  { label: string; securityId: number; quoteSegment: DhanExchangeSegment; underlyingSegment: "IDX_I" }
> = {
  nifty: {
    label: "Nifty 50",
    securityId: 13,
    quoteSegment: "IDX_I",
    underlyingSegment: "IDX_I"
  },
  banknifty: {
    label: "Bank Nifty",
    securityId: 25,
    quoteSegment: "IDX_I",
    underlyingSegment: "IDX_I"
  }
};

export class DhanApiError extends Error {
  constructor(
    message: string,
    readonly status = 500
  ) {
    super(message);
    this.name = "DhanApiError";
  }
}

export function hasDhanCredentials() {
  return Boolean(process.env.DHAN_ACCESS_TOKEN && process.env.DHAN_CLIENT_ID);
}

function getDhanCredentials() {
  const accessToken = process.env.DHAN_ACCESS_TOKEN;
  const clientId = process.env.DHAN_CLIENT_ID;

  if (!accessToken || !clientId) {
    throw new DhanApiError("Missing Dhan credentials. Set DHAN_ACCESS_TOKEN and DHAN_CLIENT_ID in your environment.", 400);
  }

  return { accessToken, clientId };
}

async function dhanRequest<T>(path: string, init?: RequestInit) {
  const { accessToken, clientId } = getDhanCredentials();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  headers.set("access-token", accessToken);
  headers.set("client-id", clientId);

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${DHAN_BASE_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  const text = await response.text();
  const payload = text ? (JSON.parse(text) as T) : ({} as T);

  if (!response.ok) {
    throw new DhanApiError(`Dhan API request failed with ${response.status}: ${text || response.statusText}`, response.status);
  }

  return payload;
}

export async function getDhanProfile() {
  return dhanRequest<DhanProfile>("/profile");
}

export async function getDhanQuotes(payload: DhanQuotePayload) {
  return dhanRequest<DhanQuoteResponse>("/marketfeed/quote", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function getDhanExpiryList(securityId: number, segment: "IDX_I") {
  return dhanRequest<DhanExpiryListResponse>("/optionchain/expirylist", {
    method: "POST",
    body: JSON.stringify({
      UnderlyingScrip: securityId,
      UnderlyingSeg: segment
    })
  });
}

export async function getDhanOptionChain(securityId: number, segment: "IDX_I", expiry: string) {
  return dhanRequest<DhanOptionChainResponse>("/optionchain", {
    method: "POST",
    body: JSON.stringify({
      UnderlyingScrip: securityId,
      UnderlyingSeg: segment,
      Expiry: expiry
    })
  });
}

function chooseActiveExpiry(expiries: string[]) {
  const today = new Date().toISOString().slice(0, 10);
  return expiries.find((expiry) => expiry >= today) ?? expiries[0] ?? null;
}

function buildTrackedStrikes(optionChain: DhanOptionChainResponse["data"], desiredRows = 5) {
  const rows = Object.entries(optionChain.oc)
    .map(([strike, value]) => ({
      strike: Number(strike),
      ce: value.ce,
      pe: value.pe,
      distanceFromAtm: Math.abs(Number(strike) - optionChain.last_price)
    }))
    .sort((left, right) => left.strike - right.strike);

  if (!rows.length) {
    return [];
  }

  const atmIndex = rows.reduce((bestIndex, row, index, allRows) => {
    return row.distanceFromAtm < allRows[bestIndex].distanceFromAtm ? index : bestIndex;
  }, 0);

  const radius = Math.floor(desiredRows / 2);
  const start = Math.max(0, atmIndex - radius);
  const end = Math.min(rows.length, start + desiredRows);
  const normalizedStart = Math.max(0, end - desiredRows);

  return rows.slice(normalizedStart, end);
}

function getIndexQuote(
  response: DhanQuoteResponse,
  segment: DhanExchangeSegment,
  securityId: number
) {
  return response.data[segment]?.[String(securityId)];
}

export async function getDhanLiveSnapshot(
  targets: DhanTrackedUnderlying[] = ["nifty", "banknifty"]
): Promise<DhanLiveSnapshot> {
  const quotePayload = targets.reduce<DhanQuotePayload>((payload, key) => {
    const item = DHAN_UNDERLYINGS[key];
    payload[item.quoteSegment] = [...(payload[item.quoteSegment] ?? []), item.securityId];
    return payload;
  }, {} as DhanQuotePayload);

  const profilePromise = getDhanProfile();
  const quotesPromise = getDhanQuotes(quotePayload);

  const expiriesByTarget = await Promise.all(
    targets.map(async (key) => {
      const item = DHAN_UNDERLYINGS[key];
      const expiries = await getDhanExpiryList(item.securityId, item.underlyingSegment);
      return [key, expiries.data] as const;
    })
  );

  const activeExpiryByTarget = new Map(
    expiriesByTarget.map(([key, expiries]) => [key, chooseActiveExpiry(expiries)])
  );

  const optionChains = await Promise.all(
    targets.map(async (key) => {
      const item = DHAN_UNDERLYINGS[key];
      const activeExpiry = activeExpiryByTarget.get(key);

      if (!activeExpiry) {
        return [key, null] as const;
      }

      const optionChain = await getDhanOptionChain(item.securityId, item.underlyingSegment, activeExpiry);
      return [key, optionChain.data] as const;
    })
  );

  const [profile, quotes] = await Promise.all([profilePromise, quotesPromise]);

  return {
    broker: "dhan",
    asOf: new Date().toISOString(),
    profile,
    underlyings: targets.map((key) => {
      const item = DHAN_UNDERLYINGS[key];
      const quote = getIndexQuote(quotes, item.quoteSegment, item.securityId);
      const chain = optionChains.find(([candidateKey]) => candidateKey === key)?.[1];

      if (!quote) {
        throw new DhanApiError(`Missing quote for ${item.label}.`);
      }

      return {
        key,
        label: item.label,
        securityId: item.securityId,
        quoteSegment: item.quoteSegment,
        lastPrice: quote.last_price,
        netChange: quote.net_change,
        volume: quote.volume,
        activeExpiry: activeExpiryByTarget.get(key) ?? null,
        trackedStrikes: chain ? buildTrackedStrikes(chain) : []
      };
    })
  };
}
