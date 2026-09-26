import { NextRequest, NextResponse } from "next/server";
import { updatePlayerBillPhone } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updated = await updatePlayerBillPhone(id, body.phone || "");

    if (!updated) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update phone error:", error);
    return NextResponse.json({ error: "Failed to update phone" }, { status: 500 });
  }
}
