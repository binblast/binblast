// app/api/employee/clock-in/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clockInEmployee } from "@/lib/clock-in-service";
import { checkCertificationStatus } from "@/lib/training-certification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, employeeEmail } = body;

    if (!employeeId || !employeeEmail) {
      return NextResponse.json(
        { message: "Missing employeeId or employeeEmail" },
        { status: 400 }
      );
    }

    const certification = await checkCertificationStatus(employeeId);
    if (!certification.canClockIn) {
      if (certification.status === "expired") {
        return NextResponse.json(
          {
            message: "Your certification has expired. Please complete re-certification training before clocking in.",
            certificationStatus: certification.status,
            expiredModules: certification.expiredModules,
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          {
            message: "You must complete all required training modules before clocking in.",
            certificationStatus: certification.status,
            missingModules: certification.missingModules,
            completedModules: certification.completedModules,
            totalModules: certification.totalModules,
          },
          { status: 403 }
        );
      }
    }

    const result = await clockInEmployee({
      employeeId,
      employeeEmail,
    });

    return NextResponse.json(
      {
        message: result.message,
        clockInId: result.clockInId,
        date: result.date,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Clock-in error:", error);
    return NextResponse.json(
      { message: error.message || "Failed to clock in" },
      { status: 500 }
    );
  }
}

