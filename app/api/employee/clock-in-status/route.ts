// app/api/employee/clock-in-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getEmployeeClockInStatus } from "@/lib/employee-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { message: "Missing employeeId" },
        { status: 400 }
      );
    }

    // Get clock-in status (server-side, so it has permissions)
    const clockInStatus = await getEmployeeClockInStatus(employeeId);

    return NextResponse.json(
      { clockInStatus },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error getting clock-in status:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get clock-in status" },
      { status: 500 }
    );
  }
}

