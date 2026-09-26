import { NextRequest, NextResponse } from "next/server";
import { deleteExpense } from "@/lib/db";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get("actorId") || "usr-admin-1";
    const actorName = searchParams.get("actorName") || "Club Manager";

    const success = await deleteExpense(id, { id: actorId, name: actorName });
    if (!success) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
