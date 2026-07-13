// components/OperatorDashboard/EmployeeDetail/StopList.tsx
"use client";

import { useEffect, useState } from "react";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import { OperatorJobResolveModal } from "./OperatorJobResolveModal";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";

interface Stop {
  id: string;
  customerName?: string;
  customerEmail?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  county?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  binsCount?: number;
  notes?: string;
  status?: string;
  jobStatus?: string;
  routeSequence?: number;
  flags?: string[];
  needsOperatorReview?: boolean;
}

interface StopListProps {
  employeeId: string;
  refreshKey?: number;
  managerId?: string;
}

export function StopList({ employeeId, refreshKey = 0, managerId }: StopListProps) {
  const [todayStops, setTodayStops] = useState<Stop[]>([]);
  const [upcomingStops, setUpcomingStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveStop, setResolveStop] = useState<Stop | null>(null);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    async function setupListener() {
      const db = await getDbInstance();
      if (!db) {
        setLoading(false);
        return;
      }

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;
      const today = getTodayDateString();
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const nextWeekStr = nextWeek.toISOString().split("T")[0];

      const stopsQuery = query(
        collection(db, "scheduledCleanings"),
        where("assignedEmployeeId", "==", employeeId)
      );

      unsubscribe = onSnapshot(stopsQuery, (snapshot) => {
        const allStops = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Stop[];

        const todayList = allStops
          .filter((stop) => stop.scheduledDate === today)
          .sort((a, b) => {
            if (typeof a.routeSequence === "number" && typeof b.routeSequence === "number") {
              return a.routeSequence - b.routeSequence;
            }
            return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
          });

        const upcomingList = allStops
          .filter(
            (stop) =>
              stop.scheduledDate &&
              stop.scheduledDate > today &&
              stop.scheduledDate <= nextWeekStr
          )
          .sort((a, b) => {
            const dateCompare = (a.scheduledDate || "").localeCompare(b.scheduledDate || "");
            if (dateCompare !== 0) return dateCompare;
            return (a.scheduledTime || "").localeCompare(b.scheduledTime || "");
          });

        setTodayStops(todayList);
        setUpcomingStops(upcomingList);
        setLastSync(new Date());
        setLoading(false);
      });
    }

    setupListener().catch((error) => {
      console.error("Error setting up stops listener:", error);
      setLoading(false);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [employeeId, refreshKey]);

  const getStatusBadge = (stop: Stop) => {
    const status = stop.status || stop.jobStatus || "pending";
    const colors: Record<string, { bg: string; color: string }> = {
      completed: { bg: "#d1fae5", color: "#065f46" },
      in_progress: { bg: "#dbeafe", color: "#1e40af" },
      pending: { bg: "#fef3c7", color: "#92400e" },
      failed: { bg: "#fee2e2", color: "#991b1b" },
      cancelled: { bg: "#f3f4f6", color: "#6b7280" },
    };
    const style = colors[status] || colors.pending;
    return (
      <span style={{
        padding: "0.25rem 0.75rem",
        borderRadius: "6px",
        fontSize: "0.75rem",
        fontWeight: "600",
        background: style.bg,
        color: style.color,
      }}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateString;
    }
  };

  const openResolveForStop = (stop: Stop) => {
    setResolveStop(stop);
    setShowResolveModal(true);
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading stops...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
          Stop List
        </h3>
        {lastSync && (
          <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
            Live · {lastSync.toLocaleTimeString()}
          </span>
        )}
      </div>

      <CleaningReadinessBanner variant="staff" />

      <div style={{ marginBottom: "2rem" }}>
        <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
          Today&apos;s Stops ({todayStops.length})
        </h4>
        {todayStops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No stops scheduled for today
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>#</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Address</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Bins</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayStops.map((stop, index) => {
                  const status = stop.status || stop.jobStatus || "pending";
                  const canResolve = status === "pending" || status === "in_progress";
                  return (
                    <tr
                      key={stop.id}
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        background: stop.needsOperatorReview ? "#fffbeb" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "700", color: "#3b82f6" }}>
                        {stop.routeSequence ?? index + 1}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                        <div style={{ fontWeight: "600", color: "#111827" }}>
                          {stop.customerName || stop.customerEmail || "N/A"}
                        </div>
                        {stop.flags && stop.flags.length > 0 && (
                          <div style={{ fontSize: "0.7rem", color: "#dc2626", marginTop: "0.25rem" }}>
                            {stop.flags.join(", ")}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                        {stop.addressLine1 ? `${stop.addressLine1}, ${stop.city}` : "N/A"}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                        {stop.binsCount || 1}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                        {getStatusBadge(stop)}
                      </td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                        {canResolve && (
                          <button
                            onClick={() => openResolveForStop(stop)}
                            style={{
                              padding: "0.25rem 0.75rem",
                              background: stop.needsOperatorReview ? "#f59e0b" : "#3b82f6",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            {stop.needsOperatorReview ? "Resolve Flag" : "Resolve"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h4 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
          Next 7 Days ({upcomingStops.length})
        </h4>
        {upcomingStops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No upcoming stops scheduled
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Date</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Bins</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcomingStops.map((stop) => (
                  <tr key={stop.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600" }}>
                      {stop.customerName || stop.customerEmail || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {formatDate(stop.scheduledDate || "")}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {stop.binsCount || 1}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {getStatusBadge(stop)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <OperatorJobResolveModal
        isOpen={showResolveModal}
        onClose={() => {
          setShowResolveModal(false);
          setResolveStop(null);
        }}
        employeeId={employeeId}
        onResolved={() => {
          setShowResolveModal(false);
          setResolveStop(null);
        }}
      />
    </div>
  );
}
