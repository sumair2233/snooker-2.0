import { NextRequest, NextResponse } from "next/server";
import { getTables, saveTable } from "@/lib/db";
import { ClubTable } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = await getTables();
    return NextResponse.json(tables);
  } catch (error) {
    console.error("Fetch tables error:", error);
    return NextResponse.json({ error: "Failed to fetch tables" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, table_number, name, brand, rates, active } = body;

    const table: ClubTable = {
      id: id || `table-${Date.now()}`,
      table_number: Number(table_number) || 1,
      name: name?.trim() || "Table",
      brand: brand?.trim() || "Shender",
      rates: rates || {
        ball15: 200,
        ball10: 150,
        ball6: 100,
        centuryPerMin: 6,
      },
      active: active !== undefined ? Boolean(active) : true,
    };

    const saved = await saveTable(table);
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    console.error("Save table error:", error);
    return NextResponse.json({ error: "Failed to save table" }, { status: 500 });
  }
}
