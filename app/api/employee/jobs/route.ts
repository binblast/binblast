// app/api/employee/jobs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";
import { checkCertificationStatus } from "@/lib/training-certification";
import { isActiveCleaningStatus } from "@/lib/cleaning-status";

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

    const certification = await checkCertificationStatus(employeeId);
    if (!certification.canWorkRoutes) {
      if (certification.status === "expired") {
        return NextResponse.json(
          {
            message: "Your certification has expired. Please complete re-certification training.",
            certificationStatus: certification.status,
            expiredModules: certification.expiredModules,
            jobs: [],
            todayJobs: [],
            upcomingJobs: [],
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
            todayJobs: [],
            upcomingJobs: [],
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

    const jobsQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId)
    );

    const snapshot = await getDocs(jobsQuery);
    const allJobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<{ id: string; addressLine1?: string; scheduledDate?: string; status?: string; jobStatus?: string; [key: string]: unknown }>;

    const normalizeJob = (job: (typeof allJobs)[number]) => ({
      ...job,
      binCount: (job.binCount as number | undefined) ?? (job.binsCount as number | undefined) ?? 1,
    });

    const activeJobs = allJobs
      .filter((job) => {
        return (
          job.scheduledDate &&
          job.scheduledDate >= today &&
          isActiveCleaningStatus(job.status, job.jobStatus)
        );
      })
      .map(normalizeJob);

    const sortByDateAndAddress = (jobs: ReturnType<typeof normalizeJob>[]) => {
      jobs.sort((a, b) => {
        const dateA = String(a.scheduledDate || "");
        const dateB = String(b.scheduledDate || "");
        if (dateA !== dateB) {
          return dateA.localeCompare(dateB);
        }
        const addressA = String(a.addressLine1 || "").toLowerCase();
        const addressB = String(b.addressLine1 || "").toLowerCase();
        return addressA.localeCompare(addressB);
      });
      return jobs;
    };

    const todayJobs = sortByDateAndAddress(
      activeJobs.filter((job) => job.scheduledDate === today)
    );
    const upcomingJobs = sortByDateAndAddress(
      activeJobs.filter((job) => job.scheduledDate && job.scheduledDate > today)
    );

    return NextResponse.json({
      jobs: todayJobs,
      todayJobs,
      upcomingJobs,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error("Error getting jobs:", error);
    const message = error instanceof Error ? error.message : "Failed to get jobs";
    return NextResponse.json(
      { message },
      { status: 500 }
    );
  }
}
