import { NextRequest, NextResponse } from "next/server";
import { restockCafeItem } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, addStock, actor_id, actor_name } = body;

    if (!id || !addStock || Number(addStock) <= 0) {
      return NextResponse.json(
        { error: "Item ID and a positive quantity are required" },
        { status: 400 }
      );
    }

    const updated = await restockCafeItem(id, Number(addStock), {
      id: actor_id || "usr-admin-1",
      name: actor_name || "Club Manager",
    });

    if (!updated) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Restock error:", error);
    return NextResponse.json({ error: "Failed to restock item" }, { status: 500 });
  }
}
