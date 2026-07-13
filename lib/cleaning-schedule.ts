// lib/cleaning-schedule.ts
import { getNextCleaningDate } from "@/lib/scheduling";

const PLAN_MIN_DAYS: Record<string, number> = {
  "one-time": 28,
  "twice-month": 14,
  "bi-monthly": 56,
  "quarterly": 84,
};

export interface CleaningRecord {
  id?: string;
  userId?: string;
  userEmail?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  zipCode?: string;
  trashDay?: string;
  scheduledTime?: string;
  notes?: string | null;
  status?: string;
  jobStatus?: string;
  scheduledDate?: unknown;
  assignedEmployeeId?: string | null;
  assignedEmployeeName?: string | null;
}

/** Safely parse scheduledDate from string, Date, or Firestore Timestamp. */
export function parseCleaningDate(scheduledDate: unknown): Date {
  if (!scheduledDate) return new Date();

  if (scheduledDate instanceof Date) {
    return isNaN(scheduledDate.getTime()) ? new Date() : scheduledDate;
  }

  if (
    typeof scheduledDate === "object" &&
    scheduledDate !== null &&
    "toDate" in scheduledDate &&
    typeof (scheduledDate as { toDate: () => Date }).toDate === "function"
  ) {
    try {
      const date = (scheduledDate as { toDate: () => Date }).toDate();
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }

  try {
    const date = new Date(scheduledDate as string | number);
    return isNaN(date.getTime()) ? new Date() : date;
  } catch {
    return new Date();
  }
}

export function formatCleaningDateForStorage(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isCleaningCompleted(cleaning: {
  status?: string;
  jobStatus?: string;
}): boolean {
  return cleaning.status === "completed" || cleaning.jobStatus === "completed";
}

export function isCleaningCancelled(cleaning: { status?: string }): boolean {
  return cleaning.status === "cancelled";
}

export function isCleaningUpcoming(cleaning: {
  status?: string;
  jobStatus?: string;
  scheduledDate?: unknown;
}): boolean {
  if (isCleaningCancelled(cleaning) || isCleaningCompleted(cleaning)) {
    return false;
  }
  const date = parseCleaningDate(cleaning.scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date >= today;
}

export function computeNextCleaningDate(
  trashDay: string,
  planId: string,
  afterDate: Date
): Date | null {
  const minDays = PLAN_MIN_DAYS[planId];
  if (!minDays || !trashDay) return null;

  const ref = new Date(afterDate);
  ref.setHours(0, 0, 0, 0);
  ref.setDate(ref.getDate() + minDays);

  return getNextCleaningDate(trashDay, "WEEKLY", ref);
}

export function buildCompletionUpdateData(status: string): Record<string, unknown> {
  const updates: Record<string, unknown> = { status };

  if (status === "completed") {
    updates.jobStatus = "completed";
  } else if (status === "in-progress") {
    updates.jobStatus = "in_progress";
  } else if (status === "pending" || status === "upcoming") {
    updates.jobStatus = "pending";
  }

  return updates;
}

