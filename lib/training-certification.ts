// lib/training-certification.ts
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getRequiredModules } from "./training-modules";

export type CertificationStatus = "completed" | "expired" | "in_progress" | "not_started";

export interface CertificationResult {
  isCertified: boolean;
  status: CertificationStatus;
  completedModules: number;
  totalModules: number;
  expiredModules: string[];
  expiresAt?: Date;
  daysUntilExpiration?: number;
  canWorkRoutes: boolean;
  canClockIn: boolean;
  missingModules: string[];
  photoDocumentationCompleted: boolean;
}

const CERTIFICATION_DURATION_DAYS = 180; // 6 months

export function calculateExpiration(completedAt: Date): Date {
  const expiration = new Date(completedAt);
  expiration.setDate(expiration.getDate() + CERTIFICATION_DURATION_DAYS);
  return expiration;
}

export function isExpired(completedAt: Date | null | undefined | any): boolean {
  if (!completedAt) return true;
  let date: Date;
  if (completedAt instanceof Date) {
    date = completedAt;
  } else if (completedAt && typeof completedAt === 'object' && 'toDate' in completedAt && typeof completedAt.toDate === 'function') {
    date = completedAt.toDate();
  } else {
    return true;
  }
  const expiration = calculateExpiration(date);
  return new Date() > expiration;
}

export function daysUntilExpiration(completedAt: Date | null | undefined | any): number | null {
  if (!completedAt) return null;
  let date: Date;
  if (completedAt instanceof Date) {
    date = completedAt;
  } else if (completedAt && typeof completedAt === 'object' && 'toDate' in completedAt && typeof completedAt.toDate === 'function') {
    date = completedAt.toDate();
  } else {
    return null;
  }
  const expiration = calculateExpiration(date);
  const now = new Date();
  const diff = expiration.getTime() - now.getTime();
  if (diff < 0) return 0; // Already expired
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export async function checkCertificationStatus(employeeId: string): Promise<CertificationResult> {
  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Database not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Get all required modules
    const requiredModules = getRequiredModules();
    const totalModules = requiredModules.length;

    // Get employee training progress
    const trainingRef = collection(db, "employeeTraining");
    const trainingQuery = query(
      trainingRef,
      where("employeeId", "==", employeeId)
    );
    const snapshot = await getDocs(trainingQuery);

    const moduleProgress: Record<string, any> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      moduleProgress[data.moduleId] = {
        completed: data.completed || false,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt,
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt,
        certificationStatus: data.certificationStatus || "in_progress",
        quizScore: data.quizScore,
        forcedRetraining: data.forcedRetraining || false,
      };
    });

    // Check each required module
    let completedModules = 0;
    const expiredModules: string[] = [];
    const missingModules: string[] = [];
    let photoDocumentationCompleted = false;
    let earliestExpiration: Date | null = null;

    for (const module of requiredModules) {
      const progress = moduleProgress[module.id];
      
      if (!progress || !progress.completed) {
        missingModules.push(module.id);
        continue;
      }

      // Check if expired
      const completedAt = progress.completedAt;
      let completedDate: Date | null = null;
      if (completedAt) {
        if (completedAt instanceof Date) {
          completedDate = completedAt;
        } else if (typeof completedAt === 'object' && 'toDate' in completedAt) {
          completedDate = (completedAt as any).toDate();
        }
      }
      if (!completedDate || isExpired(completedDate) || progress.forcedRetraining) {
        expiredModules.push(module.id);
        continue;
      }

      completedModules++;

      // Track photo documentation completion
      if (module.id === "photo-documentation") {
        photoDocumentationCompleted = true;
      }

      // Track earliest expiration - use stored expiresAt if available, otherwise calculate from completedDate
      let expiration: Date;
      if (progress.expiresAt) {
        // Use stored expiration date
        if (progress.expiresAt instanceof Date) {
          expiration = progress.expiresAt;
        } else if (typeof progress.expiresAt === 'string') {
          expiration = new Date(progress.expiresAt);
        } else {
          expiration = calculateExpiration(completedDate);
        }
      } else {
        // Calculate expiration from completion date (6 months)
        expiration = calculateExpiration(completedDate);
      }
      
      if (!earliestExpiration || expiration < earliestExpiration) {
        earliestExpiration = expiration;
      }
    }

    // Determine overall status
    let status: CertificationStatus;
    if (completedModules === totalModules && expiredModules.length === 0) {
      status = "completed";
    } else if (expiredModules.length > 0 || missingModules.length > 0) {
      status = expiredModules.length > 0 ? "expired" : "in_progress";
    } else {
      status = "in_progress";
    }

    const isCertified = status === "completed";
    const daysUntilExp = earliestExpiration ? daysUntilExpiration(earliestExpiration) : null;

    return {
      isCertified,
      status,
      completedModules,
      totalModules,
      expiredModules,
      expiresAt: earliestExpiration || undefined,
      daysUntilExpiration: daysUntilExp || undefined,
      canWorkRoutes: isCertified,
      canClockIn: isCertified,
      missingModules,
      photoDocumentationCompleted,
    };
  } catch (error) {
    console.error("Error checking certification status:", error);
    // Return not certified on error
    return {
      isCertified: false,
      status: "not_started",
      completedModules: 0,
      totalModules: getRequiredModules().length,
      expiredModules: [],
      canWorkRoutes: false,
      canClockIn: false,
      missingModules: getRequiredModules().map(m => m.id),
      photoDocumentationCompleted: false,
    };
  }
}

