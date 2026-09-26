import { NextRequest, NextResponse } from "next/server";
import { getUsers, saveUser } from "@/lib/db";
import { User } from "@/types";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await getUsers();
    // Return users without exposing pin_hash
    const safeUsers = users.map(({ pin_hash, ...u }) => ({
      ...u,
      hasPin: Boolean(pin_hash),
    }));
    return NextResponse.json(safeUsers);
  } catch (error) {
    console.error("Fetch employees error:", error);
    return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, username, role, pin, active } = body;

    if (!name || !username || !pin) {
      return NextResponse.json(
        { error: "Name, username, and PIN/password are required" },
        { status: 400 }
      );
    }

    const pin_hash = await bcrypt.hash(pin.trim(), 10);
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      username: username.trim().toLowerCase(),
      role: role || "employee",
      pin_hash,
      active: active !== undefined ? Boolean(active) : true,
      created_at: new Date().toISOString(),
    };

    const saved = await saveUser(newUser);
    const { pin_hash: _, ...safeUser } = saved;
    return NextResponse.json(safeUser, { status: 201 });
  } catch (error) {
    console.error("Create employee error:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, username, role, pin, active } = body;

    const users = await getUsers();
    const existing = users.find((u) => u.id === id);
    if (!existing) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (name) existing.name = name.trim();
    if (username) existing.username = username.trim().toLowerCase();
    if (role) existing.role = role;
    if (active !== undefined) existing.active = Boolean(active);
    if (pin && pin.trim()) {
      existing.pin_hash = await bcrypt.hash(pin.trim(), 10);
    }

    await saveUser(existing);
    const { pin_hash: _, ...safeUser } = existing;
    return NextResponse.json(safeUser);
  } catch (error) {
    console.error("Update employee error:", error);
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}
