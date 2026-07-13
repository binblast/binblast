// lib/admin-auth.ts
// Admin authentication and authorization helpers

import { NextRequest } from "next/server";

const ADMIN_EMAIL = "binblastcompany@gmail.com";
const STAFF_ROLES = new Set(["owner", "admin", "operator"]);

export interface AdminAuthResult {
  isAdmin: boolean;
  userId?: string;
  email?: string;
}

async function verifyAuthToken(
  req: NextRequest
): Promise<{ uid: string; email?: string } | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) return null;

    const { getAdminApp } = await import("@/lib/firebase-admin");
    const adminApp = await getAdminApp();
    const decodedToken = await adminApp.auth().verifyIdToken(idToken);

    return { uid: decodedToken.uid, email: decodedToken.email };
  } catch (error) {
    console.error("[Admin Auth] Token verification error:", error);
    return null;
  }
}

/**
 * Check if the current request is from an authorized staff user.
 * Requires Firebase ID token in Authorization: Bearer <token>.
 */
export async function checkAdminAccess(req: NextRequest): Promise<AdminAuthResult> {
  try {
    const auth = await verifyAuthToken(req);
    if (!auth) {
      return { isAdmin: false };
    }

    const adminEmail = (
      process.env.NEXT_PUBLIC_ADMIN_EMAIL || ADMIN_EMAIL
    ).toLowerCase();

    if (auth.email?.toLowerCase() === adminEmail) {
      return { isAdmin: true, userId: auth.uid, email: auth.email };
    }

    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const db = await getAdminFirestore();
    const userDoc = await db.collection("users").doc(auth.uid).get();

    if (userDoc.exists) {
      const role = String(userDoc.data()?.role || "");
      if (STAFF_ROLES.has(role)) {
        return { isAdmin: true, userId: auth.uid, email: auth.email };
      }
    }

    return { isAdmin: false };
  } catch (error) {
    console.error("Error checking admin access:", error);
    return { isAdmin: false };
  }
}

/**
 * Log admin actions for audit trail
 */
export async function logAdminAction(
  action: string,
  adminId: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const { getDbInstance } = await import("./firebase");
    const { safeImportFirestore } = await import("./firebase-module-loader");
    const db = await getDbInstance();

    if (!db) return;

    const firestore = await safeImportFirestore();
    const { collection, addDoc, serverTimestamp } = firestore;

    await addDoc(collection(db, "adminAuditLog"), {
      action,
      adminId,
      details: details || {},
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging admin action:", error);
    // Don't throw - audit logging should not break the main operation
  }
}
