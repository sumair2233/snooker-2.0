import { NextRequest, NextResponse } from "next/server";
import { getExpenses, addExpense } from "@/lib/db";
import { Expense } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;

    const expenses = await getExpenses({ category, fromDate, toDate });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Expenses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, amount, note, date, employee_id, employee_name } = body;

    if (!category || !amount) {
      return NextResponse.json(
        { error: "Category and amount are required" },
        { status: 400 }
      );
    }

    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      date: date || new Date().toISOString().split("T")[0],
      category,
      amount: Number(amount),
      note: note?.trim() || "",
      employee_id: employee_id || "usr-emp-1",
      employee_name: employee_name || "Club Staff",
      created_at: new Date().toISOString(),
    };

    const created = await addExpense(newExpense);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Add expense error:", error);
    return NextResponse.json({ error: "Failed to log expense" }, { status: 500 });
  }
}
