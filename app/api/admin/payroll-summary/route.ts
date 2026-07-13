import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { checkAdminAccess } from "@/lib/admin-auth";
import { formatEmployeeName } from "@/lib/operator-fleet";
import {
  getBinsFromCleaning,
  getWeekDateStrings,
  isJobCompleted,
} from "@/lib/operator-fleet-payroll";
import {
  isJobEligibleForCompensation,
  getJobCompensationAmount,
} from "@/lib/employee-compensation";
import { loadCompensationSettings } from "@/lib/employee-compensation-server";
import { buildOperatorPayrollSummary } from "@/lib/operator-self-payroll";

export const dynamic = "force-dynamic";

type CleaningRecord = Record<string, unknown> & {
  assignedEmployeeId?: string;
  scheduledDate?: string;
};

function parseDateParam(value: string | null, fallback: string): string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return fallback;
  }
  return value;
}

function buildDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);

  while (cursor <= endDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weekDates = getWeekDateStrings();
    const defaultStart = weekDates[0];
    const defaultEnd = weekDates[weekDates.length - 1];

    const startDate = parseDateParam(req.nextUrl.searchParams.get("startDate"), defaultStart);
    const endDate = parseDateParam(req.nextUrl.searchParams.get("endDate"), defaultEnd);
    const rangeDates = buildDateRange(startDate, endDate);

    const db = await getAdminFirestore();
    const settings = await loadCompensationSettings();

    const [employeesSnap, cleaningsSnap] = await Promise.all([
      db.collection("users").where("role", "==", "employee").get(),
      db.collection("scheduledCleanings").where("scheduledDate", "in", rangeDates).get(),
    ]);

    const cleaningsByEmployee = new Map<string, CleaningRecord[]>();
    cleaningsSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as CleaningRecord;
      const employeeId = data.assignedEmployeeId;
      if (!employeeId) return;
      if (!cleaningsByEmployee.has(employeeId)) {
        cleaningsByEmployee.set(employeeId, []);
      }
      cleaningsByEmployee.get(employeeId)!.push(data);
    });

    const rows = employeesSnap.docs
      .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data() as Record<string, unknown>;
        const employeeId = doc.id;
        const isPartnerEmployee = Boolean(data.partnerId);
        const cleanings = cleaningsByEmployee.get(employeeId) || [];

        const completed = cleanings.filter(isJobCompleted);
        const eligible = completed.filter((cleaning) =>
          isJobEligibleForCompensation(cleaning, settings)
        );

        const binsCleaned = completed.reduce(
          (sum, cleaning) => sum + getBinsFromCleaning(cleaning),
          0
        );

        const grossEarnings = isPartnerEmployee
          ? 0
          : eligible.reduce(
              (sum, cleaning) => sum + getJobCompensationAmount(cleaning, settings),
              0
            );

        const jobsCompleted = completed.length;
        const avgPerJob = jobsCompleted > 0 ? grossEarnings / jobsCompleted : 0;
        const avgPerBin = binsCleaned > 0 ? grossEarnings / binsCleaned : 0;

        return {
          employeeId,
          employeeName: formatEmployeeName(
            `${String(data.firstName || "")} ${String(data.lastName || "")}`.trim() ||
              String(data.email || "Employee")
          ),
          email: String(data.email || ""),
          isPartnerEmployee,
          jobsCompleted,
          binsCleaned,
          grossEarnings: Math.round(grossEarnings * 100) / 100,
          bonuses: 0,
          adjustments: 0,
          finalPay: Math.round(grossEarnings * 100) / 100,
          paymentStatus: "pending",
          avgPerJob: Math.round(avgPerJob * 100) / 100,
          avgPerBin: Math.round(avgPerBin * 100) / 100,
        };
      })
      .sort((a: { grossEarnings: number }, b: { grossEarnings: number }) => b.grossEarnings - a.grossEarnings);

    const totals = rows.reduce(
      (
        acc: { jobsCompleted: number; binsCleaned: number; grossEarnings: number; finalPay: number },
        row: { jobsCompleted: number; binsCleaned: number; grossEarnings: number; finalPay: number }
      ) => {
        acc.jobsCompleted += row.jobsCompleted;
        acc.binsCleaned += row.binsCleaned;
        acc.grossEarnings += row.grossEarnings;
        acc.finalPay += row.finalPay;
        return acc;
      },
      { jobsCompleted: 0, binsCleaned: 0, grossEarnings: 0, finalPay: 0 }
    );

    const operatorPayroll = await buildOperatorPayrollSummary(startDate, endDate);

    return NextResponse.json({
      payPeriod: { startDate, endDate },
      compensationSettings: {
        payModel: settings.payModel,
        residentialFirstBinPay: settings.residentialFirstBinPay,
        residentialAdditionalBinPay: settings.residentialAdditionalBinPay,
        hourlyRate: settings.hourlyRate,
      },
      totals: {
        jobsCompleted: totals.jobsCompleted,
        binsCleaned: totals.binsCleaned,
        grossEarnings: Math.round(totals.grossEarnings * 100) / 100,
        finalPay: Math.round(totals.finalPay * 100) / 100,
      },
      employees: rows,
      operatorPayroll,
    });
  } catch (error: unknown) {
    console.error("[Admin Payroll Summary] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load payroll summary";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
