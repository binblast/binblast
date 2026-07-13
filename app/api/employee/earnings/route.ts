import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString, parseFirestoreTimestamp } from "@/lib/employee-utils";
import {
  getBinsFromCleaning,
  getWeekDateStrings,
  isJobCompleted,
} from "@/lib/operator-fleet-payroll";
import {
  loadCompensationSettings,
} from "@/lib/employee-compensation-server";
import {
  getJobCompensationAmount,
  isJobEligibleForCompensation,
} from "@/lib/employee-compensation";

export const dynamic = "force-dynamic";

function getMonthDateStrings(reference = new Date()): { start: string; end: string; dates: string[] } {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  const end = new Date(reference.getFullYear(), reference.getMonth() + 1, 0);
  const dates: string[] = [];

  for (let day = new Date(start); day <= end; day.setDate(day.getDate() + 1)) {
    dates.push(day.toISOString().slice(0, 10));
  }

  return {
    start: dates[0],
    end: dates[dates.length - 1],
    dates,
  };
}

function chunkDates(dates: string[], size = 10): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < dates.length; index += size) {
    chunks.push(dates.slice(index, index + size));
  }
  return chunks;
}

type CleaningRecord = Record<string, unknown> & {
  scheduledDate?: string;
};

async function loadEmployeeCleanings(
  employeeId: string,
  dates: string[]
): Promise<CleaningRecord[]> {
  const db = await getAdminFirestore();
  const chunks = chunkDates(dates);
  const results: CleaningRecord[] = [];

  for (const chunk of chunks) {
    const snapshot = await db
      .collection("scheduledCleanings")
      .where("assignedEmployeeId", "==", employeeId)
      .where("scheduledDate", "in", chunk)
      .get();

    snapshot.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      results.push({ id: doc.id, ...(doc.data() as CleaningRecord) });
    });
  }

  return results;
}

function summarizeCleanings(
  cleanings: CleaningRecord[],
  settings: Awaited<ReturnType<typeof loadCompensationSettings>>
) {
  const completed = cleanings.filter(isJobCompleted);
  const eligible = completed.filter((cleaning) => isJobEligibleForCompensation(cleaning, settings));

  const bins = completed.reduce((sum, cleaning) => sum + getBinsFromCleaning(cleaning), 0);
  const earnings = eligible.reduce(
    (sum, cleaning) => sum + getJobCompensationAmount(cleaning, settings),
    0
  );

  return {
    jobs: completed.length,
    bins,
    earnings: Math.round(earnings * 100) / 100,
  };
}

export async function GET(req: NextRequest) {
  try {
    const employeeId = req.nextUrl.searchParams.get("employeeId");
    if (!employeeId) {
      return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const employeeDoc = await db.collection("users").doc(employeeId).get();
    if (!employeeDoc.exists) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const settings = await loadCompensationSettings();
    const today = getTodayDateString();
    const weekDates = getWeekDateStrings();
    const monthRange = getMonthDateStrings();

    const [todayCleanings, weekCleanings, monthCleanings, eventsSnap] = await Promise.all([
      loadEmployeeCleanings(employeeId, [today]),
      loadEmployeeCleanings(employeeId, weekDates),
      loadEmployeeCleanings(employeeId, monthRange.dates),
      db
        .collection("compensationEvents")
        .where("employeeId", "==", employeeId)
        .orderBy("createdAt", "desc")
        .limit(25)
        .get()
        .catch(() => null),
    ]);

    const todaySummary = summarizeCleanings(todayCleanings, settings);
    const week = summarizeCleanings(weekCleanings, settings);
    const month = summarizeCleanings(monthCleanings, settings);

    const lifetimeCleanings = await db
      .collection("scheduledCleanings")
      .where("assignedEmployeeId", "==", employeeId)
      .where("jobStatus", "==", "completed")
      .get();

    const lifetimeEligible = lifetimeCleanings.docs
      .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => doc.data() as CleaningRecord)
      .filter((cleaning: CleaningRecord) => isJobEligibleForCompensation(cleaning, settings));

    const lifetimeEarnings = lifetimeEligible.reduce(
      (sum: number, cleaning: CleaningRecord) => sum + getJobCompensationAmount(cleaning, settings),
      0
    );
    const lifetimeJobs = lifetimeEligible.length;
    const lifetimeBins = lifetimeEligible.reduce(
      (sum: number, cleaning: CleaningRecord) => sum + getBinsFromCleaning(cleaning),
      0
    );

    const recentPayments = (eventsSnap?.docs || []).map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      const createdAt = parseFirestoreTimestamp(data.createdAt);
      return {
        id: doc.id,
        jobId: data.jobId || null,
        amount: Number(data.amount || 0),
        bins: Number(data.bins || 0),
        category: data.category || "residential",
        scheduledDate: data.scheduledDate || null,
        createdAt: createdAt ? createdAt.toISOString() : null,
        status: data.status || "earned",
      };
    });

    return NextResponse.json({
      settings: {
        payModel: settings.payModel,
        residentialFirstBinPay: settings.residentialFirstBinPay,
        residentialAdditionalBinPay: settings.residentialAdditionalBinPay,
      },
      today: {
        jobs: todaySummary.jobs,
        bins: todaySummary.bins,
        earnings: todaySummary.earnings,
      },
      week: {
        jobs: week.jobs,
        bins: week.bins,
        earnings: week.earnings,
      },
      month: {
        jobs: month.jobs,
        bins: month.bins,
        earnings: month.earnings,
      },
      lifetime: {
        jobs: lifetimeJobs,
        bins: lifetimeBins,
        earnings: Math.round(lifetimeEarnings * 100) / 100,
        avgPerJob: lifetimeJobs > 0 ? Math.round((lifetimeEarnings / lifetimeJobs) * 100) / 100 : 0,
        avgPerBin: lifetimeBins > 0 ? Math.round((lifetimeEarnings / lifetimeBins) * 100) / 100 : 0,
      },
      recentPayments,
    });
  } catch (error: unknown) {
    console.error("[Employee Earnings] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load earnings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
