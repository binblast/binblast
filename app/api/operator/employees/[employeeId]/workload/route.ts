// app/api/operator/employees/[employeeId]/workload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { calculateWorkload, WorkloadMetrics } from "@/lib/zone-assignment";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const workload = await calculateWorkload(employeeId);

    if (!workload) {
      return NextResponse.json(
        { error: "Employee not found or failed to calculate workload" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      workload,
    });
  } catch (error: any) {
    console.error("Error getting workload:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get workload" },
      { status: 500 }
    );
  }
}

