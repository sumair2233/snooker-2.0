import { NextRequest, NextResponse } from "next/server";
import { checkoutPlayerBill } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updatedBill = await checkoutPlayerBill(id, {
      paidAmount: Number(body.paidAmount) || 0,
      paymentMethod: body.paymentMethod || "cash",
      cashAmount: Number(body.cashAmount) || 0,
      onlineAmount: Number(body.onlineAmount) || 0,
      discount: Number(body.discount) || 0,
      convertToLoan: Boolean(body.convertToLoan),
      loanReason: body.loanReason,
      employee_id: body.employee_id || "usr-emp-1",
      employee_name: body.employee_name || "Club Staff",
    });

    if (!updatedBill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    return NextResponse.json(updatedBill);
  } catch (error) {
    console.error("Bill checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
