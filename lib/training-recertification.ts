// lib/training-recertification.ts
// Recertification logic and status checking

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";

export interface RecertificationStatus {
  isExpired: boolean;
  daysUntilExpiry: number | null;
  requiresRecert: boolean;
  nextRecertDueAt: Date | null;
}

/**
 * Check recertification status for an employee
 */
export async function checkRecertificationStatus(
  employeeId: string
): Promise<RecertificationStatus> {
  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Database not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    if (progressSnapshot.empty) {
      return {
        isExpired: false,
        daysUntilExpiry: null,
        requiresRecert: false,
        nextRecertDueAt: null,
      };
    }

    const progressData = progressSnapshot.docs[0].data();
    const nextRecertDueAt = progressData.nextRecertDueAt?.toDate?.() || null;

    if (!nextRecertDueAt) {
      return {
        isExpired: false,
        daysUntilExpiry: null,
        requiresRecert: false,
        nextRecertDueAt: null,
      };
    }

    const now = new Date();
    const daysUntilExpiry = Math.ceil(
      (nextRecertDueAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isExpired = daysUntilExpiry < 0;
    const requiresRecert = isExpired || daysUntilExpiry <= 30; // Require recert if expired or within 30 days

    return {
      isExpired,
      daysUntilExpiry,
      requiresRecert,
      nextRecertDueAt,
    };
  } catch (error: any) {
    console.error("[Recertification] Error checking status:", error);
    return {
      isExpired: false,
      daysUntilExpiry: null,
      requiresRecert: false,
      nextRecertDueAt: null,
    };
  }
}

/**
 * Check if employee's certification is expired
 */
export function isExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}
