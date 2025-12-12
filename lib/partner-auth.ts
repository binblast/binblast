// lib/partner-auth.ts
// Helper functions for partner authentication and authorization

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";

/**
 * Check if a user is a partner (any status)
 * @param userId Firebase user ID
 * @returns Partner data if user is a partner, null otherwise
 */
export async function getPartner(userId: string): Promise<{
  id: string;
  businessName: string;
  referralCode: string;
  status: string;
} | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Check for any partner status (not just active)
    const partnersQuery = query(
      collection(db, "partners"),
      where("userId", "==", userId)
    );
    const partnersSnapshot = await getDocs(partnersQuery);

    if (partnersSnapshot.empty) {
      return null;
    }

    const partnerDoc = partnersSnapshot.docs[0];
    return {
      id: partnerDoc.id,
      ...partnerDoc.data(),
    } as any;
  } catch (err) {
    console.error("Error checking partner status:", err);
    return null;
  }
}

/**
 * Check if a user is an active partner
 * @param userId Firebase user ID
 * @returns Partner data if user is an active partner, null otherwise
 */
export async function getActivePartner(userId: string): Promise<{
  id: string;
  businessName: string;
  referralCode: string;
  status: string;
} | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const partnersQuery = query(
      collection(db, "partners"),
      where("userId", "==", userId),
      where("status", "==", "active")
    );
    const partnersSnapshot = await getDocs(partnersQuery);

    if (partnersSnapshot.empty) {
      return null;
    }

    const partnerDoc = partnersSnapshot.docs[0];
    return {
      id: partnerDoc.id,
      ...partnerDoc.data(),
    } as any;
  } catch (err) {
    console.error("Error checking partner status:", err);
    return null;
  }
}

/**
 * Get the appropriate dashboard URL for a user based on their partner status
 * @param userId Firebase user ID
 * @returns Dashboard URL path
 */
export async function getDashboardUrl(userId: string): Promise<string> {
  try {
    const partner = await getPartner(userId);
    
    if (!partner) {
      return "/dashboard";
    }

    // If partner has pending agreement, redirect to agreement page
    if (partner.status === "pending_agreement") {
      return `/partners/agreement/${partner.id}`;
    }

    // If partner is active, redirect to partner dashboard
    if (partner.status === "active") {
      return "/partners/dashboard";
    }

    // Default to regular dashboard
    return "/dashboard";
  } catch (err) {
    console.error("Error getting dashboard URL:", err);
    return "/dashboard";
  }
}

/**
 * Check if a user has a partner application (pending or approved)
 * @param userId Firebase user ID
 * @returns Application data if exists, null otherwise
 */
export async function getPartnerApplication(userId: string): Promise<{
  id: string;
  status: string;
  linkedPartnerId?: string;
} | null> {
  try {
    const db = await getDbInstance();
    if (!db) return null;

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const applicationsQuery = query(
      collection(db, "partnerApplications"),
      where("userId", "==", userId)
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);

    if (applicationsSnapshot.empty) {
      return null;
    }

    const appDoc = applicationsSnapshot.docs[0];
    return {
      id: appDoc.id,
      ...appDoc.data(),
    } as any;
  } catch (err) {
    console.error("Error checking partner application:", err);
    return null;
  }
}
