import { getTodayDateString } from "@/lib/employee-utils";

export function formatLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getOperatorStopDateWindow(daysAhead = 7) {
  const today = getTodayDateString();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + daysAhead);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return {
    today,
    tomorrow: formatLocalDateString(tomorrow),
    endDate: formatLocalDateString(endDate),
  };
}
