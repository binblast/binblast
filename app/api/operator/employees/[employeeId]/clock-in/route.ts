import { NextRequest, NextResponse } from "next/server";
import { clockInEmployee } from "@/lib/clock-in-service";
import { getEmployeeData } from "@/lib/employee-utils";

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

    const employee = await getEmployeeData(employeeId);
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const result = await clockInEmployee({
      employeeId,
      employeeEmail: employee.email,
      skipCertificationCheck: true,
      managerId,
      managerEmail,
      managerRole,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    console.error("[Manager Clock In] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to clock in employee";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
