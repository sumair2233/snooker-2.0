import { NextRequest, NextResponse } from "next/server";
import { getVoidRequests, createVoidRequest } from "@/lib/db";
import { VoidRequest } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const requests = await getVoidRequests();
    return NextResponse.json(requests);
  } catch (error) {
    console.error("Void requests fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch void requests" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      game_id,
      table_name,
      amount,
      reason,
      requested_by_id,
      requested_by_name,
    } = body;

    if (!game_id || !reason) {
      return NextResponse.json(
        { error: "Game ID and void reason are required" },
        { status: 400 }
      );
    }

    const voidReq: VoidRequest = {
      id: `void-req-${Date.now()}`,
      game_id,
      table_name: table_name || "Snooker Table",
      amount: Number(amount) || 0,
      reason: reason.trim(),
      requested_by_id: requested_by_id || "usr-emp-1",
      requested_by_name: requested_by_name || "Club Staff",
      status: "pending",
      created_at: new Date().toISOString(),
    };

    const created = await createVoidRequest(voidReq);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create void request error:", error);
    return NextResponse.json({ error: "Failed to submit void request" }, { status: 500 });
  }
}
