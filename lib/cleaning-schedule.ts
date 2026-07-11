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

/**
 * After a cleaning is marked complete, create the next recurring appointment if needed.
 */
export async function scheduleNextCleaningIfNeeded(
  db: unknown,
  completedCleaning: CleaningRecord
): Promise<string | null> {
  if (!completedCleaning.userId) return null;

  const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
  const firestore = await safeImportFirestore();
  const {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    doc,
    getDoc,
    serverTimestamp,
  } = firestore;

  const userRef = doc(db as never, "users", completedCleaning.userId);
  const userDoc = await getDoc(userRef);
  if (!userDoc.exists()) return null;

  const userData = userDoc.data();
  const planId = userData.selectedPlan as string | undefined;
  if (!planId || !PLAN_MIN_DAYS[planId]) return null;

  const trashDay = completedCleaning.trashDay || userData.trashDay;
  if (!trashDay) return null;

  const completedDate = parseCleaningDate(completedCleaning.scheduledDate);
  const nextDate = computeNextCleaningDate(trashDay, planId, completedDate);
  if (!nextDate) return null;

  const nextDateString = formatCleaningDateForStorage(nextDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingQuery = query(
    collection(db as never, "scheduledCleanings"),
    where("userId", "==", completedCleaning.userId)
  );
  const existingSnapshot = await getDocs(existingQuery);

  const hasUpcoming = existingSnapshot.docs.some((existingDoc) => {
    if (completedCleaning.id && existingDoc.id === completedCleaning.id) return false;
    const data = existingDoc.data();
    if (isCleaningCompleted(data) || isCleaningCancelled(data)) return false;
    const existingDate = parseCleaningDate(data.scheduledDate);
    existingDate.setHours(0, 0, 0, 0);
    return existingDate >= today;
  });

  if (hasUpcoming) return null;

  const newCleaning = {
    userId: completedCleaning.userId,
    userEmail: completedCleaning.userEmail || userData.email || null,
    addressLine1: completedCleaning.addressLine1 || userData.addressLine1 || "",
    addressLine2: completedCleaning.addressLine2 ?? userData.addressLine2 ?? null,
    city: completedCleaning.city || userData.city || "",
    state: completedCleaning.state || userData.state || "",
    zipCode: completedCleaning.zipCode || userData.zipCode || "",
    trashDay,
    scheduledDate: nextDateString,
    scheduledTime: completedCleaning.scheduledTime || userData.preferredTimeWindow || "9:00 AM - 12:00 PM",
    notes: completedCleaning.notes || null,
    status: "upcoming",
    jobStatus: "pending",
    createdAt: serverTimestamp(),
    autoScheduledFrom: completedCleaning.id || null,
  };

  const newDocRef = await addDoc(
    collection(db as never, "scheduledCleanings"),
    newCleaning
  );

  return newDocRef.id;
}
