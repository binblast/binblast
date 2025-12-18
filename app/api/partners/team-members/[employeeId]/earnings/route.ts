// app/api/partners/team-members/[employeeId]/earnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getEmployeeData, getEmployeePartnerId } from "@/lib/employee-utils";
import { getActivePartner } from "@/lib/partner-auth";

export const dynamic = 'force-dynamic';

/**
 * GET /api/partners/team-members/[employeeId]/earnings
 * Get earnings for a partner employee
 * Only counts jobs from partner bookings (scheduledCleanings with partnerId)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const searchParams = req.nextUrl.searchParams;
    const date = searchParams.get("date"); // Optional: YYYY-MM-DD format, defaults to today
    const partnerId = searchParams.get("partnerId"); // Optional: for verification

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    // Get employee data
    const employee = await getEmployeeData(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    // Verify employee belongs to a partner
    const employeePartnerId = employee.partnerId || await getEmployeePartnerId(employeeId);
    if (!employeePartnerId) {
      return NextResponse.json(
        { error: "Employee is not a partner employee" },
        { status: 403 }
      );
    }

    // If partnerId provided, verify it matches
    if (partnerId && partnerId !== employeePartnerId) {
      return NextResponse.json(
        { error: "Employee does not belong to this partner" },
        { status: 403 }
      );
    }

    const payRatePerJob = employee.payRatePerJob || 10;
    const targetDate = date || getTodayDateString();

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get completed jobs for this employee on the target date
    // Only count jobs from this partner's bookings (scheduledCleanings with partnerId)
    const cleaningsRef = collection(db, "scheduledCleanings");
    const completedJobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", targetDate),
      where("jobStatus", "==", "completed"),
      where("partnerId", "==", employeePartnerId) // Only partner's jobs
    );

    const completedSnapshot = await getDocs(completedJobsQuery);
    
    // Filter to only include jobs with required photos
    const eligibleJobs = completedSnapshot.docs.filter(doc => {
      const data = doc.data();
      if (data.hasRequiredPhotos === true) {
        return true;
      }
      // Backward compatibility: check if both photo URLs exist
      if (data.insidePhotoUrl && data.outsidePhotoUrl) {
        return true;
      }
      return false;
    });

    const completedStops = eligibleJobs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        addressLine1: data.addressLine1 || "",
        addressLine2: data.addressLine2 || "",
        city: data.city || "",
        state: data.state || "",
        zipCode: data.zipCode || "",
        customerName: data.customerName || data.userEmail || "N/A",
        completedAt: data.completedAt,
        earnings: payRatePerJob,
        hasRequiredPhotos: data.hasRequiredPhotos || false,
        partnerId: data.partnerId || employeePartnerId,
      };
    });

    const totalEarnings = completedStops.length * payRatePerJob;

    const stopsWithEarnings = completedStops.map(stop => ({
      ...stop,
      fullAddress: `${stop.addressLine1}${stop.addressLine2 ? `, ${stop.addressLine2}` : ""}, ${stop.city}, ${stop.state} ${stop.zipCode}`.trim(),
      formattedEarnings: `$${payRatePerJob.toFixed(2)}`,
    }));

    return NextResponse.json({
      totalEarnings,
      payRatePerJob,
      completedStopsCount: completedStops.length,
      date: targetDate,
      partnerId: employeePartnerId,
      stops: stopsWithEarnings,
    });
  } catch (error: any) {
    console.error("[Partner Employee Earnings] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get earnings" },
      { status: 500 }
    );
  }
}
