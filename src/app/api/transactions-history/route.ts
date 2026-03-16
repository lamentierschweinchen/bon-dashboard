import { NextResponse } from "next/server";
import { getTransactionHistory } from "@/lib/transaction-history";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const history = await getTransactionHistory();

    return NextResponse.json(history, {
      headers: {
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[/api/transactions-history] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction history" },
      { status: 502 },
    );
  }
}
