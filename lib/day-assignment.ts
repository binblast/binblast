export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

export interface EmployeeDaySchedule {
  dayOfWeek: number;
  isWorking: boolean;
  startTime?: string;
  endTime?: string;
  maxStops?: number;
}

const DAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const PRIORITY_RANK: Record<string, number> = {
  urgent: 0,
  priority: 1,
  normal: 2,
};

export function normalizeDayName(day: string): string {
  const trimmed = day.trim().toLowerCase();
  if (!trimmed) return "";

  for (const name of DAY_NAMES) {
    if (name.toLowerCase() === trimmed) {
      return name;
    }
  }

  return day.trim();
}

export function dayNameToIndex(day: string): number | null {
  const normalized = normalizeDayName(day).toLowerCase();
  return DAY_INDEX[normalized] ?? null;
}

export function getDayNameFromDateString(dateString: string): string {
  if (!dateString) return "";
  const date = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return DAY_NAMES[date.getDay()];
}

export function getDefaultEmployeeSchedule(): EmployeeDaySchedule[] {
  return DAY_NAMES.map((_, dayOfWeek) => ({
    dayOfWeek,
    isWorking: dayOfWeek >= 1 && dayOfWeek <= 5,
    startTime: "08:00",
    endTime: "17:00",
    maxStops: 20,
  }));
}

export function getEmployeeWorkingDayNames(
  schedule: EmployeeDaySchedule[] | null | undefined
): string[] {
  const effectiveSchedule =
    Array.isArray(schedule) && schedule.length === 7
      ? schedule
      : getDefaultEmployeeSchedule();

  return effectiveSchedule
    .filter((day) => day.isWorking)
    .map((day) => DAY_NAMES[day.dayOfWeek])
    .filter(Boolean);
}

export function employeeWorksOnDayName(
  schedule: EmployeeDaySchedule[] | null | undefined,
  dayName: string
): boolean {
  const index = dayNameToIndex(dayName);
  if (index === null) return true;

  const effectiveSchedule =
    Array.isArray(schedule) && schedule.length === 7
      ? schedule
      : getDefaultEmployeeSchedule();

  const day = effectiveSchedule.find((entry) => entry.dayOfWeek === index);
  return day ? day.isWorking : true;
}

export function cleaningMatchesDayList(
  cleaning: { trashDay?: string; scheduledDate?: string },
  targetDays: string[]
): boolean {
  if (!targetDays.length) return true;

  const normalizedTargets = new Set(
    targetDays.map((day) => normalizeDayName(day)).filter(Boolean)
  );

  const trashDay = cleaning.trashDay ? normalizeDayName(cleaning.trashDay) : "";
  if (trashDay && normalizedTargets.has(trashDay)) {
    return true;
  }

  const scheduledDay = cleaning.scheduledDate
    ? normalizeDayName(getDayNameFromDateString(cleaning.scheduledDate))
    : "";

  return Boolean(scheduledDay && normalizedTargets.has(scheduledDay));
}

export function scoreCleaningForEmployee(
  cleaning: { trashDay?: string; scheduledDate?: string; assignedEmployeeId?: string | null },
  employeeWorkingDays: string[]
): number {
  let score = 0;

  const trashDay = cleaning.trashDay ? normalizeDayName(cleaning.trashDay) : "";
  const scheduledDay = cleaning.scheduledDate
    ? normalizeDayName(getDayNameFromDateString(cleaning.scheduledDate))
    : "";

  if (trashDay && employeeWorkingDays.includes(trashDay)) {
    score += 100;
  }

  if (scheduledDay && employeeWorkingDays.includes(scheduledDay)) {
    score += 80;
  }

  if (!cleaning.assignedEmployeeId) {
    score += 20;
  }

  return score;
}

export function compareCleaningPriority(
  a: { priority?: string; scheduledDate?: string; scheduledTime?: string },
  b: { priority?: string; scheduledDate?: string; scheduledTime?: string }
): number {
  const priorityA = PRIORITY_RANK[a.priority || "normal"] ?? 2;
  const priorityB = PRIORITY_RANK[b.priority || "normal"] ?? 2;
  if (priorityA !== priorityB) return priorityA - priorityB;

  const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
  if (dateCompare !== 0) return dateCompare;

  return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
}

export function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  return sunday.toISOString().split("T")[0];
}
