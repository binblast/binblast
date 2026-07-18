import { getAdminFirestore } from "@/lib/firebase-admin";
import { resolveStickyCleaningDay } from "@/lib/recurring-preference";
import {
  CleaningRecord,
  computeNextCleaningDate,
  formatCleaningDateForStorage,
  isCleaningCancelled,
  isCleaningCompleted,
  parseCleaningDate,
} from "@/lib/cleaning-schedule";

/**
 * After a cleaning is marked complete, create the next recurring appointment if needed.
 * This module is server-only because it uses Firebase Admin.
 */
export async function scheduleNextCleaningIfNeeded(
  completedCleaning: CleaningRecord
): Promise<string | null> {
  if (!completedCleaning.userId) return null;

  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");

  const userDoc = await db.collection("users").doc(completedCleaning.userId).get();
  if (!userDoc.exists) return null;

  const userData = userDoc.data() || {};
  const planId = userData.selectedPlan as string | undefined;
  if (!planId) return null;

  if (userData.recurringScheduleActive === false) return null;

  const trashDay = resolveStickyCleaningDay(completedCleaning, userData);
  if (!trashDay) return null;

  const completedDate = parseCleaningDate(completedCleaning.scheduledDate);
  const nextDate = computeNextCleaningDate(trashDay, planId, completedDate);
  if (!nextDate) return null;

  const nextDateString = formatCleaningDateForStorage(nextDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingSnapshot = await db
    .collection("scheduledCleanings")
    .where("userId", "==", completedCleaning.userId)
    .get();

  const hasUpcoming = existingSnapshot.docs.some(
    (existingDoc: { id: string; data: () => Record<string, unknown> }) => {
      if (completedCleaning.id && existingDoc.id === completedCleaning.id) return false;
      const data = existingDoc.data();
      if (isCleaningCompleted(data) || isCleaningCancelled(data)) return false;
      const existingDate = parseCleaningDate(data.scheduledDate);
      existingDate.setHours(0, 0, 0, 0);
      return existingDate >= today;
    }
  );

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
    scheduledTime:
      completedCleaning.scheduledTime ||
      userData.preferredTimeWindow ||
      "8:00 AM - 12:00 PM",
    notes: completedCleaning.notes || null,
    status: "upcoming",
    jobStatus: "pending",
    assignedEmployeeId:
      completedCleaning.assignedEmployeeId ||
      (userData.defaultAssignedEmployeeId as string | undefined) ||
      null,
    assignedEmployeeName:
      completedCleaning.assignedEmployeeName ||
      (userData.defaultAssignedEmployeeName as string | undefined) ||
      null,
    assignmentSource: "recurring",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    autoScheduledFrom: completedCleaning.id || null,
  };

  const newDocRef = await db.collection("scheduledCleanings").add(newCleaning);
  return newDocRef.id;
}
