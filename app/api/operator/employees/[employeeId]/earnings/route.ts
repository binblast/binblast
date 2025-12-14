// app/api/operator/employees/[employeeId]/earnings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getEmployeeData } from "@/lib/employee-utils";

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

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    // Get employee data to find pay rate
    const employee = await getEmployeeData(employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    const payRatePerJob = employee.payRatePerJob || 10; // Default to $10 if not set

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get today's completed stops
    const today = getTodayDateString();
    const cleaningsRef = collection(db, "scheduledCleanings");
    const completedJobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", today),
      where("jobStatus", "==", "completed")
    );

    const completedSnapshot = await getDocs(completedJobsQuery);
    const completedStops = completedSnapshot.docs.map(doc => {
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
      };
    });

    // Calculate total earnings
    const totalEarnings = completedStops.length * payRatePerJob;

    // Format addresses for display
    const stopsWithEarnings = completedStops.map(stop => ({
      ...stop,
      fullAddress: `${stop.addressLine1}${stop.addressLine2 ? `, ${stop.addressLine2}` : ""}, ${stop.city}, ${stop.state} ${stop.zipCode}`.trim(),
      formattedEarnings: `$${payRatePerJob.toFixed(2)}`,
    }));

    return NextResponse.json({
      totalEarnings,
      payRatePerJob,
      completedStopsCount: completedStops.length,
      stops: stopsWithEarnings,
    });
  } catch (error: any) {
    console.error("Error getting earnings:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get earnings" },
      { status: 500 }
    );
  }
}

