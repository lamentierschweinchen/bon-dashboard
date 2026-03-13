// src/app/api/snapshot/route.ts

import { NextResponse } from "next/server";
import { getOrRefresh } from "@/lib/cache";
import { buildSnapshot } from "@/lib/aggregator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getOrRefresh(buildSnapshot);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=259200",
      },
    });
  } catch (err) {
    console.error("[/api/snapshot] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 502 },
    );
  }
}
