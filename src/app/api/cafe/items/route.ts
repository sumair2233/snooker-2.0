import { NextRequest, NextResponse } from "next/server";
import { getCafeItems, saveCafeItem, deleteCafeItem } from "@/lib/db";
import { CafeItem } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getCafeItems();
    return NextResponse.json(items);
  } catch (error) {
    console.error("Cafe items fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch café items" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, category, purchase_price, sale_price, stock, active } = body;

    if (!name || purchase_price === undefined || sale_price === undefined) {
      return NextResponse.json(
        { error: "Item name, purchase price, and sale price are required" },
        { status: 400 }
      );
    }

    const item: CafeItem = {
      id: id || `c-item-${Date.now()}`,
      name: name.trim(),
      category: category || "Snacks",
      purchase_price: Number(purchase_price),
      sale_price: Number(sale_price),
      stock: Number(stock) || 0,
      active: active !== undefined ? Boolean(active) : true,
    };

    const saved = await saveCafeItem(item);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Save cafe item error:", error);
    return NextResponse.json({ error: "Failed to save café item" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }
    const success = await deleteCafeItem(id);
    return NextResponse.json({ success });
  } catch (error) {
    console.error("Delete cafe item error:", error);
    return NextResponse.json({ error: "Failed to delete café item" }, { status: 500 });
  }
}
