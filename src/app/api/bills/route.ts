import { NextRequest, NextResponse } from "next/server";
import { getPlayerBills } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;

    const bills = await getPlayerBills({ status, search });
    return NextResponse.json(bills);
  } catch (error) {
    console.error("Fetch bills error:", error);
    return NextResponse.json({ error: "Failed to fetch player bills" }, { status: 500 });
  }
}
