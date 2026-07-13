// components/ReferralHistory.tsx
"use client";

import { useState, useEffect } from "react";
import { useFirebase } from "@/lib/firebase-context";

interface ReferralHistoryProps {
  userId: string;
}

interface ReferralSummary {
  id: string;
  referredEmail: string;
  earnedAmount: number | null;
  status: "COMPLETED" | "PENDING";
  date: Date;
}

export function ReferralHistory({ userId }: ReferralHistoryProps) {
  const [referrals, setReferrals] = useState<ReferralSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const { isReady: firebaseReady } = useFirebase();

  useEffect(() => {
    if (!firebaseReady) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadHistory() {
      try {
        const { getAuthInstance, getDbInstance } = await import("@/lib/firebase");
        const auth = await getAuthInstance();

        if (!auth?.currentUser) {
          setLoading(false);
          return;
        }

        const currentUserId = auth.currentUser.uid;

        try {
          await fetch("/api/referral/sync-pending", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ referrerId: currentUserId }),
          });
        } catch (syncError) {
          console.error("[ReferralHistory] Failed to sync pending referrals:", syncError);
        }

        const db = await getDbInstance();
        if (!db) {
          setLoading(false);
          return;
        }

        const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
        const firestore = await safeImportFirestore();
        const {
          collection: firestoreCollection,
          query: firestoreQuery,
          where: firestoreWhere,
          getDocs: firestoreGetDocs,
          orderBy: firestoreOrderBy,
          limit: firestoreLimit,
        } = firestore;

        const referralsQuery = firestoreQuery(
          firestoreCollection(db, "referrals"),
          firestoreWhere("referrerId", "==", currentUserId),
          firestoreOrderBy("createdAt", "desc"),
          firestoreLimit(50)
        );
        const referralsSnapshot = await firestoreGetDocs(referralsQuery);

        const summaries: ReferralSummary[] = referralsSnapshot.docs.map((doc) => {
          const data = doc.data();
          const status = data.status === "COMPLETED" ? "COMPLETED" : "PENDING";
          const date =
            status === "COMPLETED"
              ? data.completedAt?.toDate?.() || data.createdAt?.toDate?.() || new Date()
              : data.createdAt?.toDate?.() || new Date();

          return {
            id: doc.id,
            referredEmail: data.referredUserEmail || "Unknown",
            earnedAmount: status === "COMPLETED" ? 10 : null,
            status,
            date,
          };
        });

        summaries.sort((a, b) => b.date.getTime() - a.date.getTime());

        if (mounted) {
          setReferrals(summaries);
        }
      } catch (error) {
        console.error("Error loading referral history:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadHistory();

    return () => {
      mounted = false;
    };
  }, [firebaseReady, userId]);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
          marginBottom: "1.5rem",
        }}
      >
        <p style={{ color: "var(--text-light)" }}>Loading referral history...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "2rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem",
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: "700",
          color: "var(--text-dark)",
          margin: 0,
          marginBottom: "0.5rem",
        }}
      >
        Referral History
      </h2>
      <p style={{ fontSize: "0.95rem", color: "#6b7280", marginBottom: "1.5rem" }}>
        Who you referred, what you earned, and when.
      </p>

      {referrals.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#9ca3af", margin: 0 }}>
          No referrals yet. Share your link to start earning $10 per friend.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.875rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: "600" }}>
                  Referred
                </th>
                <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: "600" }}>
                  You Earned
                </th>
                <th style={{ padding: "0.75rem 0.5rem", color: "#6b7280", fontWeight: "600" }}>
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((referral) => (
                <tr key={referral.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td
                    style={{
                      padding: "0.875rem 0.5rem",
                      color: "var(--text-dark)",
                      fontWeight: "500",
                      wordBreak: "break-word",
                    }}
                  >
                    {referral.referredEmail}
                  </td>
                  <td style={{ padding: "0.875rem 0.5rem" }}>
                    {referral.earnedAmount !== null ? (
                      <span style={{ color: "#16a34a", fontWeight: "700" }}>
                        +${referral.earnedAmount.toFixed(2)}
                      </span>
                    ) : (
                      <span style={{ color: "#d97706", fontWeight: "600" }}>Pending</span>
                    )}
                  </td>
                  <td style={{ padding: "0.875rem 0.5rem", color: "#6b7280" }}>
                    {formatDate(referral.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
