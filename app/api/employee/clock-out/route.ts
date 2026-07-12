// app/api/employee/clock-out/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clockOutEmployee } from "@/lib/clock-in-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { message: "Missing employeeId" },
        { status: 400 }
      );
    }

    const result = await clockOutEmployee({ employeeId });

    return NextResponse.json(
      {
        message: result.message,
        hoursWorked: result.hoursWorked,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Clock-out error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to clock out" },
      { status: 500 }
    );
  }
}

