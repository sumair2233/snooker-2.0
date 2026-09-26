import { NextRequest, NextResponse } from "next/server";
import { getEmployeeSummary } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const date = searchParams.get("date") || undefined;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    const summary = await getEmployeeSummary(employeeId, date);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Employee summary error:", error);
    return NextResponse.json({ error: "Failed to generate employee summary" }, { status: 500 });
  }
}
