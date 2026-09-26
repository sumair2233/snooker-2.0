import { NextRequest, NextResponse } from "next/server";
import { collectCash } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, actor_id, actor_name, role } = body;

    // Permissions check: Employee cannot perform Cash Collect ("By Owner" / disabled for employees)
    if (role === "employee") {
      return NextResponse.json(
        { error: "Unauthorized: Cash Collect is restricted to Admin / Owner only." },
        { status: 403 }
      );
    }

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Valid collection amount is required" },
        { status: 400 }
      );
    }

    const record = await collectCash(Number(amount), {
      id: actor_id || "usr-admin-1",
      name: actor_name || "Club Owner / Manager",
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Cash collect error:", error);
    return NextResponse.json({ error: "Failed to collect cash" }, { status: 500 });
  }
}
