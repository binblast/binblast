// app/api/employee/certification-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { checkCertificationStatus } from "@/lib/training-certification";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const certification = await checkCertificationStatus(employeeId);

    return NextResponse.json(certification);
  } catch (error: any) {
    console.error("Error checking certification status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check certification status" },
      { status: 500 }
    );
  }
}

