import { NextRequest, NextResponse } from "next/server";
import { clockOutEmployee } from "@/lib/clock-in-service";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const managerId = typeof body.managerId === "string" ? body.managerId : undefined;
    const managerEmail = typeof body.managerEmail === "string" ? body.managerEmail : undefined;
    const managerRole = typeof body.managerRole === "string" ? body.managerRole : undefined;

    const result = await clockOutEmployee({
      employeeId,
      managerId,
      managerEmail,
      managerRole,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[Manager Clock Out] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to clock out employee";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
