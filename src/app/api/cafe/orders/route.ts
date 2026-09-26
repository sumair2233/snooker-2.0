import { NextRequest, NextResponse } from "next/server";
import { getCafeOrders, createCafeOrder } from "@/lib/db";
import { CafeOrder } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date") || undefined;
    const status = searchParams.get("status") || undefined;

    const orders = await getCafeOrders({ date, status });
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Fetch orders error:", error);
    return NextResponse.json({ error: "Failed to fetch café orders" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      player_name_or_walkin,
      is_walkin,
      items,
      total,
      discount,
      net_total,
      payment_method,
      employee_id,
      employee_name,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty. Please select at least one item." },
        { status: 400 }
      );
    }

    const order: CafeOrder = {
      id: `order-${Date.now()}`,
      player_name_or_walkin: player_name_or_walkin?.trim() || "Walk-in Guest",
      is_walkin: Boolean(is_walkin),
      items,
      total: Number(total),
      discount: Number(discount) || 0,
      net_total: Number(net_total),
      payment_method: payment_method || "cash",
      status: "completed",
      date: new Date().toISOString().split("T")[0],
      employee_id: employee_id || "usr-emp-1",
      employee_name: employee_name || "Club Staff",
      created_at: new Date().toISOString(),
    };

    const created = await createCafeOrder(order);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Create cafe order error:", error);
    return NextResponse.json({ error: "Failed to create café order" }, { status: 500 });
  }
}
