import { NextRequest, NextResponse } from "next/server";
import { getRevenueEntries, addRevenueEntry } from "@/lib/db";
import { RevenueEntry } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const entries = await getRevenueEntries();
    return NextResponse.json(entries);
  } catch (error) {
    console.error("Revenue fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch revenue entries" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { category, amount, payment_method, note, date, employee_id, employee_name } = body;

    if (!category || !amount) {
      return NextResponse.json(
        { error: "Category and amount are required" },
        { status: 400 }
      );
    }

    const newEntry: RevenueEntry = {
      id: `rev-${Date.now()}`,
      date: date || new Date().toISOString().split("T")[0],
      category,
      amount: Number(amount),
      payment_method: payment_method || "cash",
      note: note?.trim() || "",
      employee_id: employee_id || "usr-admin-1",
      employee_name: employee_name || "Club Manager",
      created_at: new Date().toISOString(),
    };

    const created = await addRevenueEntry(newEntry);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Add revenue error:", error);
    return NextResponse.json({ error: "Failed to add revenue entry" }, { status: 500 });
  }
}
