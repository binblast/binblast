// lib/training-verification.ts
// Verification utilities for training modules

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";
import { verifyPDFURL } from "./training-pdf-upload";

export interface ModuleVerificationResult {
  moduleId: string;
  title: string;
  pdfUrl: string;
  isValid: boolean;
  error?: string;
}

/**
 * Verify all active modules have valid PDF URLs
 */
export async function verifyModulePDFs(): Promise<ModuleVerificationResult[]> {
  try {
    const db = await getDbInstance();
    if (!db) {
      throw new Error("Database not available");
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const modulesRef = collection(db, "trainingModules");
    const modulesQuery = query(modulesRef, where("active", "==", true));
    const snapshot = await getDocs(modulesQuery);

    const results: ModuleVerificationResult[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const moduleId = doc.id;
      const pdfUrl = data.pdfUrl || "";

      let isValid = false;
      let error: string | undefined;

      if (!pdfUrl || pdfUrl.trim() === "") {
        error = "PDF URL is missing";
      } else {
        try {
          isValid = await verifyPDFURL(pdfUrl);
          if (!isValid) {
            error = "PDF URL is not accessible";
          }
        } catch (err: any) {
          isValid = false;
          error = err.message || "Failed to verify PDF URL";
        }
      }

      results.push({
        moduleId,
        title: data.title || moduleId,
        pdfUrl,
        isValid,
        error,
      });
    }

    return results;
  } catch (error: any) {
    console.error("[Training Verification] Error:", error);
    throw error;
  }
}
