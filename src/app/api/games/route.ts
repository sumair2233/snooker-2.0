import { NextRequest, NextResponse } from "next/server";
import { getGames, startGame, updateGame } from "@/lib/db";
import { Game } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("fromDate") || undefined;
    const toDate = searchParams.get("toDate") || undefined;
    const tableId = searchParams.get("tableId") || undefined;
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const employeeId = searchParams.get("employeeId") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const playerSearch = searchParams.get("playerSearch") || undefined;

    const games = await getGames({
      fromDate,
      toDate,
      tableId,
      type,
      status,
      employeeId,
      paymentMethod,
      playerSearch,
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("Games fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch games" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      table_id,
      table_name,
      type,
      ball_count,
      rate,
      players,
      employee_id,
      employee_name,
      start_time,
      notes,
    } = body;

    if (!table_id || !type || !players || players.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: table, type, and players" },
        { status: 400 }
      );
    }

    const newGame: Game = {
      id: `game-${Date.now()}`,
      table_id,
      table_name: table_name || "Snooker Table",
      type,
      ball_count: ball_count || "15 Ball",
      rate: Number(rate) || 200,
      players: Array.isArray(players) ? players : [players],
      loser: null,
      start_time: start_time || new Date().toISOString(),
      end_time: null,
      duration_minutes: null,
      status: "live",
      payment_method: "pending",
      amount: Number(rate) || 200,
      cash_amount: 0,
      online_amount: 0,
      discount: 0,
      employee_id: employee_id || "usr-emp-1",
      employee_name: employee_name || "Club Staff",
      notes: notes || null,
      created_at: new Date().toISOString(),
    };

    const created = await startGame(newGame);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Start game error:", error);
    return NextResponse.json({ error: "Failed to start game" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 });
    }
    const updated = await updateGame(id, updates);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Update game error:", error);
    return NextResponse.json({ error: "Failed to update game" }, { status: 500 });
  }
}