export async function isCertified(employeeId: string): Promise<boolean> {
  const result = await checkCertificationStatus(employeeId);
  return result.isCertified;
}

export async function requiresRecertification(employeeId: string): Promise<boolean> {
  const result = await checkCertificationStatus(employeeId);
  return result.status === "expired" || result.expiredModules.length > 0;
}

export async function getModuleProgress(employeeId: string, moduleId: string): Promise<{
  completed: boolean;
  completedAt?: Date;
  expiresAt?: Date;
  quizScore?: number;
  quizAttempts: number;
  pdfViewed: boolean;
  certificationStatus: CertificationStatus;
}> {
  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Database not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const trainingRef = collection(db, "employeeTraining");
    const trainingQuery = query(
      trainingRef,
      where("employeeId", "==", employeeId),
      where("moduleId", "==", moduleId)
    );
    const snapshot = await getDocs(trainingQuery);

    if (snapshot.empty) {
      return {
        completed: false,
        quizAttempts: 0,
        pdfViewed: false,
        certificationStatus: "not_started",
      };
    }

    const data = snapshot.docs[0].data();
    let completedAt: Date | undefined;
    let expiresAt: Date | undefined;
    
    if (data.completedAt) {
      if (data.completedAt instanceof Date) {
        completedAt = data.completedAt;
      } else if (typeof data.completedAt === 'object' && 'toDate' in data.completedAt) {
        completedAt = (data.completedAt as any).toDate();
      }
    }
    
    if (data.expiresAt) {
      if (data.expiresAt instanceof Date) {
        expiresAt = data.expiresAt;
      } else if (typeof data.expiresAt === 'object' && 'toDate' in data.expiresAt) {
        expiresAt = (data.expiresAt as any).toDate();
      }
    }

    let certificationStatus: CertificationStatus = "in_progress";
    if (data.completed) {
      if (data.forcedRetraining || (completedAt && isExpired(completedAt))) {
        certificationStatus = "expired";
      } else {
        certificationStatus = "completed";
      }
    }

    return {
      completed: data.completed || false,
      completedAt: completedAt || undefined,
      expiresAt: expiresAt || undefined,
      quizScore: data.quizScore,
      quizAttempts: data.quizAttempts || 0,
      pdfViewed: data.pdfViewed || false,
      certificationStatus,
    };
  } catch (error) {
    console.error("Error getting module progress:", error);
    return {
      completed: false,
      quizAttempts: 0,
      pdfViewed: false,
      certificationStatus: "not_started",
    };
  }
}

