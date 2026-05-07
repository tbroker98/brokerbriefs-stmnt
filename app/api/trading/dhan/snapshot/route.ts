import { NextRequest, NextResponse } from "next/server";
import {
  DhanApiError,
  DhanTrackedUnderlying,
  getDhanLiveSnapshot,
  hasDhanCredentials
} from "@/lib/brokers/dhan";

export const dynamic = "force-dynamic";

function parseTargets(searchParams: URLSearchParams): DhanTrackedUnderlying[] {
  const raw = searchParams.get("targets");

  if (!raw) {
    return ["nifty", "banknifty"];
  }

  const values = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is DhanTrackedUnderlying => value === "nifty" || value === "banknifty");

  return values.length ? values : ["nifty", "banknifty"];
}

export async function GET(request: NextRequest) {
  if (!hasDhanCredentials()) {
    return NextResponse.json(
      {
        ok: false,
        broker: "dhan",
        message: "Missing Dhan credentials. Add DHAN_CLIENT_ID and DHAN_ACCESS_TOKEN."
      },
      { status: 400 }
    );
  }

  const targets = parseTargets(request.nextUrl.searchParams);

  try {
    const snapshot = await getDhanLiveSnapshot(targets);

    return NextResponse.json({
      ok: true,
      snapshot
    });
  } catch (error) {
    const status = error instanceof DhanApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected Dhan snapshot failure.";

    return NextResponse.json(
      {
        ok: false,
        broker: "dhan",
        message
      },
      { status }
    );
  }
}
