// app/api/employee/dashboard/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString, getEmployeeData, getEmployeeClockInStatus } from "@/lib/employee-utils";
import { checkCertificationStatus } from "@/lib/training-certification";

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

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { message: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get employee data
    const employee = await getEmployeeData(employeeId);
    if (!employee) {
      return NextResponse.json(
        { message: "Employee not found" },
        { status: 404 }
      );
    }

    // Get clock-in status
    const clockInStatus = await getEmployeeClockInStatus(employeeId);
    const isClockedIn = clockInStatus?.isActive === true;

    // Get certification status
    const certification = await checkCertificationStatus(employeeId);

    // Get today's jobs
    const today = getTodayDateString();
    const cleaningsRef = collection(db, "scheduledCleanings");
    
    // Get all jobs assigned to this employee (for lifetime count)
    const allJobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId)
    );
    const allJobsSnapshot = await getDocs(allJobsQuery);
    
    // Filter today's jobs
    const todayJobs = allJobsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .filter((job: any) => job.scheduledDate === today);

    // Count completed jobs today (with required photos)
    const completedToday = todayJobs.filter((job: any) => {
      if (job.jobStatus !== "completed") return false;
      return job.hasRequiredPhotos === true || 
             (job.insidePhotoUrl && job.outsidePhotoUrl);
    }).length;

    // Count lifetime completed jobs
    const lifetimeCompleted = allJobsSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return (data.jobStatus === "completed" || data.status === "completed") &&
             (data.hasRequiredPhotos === true || 
              (data.insidePhotoUrl && data.outsidePhotoUrl));
    }).length;

    // Calculate today's streak (jobs completed today)
    const todayStreak = completedToday;

    // Calculate pay
    const payRatePerJob = employee.payRatePerJob || 0;
    const estimatedPayToday = completedToday * payRatePerJob;

    // Get route name (if available from first job or employee data)
    const routeName = todayJobs.length > 0 
      ? todayJobs[0].routeName || employee.serviceArea?.[0] || undefined
      : undefined;

    // Estimate time (rough calculation: ~15 min per job)
    const estimatedMinutes = todayJobs.length * 15;
    const estimatedHours = Math.floor(estimatedMinutes / 60);
    const estimatedMins = estimatedMinutes % 60;
    const estimatedTime = estimatedHours > 0
      ? `${estimatedHours}h ${estimatedMins}m`
      : `${estimatedMins}m`;

    return NextResponse.json(
      {
        clockedIn: isClockedIn,
        shiftStart: clockInStatus?.clockInTime || null,
        routeName,
        stopsToday: todayJobs.length,
        stopsCompleted: completedToday,
        estPayToday: estimatedPayToday,
        payRate: payRatePerJob,
        jobs: todayJobs,
        lifetimeJobs: lifetimeCompleted,
        certification: {
          status: certification.status,
          isCertified: certification.isCertified,
          expiresAt: certification.expiresAt,
          daysUntilExpiration: certification.daysUntilExpiration,
        },
        todayStreak,
        estimatedTime,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error getting dashboard data:", error);
    return NextResponse.json(
      { message: error.message || "Failed to get dashboard data" },
      { status: 500 }
    );
  }
}

