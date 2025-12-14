// lib/training-pdf-upload.ts
// Utility functions for uploading training PDFs to Firebase Storage

import { getStorageInstance } from "./firebase-client";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload a PDF file to Firebase Storage
 * @param file - File object or Buffer to upload
 * @param moduleId - Training module ID (e.g., "welcome", "safety-basics")
 * @param fileName - Optional custom filename, defaults to "{moduleId}.pdf"
 * @returns Public download URL if successful
 */
export async function uploadTrainingPDF(
  file: File | Buffer,
  moduleId: string,
  fileName?: string
): Promise<UploadResult> {
  try {
    const storage = await getStorageInstance();
    if (!storage) {
      return {
        success: false,
        error: "Firebase Storage is not available. Check NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET environment variable.",
      };
    }

    // Import Firebase Storage functions
    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");

    // Validate file type
    if (file instanceof File) {
      if (file.type !== "application/pdf") {
        return {
          success: false,
          error: "File must be a PDF. Received type: " + file.type,
        };
      }
    }

    // Determine filename
    const pdfFileName = fileName || `${moduleId}.pdf`;
    const storagePath = `training-modules/${pdfFileName}`;

    // Create storage reference
    const storageRef = ref(storage, storagePath);

    // Convert File to Buffer if needed (for server-side)
    let fileBuffer: Uint8Array;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      fileBuffer = new Uint8Array(arrayBuffer);
    } else {
      fileBuffer = new Uint8Array(file);
    }

    // Upload file
    await uploadBytes(storageRef, fileBuffer, {
      contentType: "application/pdf",
    });

    // Get public download URL
    const downloadURL = await getDownloadURL(storageRef);

    return {
      success: true,
      url: downloadURL,
    };
  } catch (error: any) {
    console.error("[Training PDF Upload] Error uploading PDF:", error);
    return {
      success: false,
      error: error.message || "Failed to upload PDF to Firebase Storage",
    };
  }
}

/**
 * Verify that a PDF URL is accessible
 * @param url - Firebase Storage URL to verify
 * @returns true if URL is accessible, false otherwise
 */
export async function verifyPDFURL(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok && response.headers.get("content-type")?.includes("application/pdf");
  } catch (error) {
    console.error("[Training PDF Upload] Error verifying PDF URL:", error);
    return false;
  }
}

/**
 * Delete a PDF from Firebase Storage
 * @param moduleId - Training module ID
 * @param fileName - Optional custom filename, defaults to "{moduleId}.pdf"
 */
export async function deleteTrainingPDF(
  moduleId: string,
  fileName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const storage = await getStorageInstance();
    if (!storage) {
      return {
        success: false,
        error: "Firebase Storage is not available",
      };
    }

    const { ref, deleteObject } = await import("firebase/storage");

    const pdfFileName = fileName || `${moduleId}.pdf`;
    const storagePath = `training-modules/${pdfFileName}`;
    const storageRef = ref(storage, storagePath);

    await deleteObject(storageRef);

    return { success: true };
  } catch (error: any) {
    console.error("[Training PDF Upload] Error deleting PDF:", error);
    return {
      success: false,
      error: error.message || "Failed to delete PDF from Firebase Storage",
    };
  }
}
