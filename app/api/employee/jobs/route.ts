// app/api/employee/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";
import { checkCertificationStatus } from "@/lib/training-certification";

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

    // Check certification status
    const certification = await checkCertificationStatus(employeeId);
    if (!certification.canWorkRoutes) {
      if (certification.status === "expired") {
        return NextResponse.json(
          {
            message: "Your certification has expired. Please complete re-certification training.",
            certificationStatus: certification.status,
            expiredModules: certification.expiredModules,
            jobs: [],
          },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          {
            message: "You must complete all required training modules before receiving route assignments.",
            certificationStatus: certification.status,
            missingModules: certification.missingModules,
            completedModules: certification.completedModules,
            totalModules: certification.totalModules,
            jobs: [],
          },
          { status: 403 }
        );
      }
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const today = getTodayDateString();
    const cleaningsRef = collection(db, "scheduledCleanings");
    
    // Get jobs assigned to this employee for today
    const jobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId),
      where("scheduledDate", "==", today)
    );

    const snapshot = await getDocs(jobsQuery);
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; addressLine1?: string; [key: string]: any }>;
    
    // Sort by address on client side for route planning
    jobs.sort((a, b) => {
      const addressA = (a.addressLine1 || "").toLowerCase();
      const addressB = (b.addressLine1 || "").toLowerCase();
      return addressA.localeCompare(addressB);
    });

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error("Error getting jobs:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get jobs" },
      { status: 500 }
    );
  }
}

