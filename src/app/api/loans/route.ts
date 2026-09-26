import { NextRequest, NextResponse } from "next/server";
import { getLoans, addLoan } from "@/lib/db";
import { Loan } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const loans = await getLoans({ status, search, fromDate, toDate });
    return NextResponse.json(loans);
  } catch (error) {
    console.error("Loans fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customer_name,
      phone,
      amount,
      date,
      reason,
      employee_id,
      employee_name,
    } = body;

    if (!customer_name || !amount) {
      return NextResponse.json(
        { error: "Customer name and loan amount are required" },
        { status: 400 }
      );
    }

    const numAmount = Number(amount);
    const newLoan: Loan = {
      id: `loan-${Date.now()}`,
      customer_name: customer_name.trim(),
      phone: phone?.trim() || "",
      amount: numAmount,
      paid: 0,
      remaining: numAmount,
      date: date || new Date().toISOString().split("T")[0],
      reason: reason?.trim() || "Table & Café dues",
      status: "outstanding",
      employee_id: employee_id || "usr-emp-1",
      employee_name: employee_name || "Club Staff",
      created_at: new Date().toISOString(),
    };

    const created = await addLoan(newLoan);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Add loan error:", error);
    return NextResponse.json({ error: "Failed to add loan record" }, { status: 500 });
  }
}
