import { getAdminFirestore } from "@/lib/firebase-admin";
import { getTodayDateString } from "@/lib/employee-utils";
import { compareCleaningPriority } from "@/lib/day-assignment";
import { formatLocalDateString } from "@/lib/operator-stop-dates";

export interface OperatorStopRecord extends Record<string, unknown> {
  id: string;
  scheduledDate?: string;
  scheduledTime?: string;
  routeSequence?: number;
}

function getUpcomingDateStrings(daysAhead = 7): string[] {
  const dates: string[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);

  for (let index = 0; index < daysAhead; index++) {
    dates.push(formatLocalDateString(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

async function loadStopsForDate(employeeId: string, scheduledDate: string) {
  const db = await getAdminFirestore();
  const snapshot = await db
    .collection("scheduledCleanings")
    .where("assignedEmployeeId", "==", employeeId)
    .where("scheduledDate", "==", scheduledDate)
    .get();

  return snapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    ...doc.data(),
  })) as OperatorStopRecord[];
}

export async function loadOperatorEmployeeStops(employeeId: string) {
  const today = getTodayDateString();
  const upcomingDates = getUpcomingDateStrings(6);

  const [todayStops, upcomingResults] = await Promise.all([
    loadStopsForDate(employeeId, today),
    Promise.all(upcomingDates.map((date) => loadStopsForDate(employeeId, date))),
  ]);

  const todayList = todayStops.sort((a, b) => compareCleaningPriority(a, b));
  const upcomingList = upcomingResults
    .flat()
    .sort((a, b) => {
      const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
      if (dateCompare !== 0) return dateCompare;
      return compareCleaningPriority(a, b);
    });

  return {
    todayStops: todayList,
    upcomingStops: upcomingList,
  };
}
