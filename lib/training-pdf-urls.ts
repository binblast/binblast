// lib/training-pdf-urls.ts
// Centralized PDF URL management for training modules

/**
 * Get the PDF URL for a training module
 * @param moduleId - The module ID
 * @returns The PDF URL or empty string if not found
 */
export function getModulePDFUrl(moduleId: string): string {
  // Centralized mapping of module IDs to Firebase Storage URLs
  // Update this mapping when PDFs are uploaded to Firebase Storage
  const pdfUrlMap: Record<string, string> = {
    // Add module PDF URLs here as they are uploaded
    // Example:
    // "welcome": "https://firebasestorage.googleapis.com/v0/b/.../welcome.pdf",
    // "safety-basics": "https://firebasestorage.googleapis.com/v0/b/.../safety-basics.pdf",
  };

  // Check if we have a mapped URL
  if (pdfUrlMap[moduleId]) {
    return pdfUrlMap[moduleId];
  }

  // Fallback: Construct Firebase Storage URL pattern
  // This assumes PDFs are stored at: training-modules/{moduleId}.pdf
  // Update this pattern based on your actual Firebase Storage structure
  const storageBaseUrl = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    ? `https://firebasestorage.googleapis.com/v0/b/${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}/o/training-modules%2F${moduleId}.pdf?alt=media`
    : "";

  return storageBaseUrl;
}

/**
 * Validate a PDF URL
 * @param url - The URL to validate
 * @returns True if the URL appears valid
 */
export function isValidPDFUrl(url: string | undefined | null): boolean {
  if (!url || url.trim() === "") {
    return false;
  }

  // Check if it's a valid URL format
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get fallback PDF URL (for error handling)
 * @param moduleId - The module ID
 * @returns A fallback URL or empty string
 */
export function getFallbackPDFUrl(moduleId: string): string {
  // Return empty string to trigger error handling in UI
  return "";
}
