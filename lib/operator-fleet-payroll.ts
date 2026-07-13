import { formatCleaningDateForStorage } from "@/lib/cleaning-schedule";
import { calculateHoursWorked, parseFirestoreTimestamp } from "@/lib/employee-utils";

export interface FleetPayrollDaySummary {
  hoursWorked: number;
  jobsCompleted: number;
  jobsEligible: number;
  binsCleaned: number;
  earnings: number;
  clockInTime: string | null;
  clockOutTime: string | null;
  isActive: boolean;
}

export interface FleetPayrollEmployeeSummary {
  id: string;
  name: string;
  email: string;
  payRatePerJob: number;
  residentialFirstBinPay?: number;
  residentialAdditionalBinPay?: number;
  isPartnerEmployee: boolean;
  today: FleetPayrollDaySummary;
  week: {
    hoursWorked: number;
    jobsCompleted: number;
    jobsEligible: number;
    binsCleaned: number;
    earnings: number;
    daysWorked: number;
  };
}

export function getWeekDateStrings(reference = new Date()): string[] {
  const start = new Date(reference);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - start.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatCleaningDateForStorage(date);
  });
}

export function isJobCompleted(data: Record<string, unknown>): boolean {
  return data.status === "completed" || data.jobStatus === "completed";
}

export function isEligibleForPay(data: Record<string, unknown>): boolean {
  if (!isJobCompleted(data)) return false;
  if (data.hasRequiredPhotos === true || data.operatorSkipPhotos === true) {
    return true;
  }
  return Boolean(data.insidePhotoUrl && data.outsidePhotoUrl);
}

export function getBinsFromCleaning(data: Record<string, unknown>): number {
  const bins = Number(data.binsCount || data.binCount || 1);
  return Number.isFinite(bins) && bins > 0 ? bins : 1;
}

export function serializeTimestamp(value: unknown): string | null {
  const date = parseFirestoreTimestamp(value);
  return date ? date.toISOString() : null;
}

export function sumClockHours(
  records: Array<{ clockInTime?: unknown; clockOutTime?: unknown | null; isActive?: boolean }>
): number {
  return records.reduce((total, record) => {
    const end = record.isActive ? new Date() : record.clockOutTime;
    return total + calculateHoursWorked(record.clockInTime, end);
  }, 0);
}

export function formatHours(hours: number): string {
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  if (minutes === 0) return `${wholeHours}h`;
  return `${wholeHours}h ${minutes}m`;
}

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatClockRange(clockIn: string | null, clockOut: string | null, isActive: boolean): string {
  if (!clockIn) return "Not clocked in";
  const start = parseFirestoreTimestamp(clockIn);
  const startLabel = start
    ? start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "—";
  if (isActive) return `${startLabel} → On shift`;
  if (!clockOut) return `${startLabel} → —`;
  const end = parseFirestoreTimestamp(clockOut);
  const endLabel = end
    ? end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "—";
  return `${startLabel} → ${endLabel}`;
}
