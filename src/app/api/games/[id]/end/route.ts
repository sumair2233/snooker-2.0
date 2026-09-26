import { NextRequest, NextResponse } from "next/server";
import { endGame } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const endedGame = await endGame(id, {
      loser: body.loser,
      payment_method: body.payment_method || "cash",
      cash_amount: Number(body.cash_amount) || 0,
      online_amount: Number(body.online_amount) || 0,
      discount: Number(body.discount) || 0,
      amount: body.amount !== undefined ? Number(body.amount) : undefined,
      notes: body.notes,
      employee_id: body.employee_id || "usr-emp-1",
      employee_name: body.employee_name || "Club Staff",
    });

    if (!endedGame) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(endedGame);
  } catch (error) {
    console.error("End game error:", error);
    return NextResponse.json({ error: "Failed to end game" }, { status: 500 });
  }
}
