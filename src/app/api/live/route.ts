import { NextResponse } from "next/server";
import { getLiveTablesState } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const liveState = await getLiveTablesState();
    return NextResponse.json(liveState);
  } catch (error) {
    console.error("Live state error:", error);
    return NextResponse.json({ error: "Failed to fetch live board state" }, { status: 500 });
  }
}
