import { NextRequest, NextResponse } from "next/server";
import { repayLoan } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const amount = Number(body.amount);

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Repayment amount must be greater than zero" },
        { status: 400 }
      );
    }

    const updated = await repayLoan(id, amount, {
      id: body.actor_id || "usr-emp-1",
      name: body.actor_name || "Club Staff",
    });

    if (!updated) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Loan repay error:", error);
    return NextResponse.json({ error: "Failed to record repayment" }, { status: 500 });
  }
}
