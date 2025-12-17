// lib/partner-audit-log.ts
// Audit logging utility for partner management actions

import { getDbInstance } from "./firebase";
import { safeImportFirestore } from "./firebase-module-loader";

export interface AuditLogEntry {
  action: string;
  entityType: "partnerApplication" | "partner" | "payout";
  entityId: string;
  userId?: string;
  userEmail?: string;
  before?: Record<string, any>;
  after?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: any;
}

/**
 * Log an audit event for partner management
 */
export async function logPartnerAuditEvent(
  action: string,
  entityType: "partnerApplication" | "partner" | "payout",
  entityId: string,
  options: {
    userId?: string;
    userEmail?: string;
    before?: Record<string, any>;
    after?: Record<string, any>;
    metadata?: Record<string, any>;
  } = {}
): Promise<void> {
  try {
    const db = await getDbInstance();
    if (!db) {
      console.error("[Audit Log] Database not available");
      return;
    }

    const firestore = await safeImportFirestore();
    const { collection, addDoc, serverTimestamp } = firestore;

    const auditEntry: AuditLogEntry = {
      action,
      entityType,
      entityId,
      userId: options.userId,
      userEmail: options.userEmail,
      before: options.before,
      after: options.after,
      metadata: options.metadata,
      timestamp: serverTimestamp(),
    };

    await addDoc(collection(db, "partnerAuditLogs"), auditEntry);
    console.log(`[Audit Log] Logged ${action} for ${entityType} ${entityId}`);
  } catch (error: any) {
    console.error("[Audit Log] Failed to log audit event:", error);
    // Don't throw - audit logging failures shouldn't break the main operation
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getAuditLogs(
  entityType: "partnerApplication" | "partner" | "payout",
  entityId: string
): Promise<AuditLogEntry[]> {
  try {
    const db = await getDbInstance();
    if (!db) {
      return [];
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    const logsQuery = query(
      collection(db, "partnerAuditLogs"),
      where("entityType", "==", entityType),
      where("entityId", "==", entityId),
      orderBy("timestamp", "desc")
    );

    const snapshot = await getDocs(logsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AuditLogEntry[];
  } catch (error: any) {
    console.error("[Audit Log] Failed to get audit logs:", error);
    return [];
  }
}
