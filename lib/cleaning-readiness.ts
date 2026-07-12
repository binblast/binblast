import { formatCleaningDateForStorage } from "@/lib/cleaning-schedule";

function normalizeCleaningStatus(status?: string, jobStatus?: string): string {
  const raw = (status || jobStatus || "pending").toLowerCase();
  if (raw === "in_progress") return "in-progress";
  if (raw === "scheduled") return "upcoming";
  return raw;
}

export const CURB_PLACEMENT_MESSAGE =
  "Place your trash can(s) at the curb before your scheduled time window so our team can clean them immediately.";

export const TRASH_CAN_PREP_REMINDER =
  "Trash cans must be at the curb on your scheduled day during your time window. Empty cans clean faster.";

export const STAFF_CURB_REMINDER =
  "Confirm trash can is at curb before starting. Check customer notes for gate codes and bin count.";

export type CleaningReadinessStatus =
  | "ready_today"
  | "scheduled_future"
  | "payment_required"
  | "service_paused"
  | "completed"
  | "cancelled"
  | "in_progress";

export interface CustomerPaymentInfo {
  subscriptionStatus?: string;
  paymentStatus?: string;
  servicePaused?: boolean;
  selectedPlan?: string;
}

export interface CleaningReadinessInput {
  scheduledDate: string;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
  binsCount?: number;
  notes?: string;
  internalNotes?: string;
  trashDay?: string;
}

export interface CleaningReadinessResult {
  status: CleaningReadinessStatus;
  message: string;
  canService: boolean;
  isToday: boolean;
  paymentReady: boolean;
}

export function isPaymentReady(customer: CustomerPaymentInfo): boolean {
  if (customer.servicePaused) return false;
  if (customer.paymentStatus === "paid") return true;
  if (customer.subscriptionStatus === "active") return true;
  return false;
}

export function isScheduledToday(
  scheduledDate: string,
  referenceDate = new Date()
): boolean {
  return formatCleaningDateForStorage(referenceDate) === scheduledDate;
}

export function evaluateCleaningReadiness(
  cleaning: CleaningReadinessInput,
  customer: CustomerPaymentInfo,
  referenceDate = new Date()
): CleaningReadinessResult {
  const status = normalizeCleaningStatus(cleaning.status, cleaning.jobStatus);
  const today = isScheduledToday(cleaning.scheduledDate, referenceDate);
  const paymentReady = isPaymentReady(customer);

  if (status === "completed") {
    return {
      status: "completed",
      message: "Cleaning completed",
      canService: false,
      isToday: today,
      paymentReady,
    };
  }

  if (status === "cancelled") {
    return {
      status: "cancelled",
      message: "Cleaning cancelled",
      canService: false,
      isToday: today,
      paymentReady,
    };
  }

  if (customer.servicePaused) {
    return {
      status: "service_paused",
      message: "Customer service is paused",
      canService: false,
      isToday: today,
      paymentReady: false,
    };
  }

  if (!paymentReady) {
    return {
      status: "payment_required",
      message: "Payment required before service",
      canService: false,
      isToday: today,
      paymentReady: false,
    };
  }

  if (status === "in-progress") {
    return {
      status: "in_progress",
      message: "Cleaning in progress",
      canService: true,
      isToday: today,
      paymentReady: true,
    };
  }

  if (today) {
    return {
      status: "ready_today",
      message: `Ready to clean today${cleaning.scheduledTime ? ` (${cleaning.scheduledTime})` : ""}`,
      canService: true,
      isToday: true,
      paymentReady: true,
    };
  }

  return {
    status: "scheduled_future",
    message: `Scheduled for ${cleaning.scheduledDate}${cleaning.scheduledTime ? ` · ${cleaning.scheduledTime}` : ""}`,
    canService: true,
    isToday: false,
    paymentReady: true,
  };
}

export function getReadinessStyle(status: CleaningReadinessStatus) {
  switch (status) {
    case "ready_today":
      return { background: "#dcfce7", color: "#166534", border: "#bbf7d0" };
    case "in_progress":
      return { background: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" };
    case "scheduled_future":
      return { background: "#fef3c7", color: "#92400e", border: "#fde68a" };
    case "payment_required":
      return { background: "#fee2e2", color: "#b91c1c", border: "#fecaca" };
    case "service_paused":
      return { background: "#f3e8ff", color: "#6b21a8", border: "#e9d5ff" };
    case "completed":
      return { background: "#ecfdf5", color: "#047857", border: "#bbf7d0" };
    case "cancelled":
      return { background: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" };
    default:
      return { background: "#f3f4f6", color: "#374151", border: "#e5e7eb" };
  }
}

export function getReadinessLabel(status: CleaningReadinessStatus): string {
  switch (status) {
    case "ready_today":
      return "Ready Today";
    case "scheduled_future":
      return "Scheduled";
    case "payment_required":
      return "Payment Required";
    case "service_paused":
      return "Service Paused";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "in_progress":
      return "In Progress";
    default:
      return "Pending";
  }
}

export function appendStandardPrepNote(existingNotes?: string | null) {
  const base = existingNotes?.trim() || "";
  const curbNote = "Curb placement required before service window.";
  if (base.toLowerCase().includes("curb")) return base;
  return base ? `${base} · ${curbNote}` : curbNote;
}
