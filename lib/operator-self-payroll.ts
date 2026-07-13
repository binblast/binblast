import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString } from "@/lib/employee-utils";
import { loadCompensationSettings } from "@/lib/employee-compensation-server";
import {
  getWeekDateStrings,
  serializeTimestamp,
  sumClockHours,
} from "@/lib/operator-fleet-payroll";
import { getOperatorAccount } from "@/lib/operator-clock-service";

type ClockRecord = {
  employeeId?: string;
  accountType?: string;
  clockInTime?: unknown;
  clockOutTime?: unknown | null;
  isActive?: boolean;
  date?: string;
};

export type OperatorTimecardSummary = {
  operatorId: string;
  name: string;
  email: string;
  hourlyRate: number;
  isClockedIn: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  todayHours: number;
  todayPay: number;
  weekHours: number;
  weekPay: number;
  daysWorkedThisWeek: number;
  hoursLocked: true;
  payLocked: true;
};

export type OperatorPayrollRow = {
  operatorId: string;
  operatorName: string;
  email: string;
  hourlyRate: number;
  hoursWorked: number;
  daysWorked: number;
  grossPay: number;
  paymentStatus: string;
};

export type OperatorPayrollSummary = {
  payPeriod: { startDate: string; endDate: string };
  hourlyRate: number;
  totals: {
    hoursWorked: number;
    grossPay: number;
    daysWorked: number;
  };
  operators: OperatorPayrollRow[];
};

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
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

async function loadOperatorClocksForPeriod(
  operatorId: string,
  startDate: string,
  endDate: string
): Promise<Map<string, ClockRecord[]>> {
  const db = await getAdminFirestore();
  const clockSnap = await db
    .collection("clockIns")
    .where("employeeId", "==", operatorId)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .get();

  const clocksByDate = new Map<string, ClockRecord[]>();
  clockSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data() as ClockRecord;
    const date = data.date;
    if (!date) return;
    if (!clocksByDate.has(date)) clocksByDate.set(date, []);
    clocksByDate.get(date)!.push(data);
  });

  return clocksByDate;
}

export async function buildOperatorPayrollRow(
  operatorId: string,
  startDate: string,
  endDate: string,
  hourlyRate: number
): Promise<OperatorPayrollRow | null> {
  const operator = await getOperatorAccount(operatorId);
  if (!operator) return null;

  const clocksByDate = await loadOperatorClocksForPeriod(operatorId, startDate, endDate);
  const periodDates = buildDateRange(startDate, endDate);

  let hoursWorked = 0;
  let daysWorked = 0;

  periodDates.forEach((date) => {
    const dayClocks = clocksByDate.get(date) || [];
    const dayHours = sumClockHours(dayClocks);
    if (dayHours > 0) daysWorked += 1;
    hoursWorked += dayHours;
  });

  const roundedHours = roundMoney(hoursWorked);

  return {
    operatorId,
    operatorName: operator.fullName,
    email: operator.email,
    hourlyRate,
    hoursWorked: roundedHours,
    daysWorked,
    grossPay: roundMoney(roundedHours * hourlyRate),
    paymentStatus: "pending",
  };
}

export async function buildOperatorPayrollSummary(
  startDate: string,
  endDate: string
): Promise<OperatorPayrollSummary> {
  const settings = await loadCompensationSettings();
  const hourlyRate = settings.hourlyRate || 0;

  const db = await getAdminFirestore();
  const operatorsSnap = await db.collection("users").where("role", "==", "operator").get();

  const operators = (
    await Promise.all(
      operatorsSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) =>
        buildOperatorPayrollRow(doc.id, startDate, endDate, hourlyRate)
      )
    )
  ).filter((row): row is OperatorPayrollRow => row !== null);

  operators.sort((a, b) => b.grossPay - a.grossPay || b.hoursWorked - a.hoursWorked);

  const totals = operators.reduce(
    (acc, operator) => {
      acc.hoursWorked += operator.hoursWorked;
      acc.grossPay += operator.grossPay;
      acc.daysWorked += operator.daysWorked;
      return acc;
    },
    { hoursWorked: 0, grossPay: 0, daysWorked: 0 }
  );

  return {
    payPeriod: { startDate, endDate },
    hourlyRate,
    totals: {
      hoursWorked: roundMoney(totals.hoursWorked),
      grossPay: roundMoney(totals.grossPay),
      daysWorked: totals.daysWorked,
    },
    operators,
  };
}

export async function buildOperatorTimecard(operatorId: string): Promise<OperatorTimecardSummary | null> {
  const operator = await getOperatorAccount(operatorId);
  if (!operator) return null;

  const settings = await loadCompensationSettings();
  const hourlyRate = settings.hourlyRate || 0;
  const today = getTodayDateString();
  const weekDates = getWeekDateStrings();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[weekDates.length - 1];

  const clocksByDate = await loadOperatorClocksForPeriod(operatorId, weekStart, weekEnd);

  const todayClocks = clocksByDate.get(today) || [];
  const todayHours = sumClockHours(todayClocks);

  let weekHours = 0;
  let daysWorked = 0;
  weekDates.forEach((date) => {
    const dayClocks = clocksByDate.get(date) || [];
    const dayHours = sumClockHours(dayClocks);
    if (dayHours > 0) daysWorked += 1;
    weekHours += dayHours;
  });

  const primaryTodayClock = todayClocks[0];
  const isClockedIn = todayClocks.some((record) => record.isActive === true);

  return {
    operatorId,
    name: operator.fullName,
    email: operator.email,
    hourlyRate,
    isClockedIn,
    clockInTime: primaryTodayClock ? serializeTimestamp(primaryTodayClock.clockInTime) : null,
    clockOutTime: primaryTodayClock?.isActive
      ? null
      : serializeTimestamp(primaryTodayClock?.clockOutTime ?? null),
    todayHours: roundMoney(todayHours),
    todayPay: roundMoney(todayHours * hourlyRate),
    weekHours: roundMoney(weekHours),
    weekPay: roundMoney(weekHours * hourlyRate),
    daysWorkedThisWeek: daysWorked,
    hoursLocked: true,
    payLocked: true,
  };
}

export async function buildAllOperatorTimecards(): Promise<OperatorTimecardSummary[]> {
  const db = await getAdminFirestore();
  const operatorsSnap = await db.collection("users").where("role", "==", "operator").get();

  const cards = await Promise.all(
    operatorsSnap.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => buildOperatorTimecard(doc.id))
  );

  return cards.filter((card): card is OperatorTimecardSummary => card !== null);
}
