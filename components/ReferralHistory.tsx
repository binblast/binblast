// components/ReferralHistory.tsx
// Displays referral history including referrals made and credits used

"use client";

import { useState, useEffect } from "react";
import { getDbInstance } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit as firestoreLimit } from "firebase/firestore";

interface ReferralHistoryProps {
  userId: string;
}

interface HistoryEntry {
  id: string;
  type: "referral_made" | "credit_earned" | "credit_used";
  description: string;
  date: Date;
  amount?: number;
  referredUserName?: string;
}

export function ReferralHistory({ userId }: ReferralHistoryProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        // Ensure Firebase is initialized before querying
        await import("@/lib/firebase");
        const { getAuthInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();
        
        // Get the authenticated user's UID (required for Firestore security rules)
        if (!auth || !auth.currentUser) {
          console.log("[ReferralHistory] User not authenticated, skipping history load");
          setLoading(false);
          return;
        }
        
        const currentUserId = auth.currentUser.uid;
        if (!currentUserId) {
          console.log("[ReferralHistory] No user ID available");
          setLoading(false);
          return;
        }
        
        const db = await getDbInstance();
        if (!db) {
          console.error("[ReferralHistory] Firestore not initialized");
          setLoading(false);
          return;
        }
        
        console.log("[ReferralHistory] Loading history for user:", currentUserId);

        const historyEntries: HistoryEntry[] = [];

        // Load referrals made by this user
        // Use currentUserId from auth to match Firestore security rules
        try {
          const { collection: firestoreCollection, query: firestoreQuery, where: firestoreWhere, getDocs: firestoreGetDocs, orderBy: firestoreOrderBy } = await import("firebase/firestore");
          
          const referralsQuery = firestoreQuery(
            firestoreCollection(db, "referrals"),
            firestoreWhere("referrerId", "==", currentUserId),
            firestoreOrderBy("createdAt", "desc"),
            firestoreLimit(20)
          );
          console.log("[ReferralHistory] Querying referrals for referrerId:", currentUserId);
          const referralsSnapshot = await firestoreGetDocs(referralsQuery);
          console.log("[ReferralHistory] Found", referralsSnapshot.size, "referrals");

          referralsSnapshot.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            
            if (data.status === "COMPLETED") {
              historyEntries.push({
                id: `referral-${doc.id}`,
                type: "referral_made",
                description: `Referred ${data.referredUserEmail || "a friend"} → completed signup → earned $10 credit`,
                date: createdAt,
                referredUserName: data.referredUserEmail,
              });
            } else if (data.status === "PENDING") {
              historyEntries.push({
                id: `referral-pending-${doc.id}`,
                type: "referral_made",
                description: `Referred ${data.referredUserEmail || "a friend"} → pending first purchase`,
                date: createdAt,
                referredUserName: data.referredUserEmail,
              });
            }
          });
        } catch (referralError: any) {
          console.error("[ReferralHistory] Error loading referrals:", referralError);
          if (referralError.code === 'permission-denied') {
            console.error("[ReferralHistory] Permission denied - ensure Firestore rules are deployed and user is authenticated");
          }
        }

        // Load credits earned (from referrals)
        try {
          const { collection: firestoreCollection, query: firestoreQuery, where: firestoreWhere, getDocs: firestoreGetDocs, orderBy: firestoreOrderBy } = await import("firebase/firestore");
          
          const creditsEarnedQuery = firestoreQuery(
            firestoreCollection(db, "credits"),
            firestoreWhere("userId", "==", currentUserId),
            firestoreWhere("type", "==", "referral_reward"),
            firestoreOrderBy("createdAt", "desc"),
            firestoreLimit(20)
          );
          console.log("[ReferralHistory] Querying credits earned for userId:", currentUserId);
          const creditsEarnedSnapshot = await firestoreGetDocs(creditsEarnedQuery);
          console.log("[ReferralHistory] Found", creditsEarnedSnapshot.size, "credits earned");

          creditsEarnedSnapshot.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            
            historyEntries.push({
              id: `credit-earned-${doc.id}`,
              type: "credit_earned",
              description: `Earned $${(data.amount || 0).toFixed(2)} referral credit`,
              date: createdAt,
              amount: data.amount || 0,
            });
          });
        } catch (creditEarnedError: any) {
          console.error("[ReferralHistory] Error loading credits earned:", creditEarnedError);
          if (creditEarnedError.code === 'permission-denied') {
            console.error("[ReferralHistory] Permission denied - ensure Firestore rules are deployed");
          }
        }

        // Load credits used
        try {
          const { collection: firestoreCollection, query: firestoreQuery, where: firestoreWhere, getDocs: firestoreGetDocs, orderBy: firestoreOrderBy } = await import("firebase/firestore");
          
          const creditsUsedQuery = firestoreQuery(
            firestoreCollection(db, "credits"),
            firestoreWhere("userId", "==", currentUserId),
            firestoreWhere("used", "==", true),
            firestoreOrderBy("usedAt", "desc"),
            firestoreLimit(20)
          );
          console.log("[ReferralHistory] Querying credits used for userId:", currentUserId);
          const creditsUsedSnapshot = await firestoreGetDocs(creditsUsedQuery);
          console.log("[ReferralHistory] Found", creditsUsedSnapshot.size, "credits used");

          creditsUsedSnapshot.forEach((doc) => {
            const data = doc.data();
            const usedAt = data.usedAt?.toDate?.() || new Date();
            
            historyEntries.push({
              id: `credit-used-${doc.id}`,
              type: "credit_used",
              description: `Used $${(data.usedForAmount || data.amount || 0).toFixed(2)} credit on subscription`,
              date: usedAt,
              amount: data.usedForAmount || data.amount || 0,
            });
          });
        } catch (creditUsedError: any) {
          console.error("[ReferralHistory] Error loading credits used:", creditUsedError);
          if (creditUsedError.code === 'permission-denied') {
            console.error("[ReferralHistory] Permission denied - ensure Firestore rules are deployed");
          }
        }

        // Sort all entries by date (most recent first)
        historyEntries.sort((a, b) => b.date.getTime() - a.date.getTime());

        setHistory(historyEntries.slice(0, 20)); // Limit to 20 most recent
      } catch (error) {
        console.error("Error loading referral history:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, [userId]); // Still depend on userId prop for re-fetching when it changes

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem"
      }}>
        <p style={{ color: "var(--text-light)" }}>Loading referral history...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem"
      }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "0.5rem" }}>
          Referral History
        </h2>
        <p style={{ 
          fontSize: "0.95rem", 
          color: "#6b7280", 
          marginBottom: "1rem"
        }}>
          Your referral activity will appear here.
        </p>
        <p style={{ fontSize: "0.875rem", color: "#9ca3af", margin: 0 }}>
          No referral history yet. Start sharing your referral link to see activity!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "2rem",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      marginBottom: "1.5rem"
    }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-dark)", margin: 0, marginBottom: "1rem" }}>
        Referral History
      </h2>
      <p style={{ 
        fontSize: "0.95rem", 
        color: "#6b7280", 
        marginBottom: "1.5rem"
      }}>
        Track your referrals and credit usage over time.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {history.map((entry) => (
          <div
            key={entry.id}
            style={{
              padding: "1rem",
              background: entry.type === "credit_earned" 
                ? "#ecfdf5" 
                : entry.type === "credit_used"
                ? "#fef3c7"
                : "#f0f9ff",
              borderRadius: "8px",
              border: `1px solid ${
                entry.type === "credit_earned"
                  ? "#86efac"
                  : entry.type === "credit_used"
                  ? "#fde047"
                  : "#bae6fd"
              }`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "1rem",
            }}
          >
            <div style={{ flex: 1 }}>
              <p style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                margin: 0,
                marginBottom: "0.25rem",
              }}>
                {entry.description}
              </p>
              <p style={{
                fontSize: "0.75rem",
                color: "#6b7280",
                margin: 0,
              }}>
                {formatDate(entry.date)}
              </p>
            </div>
            {entry.amount !== undefined && (
              <div style={{
                fontSize: "0.875rem",
                fontWeight: "700",
                color: entry.type === "credit_earned" ? "#16a34a" : "#f59e0b",
              }}>
                {entry.type === "credit_earned" ? "+" : "-"}${entry.amount.toFixed(2)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

