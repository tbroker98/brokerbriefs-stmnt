import { NextResponse } from "next/server";
import { DhanApiError, getDhanProfile, hasDhanCredentials } from "@/lib/brokers/dhan";

export const dynamic = "force-dynamic";

export async function GET() {
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

  try {
    const profile = await getDhanProfile();

    return NextResponse.json({
      ok: true,
      broker: "dhan",
      profile
    });
  } catch (error) {
    const status = error instanceof DhanApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "Unexpected Dhan health check failure.";

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
