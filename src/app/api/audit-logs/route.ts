import { NextRequest, NextResponse } from "next/server";
import { getAuditLogs } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || undefined;
    const action = searchParams.get("action") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : 200;

    const logs = await getAuditLogs({ search, action, limit });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Audit log error:", error);
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
