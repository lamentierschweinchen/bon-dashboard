// src/app/api/snapshot/route.ts

import { NextResponse } from "next/server";
import { getOrRefresh } from "@/lib/cache";
import { buildSnapshot } from "@/lib/aggregator";
import type { DashboardSnapshot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getOrRefresh<DashboardSnapshot>(buildSnapshot);
    return NextResponse.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
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
