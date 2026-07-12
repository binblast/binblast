import { parseCleaningDate, formatCleaningDateForStorage } from "@/lib/cleaning-schedule";

export const PLAN_LABELS: Record<string, string> = {
  "one-time": "Monthly Clean",
  "twice-month": "Bi-Weekly Clean",
  "bi-monthly": "Bi-Monthly Yearly",
  "quarterly": "Quarterly Yearly",
  commercial: "Commercial",
};

export interface ScheduleJob {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  scheduledDate: string;
  scheduledTime: string;
  trashDay: string;
  status: string;
  jobStatus: string;
  operator: string;
  partner: string;
  planType: string;
  planLabel: string;
  binsCount: number;
  notes: string;
  internalNotes: string;
  assignedEmployeeId: string;
  assignedEmployeeName: string;
  completedAt: string | null;
  isCommercial: boolean;
}

export interface ScheduleStaffMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface ScheduleBoardStats {
  total: number;
  today: number;
  inProgress: number;
  completed: number;
  upcoming: number;
  unassigned: number;
  cancelled: number;
}

export function normalizeJobStatus(status?: string, jobStatus?: string): string {
  const raw = (status || jobStatus || "pending").toLowerCase();
  if (raw === "in_progress") return "in-progress";
  if (raw === "scheduled") return "upcoming";
  return raw;
}

export function getStatusStyle(status: string) {
  switch (normalizeJobStatus(status)) {
    case "completed":
      return { background: "#dcfce7", color: "#16a34a" };
    case "in-progress":
      return { background: "#dbeafe", color: "#2563eb" };
    case "cancelled":
      return { background: "#fee2e2", color: "#dc2626" };
    case "upcoming":
      return { background: "#ffedd5", color: "#c2410c" };
    default:
      return { background: "#fef3c7", color: "#d97706" };
  }
}

export function serializeScheduleDate(scheduledDate: unknown): string {
  return formatCleaningDateForStorage(parseCleaningDate(scheduledDate));
}

export function isToday(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseCleaningDate(dateString);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

export function isThisWeek(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + 7);
  const date = parseCleaningDate(dateString);
  date.setHours(0, 0, 0, 0);
  return date >= today && date < end;
}

export function buildScheduleStats(jobs: ScheduleJob[]): ScheduleBoardStats {
  return {
    total: jobs.length,
    today: jobs.filter((job) => isToday(job.scheduledDate)).length,
    inProgress: jobs.filter((job) => normalizeJobStatus(job.status, job.jobStatus) === "in-progress").length,
    completed: jobs.filter((job) => normalizeJobStatus(job.status, job.jobStatus) === "completed").length,
    upcoming: jobs.filter((job) => {
      const status = normalizeJobStatus(job.status, job.jobStatus);
      return status === "upcoming" || status === "pending";
    }).length,
    unassigned: jobs.filter((job) => !job.assignedEmployeeId && normalizeJobStatus(job.status, job.jobStatus) !== "completed" && normalizeJobStatus(job.status, job.jobStatus) !== "cancelled").length,
    cancelled: jobs.filter((job) => normalizeJobStatus(job.status, job.jobStatus) === "cancelled").length,
  };
}
