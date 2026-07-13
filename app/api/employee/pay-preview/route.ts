// app/api/employee/pay-preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString } from "@/lib/employee-utils";
import {
  getBinsFromCleaning,
} from "@/lib/operator-fleet-payroll";
import {
  loadCompensationSettings,
} from "@/lib/employee-compensation-server";
import {
  getJobCompensationAmount,
  isJobEligibleForCompensation,
} from "@/lib/employee-compensation";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json({ message: "Missing employeeId" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const employeeDoc = await db.collection("users").doc(employeeId).get();
    if (!employeeDoc.exists) {
      return NextResponse.json({ message: "Employee not found" }, { status: 404 });
    }

    const settings = await loadCompensationSettings();
    const today = getTodayDateString();

    const completedSnapshot = await db
      .collection("scheduledCleanings")
      .where("assignedEmployeeId", "==", employeeId)
      .where("scheduledDate", "==", today)
      .where("jobStatus", "==", "completed")
      .get();

    const eligibleJobs = completedSnapshot.docs
      .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as Record<string, unknown>)
      .filter((data: Record<string, unknown>) => isJobEligibleForCompensation(data, settings));

    const completedJobsCount = eligibleJobs.length;
    const binsToday = eligibleJobs.reduce(
      (sum: number, job: Record<string, unknown>) => sum + getBinsFromCleaning(job),
      0
    );
    const estimatedPay = eligibleJobs.reduce(
      (sum: number, job: Record<string, unknown>) => sum + getJobCompensationAmount(job, settings),
      0
    );

    const lastJob = eligibleJobs[eligibleJobs.length - 1];
    const lastJobEarnings = lastJob ? getJobCompensationAmount(lastJob, settings) : 0;
    const lastJobBins = lastJob ? getBinsFromCleaning(lastJob) : 0;

    return NextResponse.json(
      {
        completedJobs: completedJobsCount,
        binsToday,
        estimatedPay: Math.round(estimatedPay * 100) / 100,
        lastJobEarnings: Math.round(lastJobEarnings * 100) / 100,
        lastJobBins,
        compensationSettings: {
          payModel: settings.payModel,
          residentialFirstBinPay: settings.residentialFirstBinPay,
          residentialAdditionalBinPay: settings.residentialAdditionalBinPay,
          commercialFirstContainerPay: settings.commercialFirstContainerPay,
          commercialAdditionalContainerPay: settings.commercialAdditionalContainerPay,
        },
        // Backward compatibility for older UI references
        payRatePerJob: settings.residentialFirstBinPay,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Error getting pay preview:", error);
    const message = error instanceof Error ? error.message : "Failed to get pay preview";
    return NextResponse.json({ message }, { status: 500 });
  }
}
