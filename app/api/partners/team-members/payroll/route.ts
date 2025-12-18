// app/api/partners/team-members/payroll/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getEmployeeData, getEmployeePartnerId } from "@/lib/employee-utils";
import { getActivePartner } from "@/lib/partner-auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/partners/team-members/payroll
 * Get payroll summary for all partner employees
 * Query params: partnerId (optional, will use userId if not provided), startDate, endDate
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const partnerId = searchParams.get("partnerId");
    const userId = searchParams.get("userId");
    const startDate = searchParams.get("startDate"); // YYYY-MM-DD
    const endDate = searchParams.get("endDate"); // YYYY-MM-DD

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    // Get partner ID
    let finalPartnerId = partnerId;
    if (!finalPartnerId && userId) {
      const partner = await getActivePartner(userId);
      if (!partner) {
        return NextResponse.json(
          { error: "Partner not found or not active" },
          { status: 401 }
        );
      }
      finalPartnerId = partner.id;
    }

    if (!finalPartnerId) {
      return NextResponse.json(
        { error: "partnerId or userId is required" },
        { status: 400 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get all employees for this partner
    const employeesQuery = query(
      collection(db, "users"),
      where("role", "==", "employee"),
      where("partnerId", "==", finalPartnerId)
    );
    const employeesSnapshot = await getDocs(employeesQuery);

    const payrollSummary: Array<{
      employeeId: string;
      employeeName: string;
      email: string;
      payRatePerJob: number;
      completedJobs: number;
      totalEarnings: number;
      dateRange: string;
    }> = [];

    // Calculate earnings for each employee
    for (const employeeDoc of employeesSnapshot.docs) {
      const employeeData = employeeDoc.data();
      const employeeId = employeeDoc.id;
      const payRatePerJob = employeeData.payRatePerJob || 10;

      // Get completed jobs for this employee
      let jobsQuery = query(
        collection(db, "scheduledCleanings"),
        where("assignedEmployeeId", "==", employeeId),
        where("jobStatus", "==", "completed"),
        where("partnerId", "==", finalPartnerId)
      );

      // Apply date filters if provided
      if (startDate) {
        jobsQuery = query(
          collection(db, "scheduledCleanings"),
          where("assignedEmployeeId", "==", employeeId),
          where("jobStatus", "==", "completed"),
          where("partnerId", "==", finalPartnerId),
          where("scheduledDate", ">=", startDate)
        );
      }
      if (endDate) {
        jobsQuery = query(
          collection(db, "scheduledCleanings"),
          where("assignedEmployeeId", "==", employeeId),
          where("jobStatus", "==", "completed"),
          where("partnerId", "==", finalPartnerId),
          where("scheduledDate", "<=", endDate)
        );
      }

      const jobsSnapshot = await getDocs(jobsQuery);

      // Filter to only include jobs with required photos
      const eligibleJobs = jobsSnapshot.docs.filter(doc => {
        const data = doc.data();
        if (data.hasRequiredPhotos === true) {
          return true;
        }
        if (data.insidePhotoUrl && data.outsidePhotoUrl) {
          return true;
        }
        return false;
      });

      const completedJobs = eligibleJobs.length;
      // Convert payRatePerJob (dollars) to cents for consistency with partnerBookings
      const payRatePerJobCents = Math.round(payRatePerJob * 100);
      const totalEarnings = completedJobs * payRatePerJobCents;

      payrollSummary.push({
        employeeId,
        employeeName: `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim(),
        email: employeeData.email || "",
        payRatePerJob: payRatePerJobCents, // Return in cents
        completedJobs,
        totalEarnings, // In cents
        dateRange: startDate && endDate ? `${startDate} to ${endDate}` : "all time",
      });
    }

    // Calculate totals
    const totalPayroll = payrollSummary.reduce((sum, emp) => sum + emp.totalEarnings, 0);
    const totalJobs = payrollSummary.reduce((sum, emp) => sum + emp.completedJobs, 0);

    return NextResponse.json({
      partnerId: finalPartnerId,
      period: {
        startDate: startDate || null,
        endDate: endDate || null,
      },
      employees: payrollSummary,
      totals: {
        totalEmployees: payrollSummary.length,
        totalJobs,
        totalPayroll,
      },
    });
  } catch (error: any) {
    console.error("[Partner Payroll] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get payroll summary" },
      { status: 500 }
    );
  }
}
