import { NextRequest, NextResponse } from "next/server";
import { resolveVoidRequest } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { decision, adminNotes, reviewer_id, reviewer_name, reviewer_role } = body;

    // Permissions check: Employee cannot approve void requests
    if (reviewer_role === "employee") {
      return NextResponse.json(
        { error: "Unauthorized: Only Admins can approve or reject void requests." },
        { status: 403 }
      );
    }

    if (!decision || (decision !== "approved" && decision !== "rejected")) {
      return NextResponse.json(
        { error: "Decision must be either 'approved' or 'rejected'" },
        { status: 400 }
      );
    }

    const resolved = await resolveVoidRequest(id, decision, adminNotes || "", {
      id: reviewer_id || "usr-admin-1",
      name: reviewer_name || "Club Manager",
    });

    if (!resolved) {
      return NextResponse.json({ error: "Void request not found" }, { status: 404 });
    }

    return NextResponse.json(resolved);
  } catch (error) {
    console.error("Resolve void request error:", error);
    return NextResponse.json({ error: "Failed to resolve void request" }, { status: 500 });
  }
}
