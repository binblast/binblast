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

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export async function buildOperatorTimecard(operatorId: string): Promise<OperatorTimecardSummary | null> {
  const operator = await getOperatorAccount(operatorId);
  if (!operator) return null;

  const settings = await loadCompensationSettings();
  const hourlyRate = settings.hourlyRate || 0;
  const today = getTodayDateString();
  const weekDates = getWeekDateStrings();

  const db = await getAdminFirestore();
  const clockSnap = await db
    .collection("clockIns")
    .where("employeeId", "==", operatorId)
    .where("date", "in", weekDates)
    .get();

  const clocksByDate = new Map<string, ClockRecord[]>();
  clockSnap.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const data = doc.data() as ClockRecord;
    const date = data.date;
    if (!date) return;
    if (!clocksByDate.has(date)) clocksByDate.set(date, []);
    clocksByDate.get(date)!.push(data);
  });

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
