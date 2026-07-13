import { NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { formatEmployeeName } from "@/lib/operator-fleet";
import {
  FleetPayrollDaySummary,
  FleetPayrollEmployeeSummary,
  getBinsFromCleaning,
  getWeekDateStrings,
  isEligibleForPay,
  isJobCompleted,
  serializeTimestamp,
  sumClockHours,
} from "@/lib/operator-fleet-payroll";
import { getTodayDateString } from "@/lib/employee-utils";

export const dynamic = "force-dynamic";

type ClockRecord = {
  employeeId?: string;
  clockInTime?: unknown;
  clockOutTime?: unknown | null;
  isActive?: boolean;
  date?: string;
};

type CleaningRecord = {
  assignedEmployeeId?: string;
  scheduledDate?: string;
  binsCount?: number;
  binCount?: number;
  status?: string;
  jobStatus?: string;
  hasRequiredPhotos?: boolean;
  operatorSkipPhotos?: boolean;
  insidePhotoUrl?: string;
  outsidePhotoUrl?: string;
};

function buildDaySummary({
  clockRecords,
  cleanings,
  payRatePerJob,
}: {
  clockRecords: ClockRecord[];
  cleanings: CleaningRecord[];
  payRatePerJob: number;
}): FleetPayrollDaySummary {
  const completed = cleanings.filter(isJobCompleted);
  const eligible = completed.filter(isEligibleForPay);
  const primaryClock = clockRecords[0];

  return {
    hoursWorked: Math.round(sumClockHours(clockRecords) * 100) / 100,
    jobsCompleted: completed.length,
    jobsEligible: eligible.length,
    binsCleaned: completed.reduce((sum, cleaning) => sum + getBinsFromCleaning(cleaning), 0),
    earnings: Math.round(eligible.length * payRatePerJob * 100) / 100,
    clockInTime: primaryClock ? serializeTimestamp(primaryClock.clockInTime) : null,
    clockOutTime: primaryClock?.isActive
      ? null
      : serializeTimestamp(primaryClock?.clockOutTime ?? null),
    isActive: clockRecords.some((record) => record.isActive === true),
  };
}

export async function GET() {
  try {
    const db = await getAdminFirestore();
    const today = getTodayDateString();
    const weekDates = getWeekDateStrings();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[weekDates.length - 1];

    const employeesSnap = await db
      .collection("users")
      .where("role", "==", "employee")
      .get();

    const [clockSnap, cleaningsSnap] = await Promise.all([
      db.collection("clockIns").where("date", "in", weekDates).get(),
      db.collection("scheduledCleanings").where("scheduledDate", "in", weekDates).get(),
    ]);

    const clocksByEmployeeDate = new Map<string, Map<string, ClockRecord[]>>();
    clockSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as ClockRecord;
      const employeeId = data.employeeId;
      const date = data.date;
      if (!employeeId || !date) return;
      if (!clocksByEmployeeDate.has(employeeId)) {
        clocksByEmployeeDate.set(employeeId, new Map());
      }
      const employeeDates = clocksByEmployeeDate.get(employeeId)!;
      if (!employeeDates.has(date)) employeeDates.set(date, []);
      employeeDates.get(date)!.push(data);
    });

    const cleaningsByEmployeeDate = new Map<string, Map<string, CleaningRecord[]>>();
    cleaningsSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data() as CleaningRecord;
      const employeeId = data.assignedEmployeeId;
      const date = data.scheduledDate;
      if (!employeeId || !date) return;
      if (!cleaningsByEmployeeDate.has(employeeId)) {
        cleaningsByEmployeeDate.set(employeeId, new Map());
      }
      const employeeDates = cleaningsByEmployeeDate.get(employeeId)!;
      if (!employeeDates.has(date)) employeeDates.set(date, []);
      employeeDates.get(date)!.push(data);
    });

    const employees: FleetPayrollEmployeeSummary[] = employeesSnap.docs
      .map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const data = doc.data() as Record<string, unknown>;
        const employeeId = doc.id;
        const payRatePerJob = Number(data.payRatePerJob || 10);
        const isPartnerEmployee = Boolean(data.partnerId);
        const employeeClocks = clocksByEmployeeDate.get(employeeId) || new Map();
        const employeeCleanings = cleaningsByEmployeeDate.get(employeeId) || new Map();

        const todayClocks = employeeClocks.get(today) || [];
        const todayCleanings = employeeCleanings.get(today) || [];
        const todaySummary = buildDaySummary({
          clockRecords: todayClocks,
          cleanings: todayCleanings,
          payRatePerJob: isPartnerEmployee ? 0 : payRatePerJob,
        });

        let weekHours = 0;
        let weekJobsCompleted = 0;
        let weekJobsEligible = 0;
        let weekBins = 0;
        let weekEarnings = 0;
        let daysWorked = 0;

        weekDates.forEach((date) => {
          const dayClocks = employeeClocks.get(date) || [];
          const dayCleanings = employeeCleanings.get(date) || [];
          const dayHours = sumClockHours(dayClocks);
          if (dayHours > 0) daysWorked += 1;

          const completed = dayCleanings.filter(isJobCompleted);
          const eligible = completed.filter(isEligibleForPay);

          weekHours += dayHours;
          weekJobsCompleted += completed.length;
          weekJobsEligible += eligible.length;
          weekBins += completed.reduce(
            (sum: number, cleaning: CleaningRecord) => sum + getBinsFromCleaning(cleaning),
            0
          );
          if (!isPartnerEmployee) {
            weekEarnings += eligible.length * payRatePerJob;
          }
        });

        return {
          id: employeeId,
          name: formatEmployeeName(
            `${String(data.firstName || "")} ${String(data.lastName || "")}`.trim() ||
              String(data.email || "Employee")
          ),
          email: String(data.email || ""),
          payRatePerJob,
          isPartnerEmployee,
          today: todaySummary,
          week: {
            hoursWorked: Math.round(weekHours * 100) / 100,
            jobsCompleted: weekJobsCompleted,
            jobsEligible: weekJobsEligible,
            binsCleaned: weekBins,
            earnings: Math.round(weekEarnings * 100) / 100,
            daysWorked,
          },
        };
      })
      .sort((a: FleetPayrollEmployeeSummary, b: FleetPayrollEmployeeSummary) => {
        if (b.today.earnings !== a.today.earnings) return b.today.earnings - a.today.earnings;
        if (b.today.jobsCompleted !== a.today.jobsCompleted) {
          return b.today.jobsCompleted - a.today.jobsCompleted;
        }
        return a.name.localeCompare(b.name);
      });

    const totals = employees.reduce(
      (acc, employee) => {
        acc.todayHours += employee.today.hoursWorked;
        acc.todayBins += employee.today.binsCleaned;
        acc.todayEarnings += employee.today.earnings;
        acc.weekHours += employee.week.hoursWorked;
        acc.weekBins += employee.week.binsCleaned;
        acc.weekEarnings += employee.week.earnings;
        return acc;
      },
      {
        todayHours: 0,
        todayBins: 0,
        todayEarnings: 0,
        weekHours: 0,
        weekBins: 0,
        weekEarnings: 0,
      }
    );

    return NextResponse.json({
      today,
      weekStart,
      weekEnd,
      totals: {
        todayHours: Math.round(totals.todayHours * 100) / 100,
        todayBins: totals.todayBins,
        todayEarnings: Math.round(totals.todayEarnings * 100) / 100,
        weekHours: Math.round(totals.weekHours * 100) / 100,
        weekBins: totals.weekBins,
        weekEarnings: Math.round(totals.weekEarnings * 100) / 100,
      },
      employees,
    });
  } catch (error: unknown) {
    console.error("[Operator Fleet Payroll] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load fleet payroll";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
