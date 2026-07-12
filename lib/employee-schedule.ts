import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import {
  EmployeeDaySchedule,
  getDefaultEmployeeSchedule,
  getWeekStartDate,
} from "@/lib/day-assignment";

export async function loadEmployeeScheduleForDate(
  employeeId: string,
  dateString: string
): Promise<EmployeeDaySchedule[]> {
  const db = await getDbInstance();
  if (!db) {
    return getDefaultEmployeeSchedule();
  }

  const firestore = await safeImportFirestore();
  const { doc, getDoc } = firestore;

  const weekStartDate = getWeekStartDate(new Date(`${dateString}T12:00:00`));
  const scheduleId = `${employeeId}_${weekStartDate}`;
  const scheduleRef = doc(db, "employeeSchedules", scheduleId);
  const scheduleSnap = await getDoc(scheduleRef);

  if (!scheduleSnap.exists()) {
    return getDefaultEmployeeSchedule();
  }

  const schedule = scheduleSnap.data()?.schedule;
  if (!Array.isArray(schedule) || schedule.length !== 7) {
    return getDefaultEmployeeSchedule();
  }

  return schedule as EmployeeDaySchedule[];
}
