"use client";

import { useCallback, useEffect, useState } from "react";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import { OperatorJobResolveModal } from "./OperatorJobResolveModal";
import { AddNoteModal } from "./AddNoteModal";
import { ViewProofModal } from "./ViewProofModal";
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
  binCount?: number;
  notes?: string;
  status?: string;
  jobStatus?: string;
  routeSequence?: number;
  flags?: string[];
  needsOperatorReview?: boolean;
  priority?: string;
}

interface StopListProps {
  employeeId: string;
  refreshKey?: number;
  managerId?: string;
}

const actionBtn = {
  padding: "0.3rem 0.55rem",
  border: "none",
  borderRadius: "4px",
  fontSize: "0.7rem",
  fontWeight: "600" as const,
  cursor: "pointer",
  whiteSpace: "nowrap" as const,
};

export function StopList({ employeeId, refreshKey = 0, managerId }: StopListProps) {
  const [todayStops, setTodayStops] = useState<Stop[]>([]);
  const [upcomingStops, setUpcomingStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showPhotosModal, setShowPhotosModal] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [workingStopId, setWorkingStopId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadStops = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/stops?skipGeocode=1`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        throw new Error("Failed to load stops");
      }

      const data = await response.json();
      setTodayStops((data.todayStops || []) as Stop[]);
      setUpcomingStops((data.upcomingStops || []) as Stop[]);
      setLastSync(new Date());
    } catch (error) {
      console.error("Error loading stops:", error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    setLoading(true);
    loadStops();

    const pollInterval = window.setInterval(loadStops, 20000);
    let unsubscribe: (() => void) | undefined;

    async function setupTodayListener() {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;
      const today = getTodayDateString();

      unsubscribe = onSnapshot(
        query(
          collection(db, "scheduledCleanings"),
          where("assignedEmployeeId", "==", employeeId),
          where("scheduledDate", "==", today)
        ),
        () => {
          loadStops();
        }
      );
    }

    setupTodayListener().catch((error) => {
      console.error("Error setting up stops listener:", error);
    });

    return () => {
      window.clearInterval(pollInterval);
      if (unsubscribe) unsubscribe();
    };
  }, [employeeId, refreshKey, loadStops]);

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
      <span
        style={{
          padding: "0.25rem 0.75rem",
          borderRadius: "6px",
          fontSize: "0.75rem",
          fontWeight: "600",
          background: style.bg,
          color: style.color,
        }}
      >
        {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(`${dateString}T12:00:00`);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const openResolve = (stopId: string) => {
    setSelectedStopId(stopId);
    setShowResolveModal(true);
  };

  const openNote = (stopId: string) => {
    setSelectedStopId(stopId);
    setShowNoteModal(true);
  };

  const openPhotos = (stopId: string) => {
    setSelectedStopId(stopId);
    setShowPhotosModal(true);
  };

  const handleMarkComplete = async (stopId: string) => {
    setWorkingStopId(stopId);
    try {
      const { getAuthInstance } = await import("@/lib/firebase");
      const auth = await getAuthInstance();
      const operatorId = auth?.currentUser?.uid || managerId || "operator";

      const response = await fetch(`/api/operator/jobs/${stopId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatorId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || data.error || "Failed to complete stop");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to complete stop";
      alert(message);
    } finally {
      setWorkingStopId(null);
    }
  };

  const handlePriorityChange = async (stopId: string, priority: string) => {
    setWorkingStopId(stopId);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cleaningId: stopId, priority }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update priority");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update priority";
      alert(message);
    } finally {
      setWorkingStopId(null);
    }
  };

  const renderActions = (stop: Stop) => {
    const status = stop.status || stop.jobStatus || "pending";
    const isActive = status === "pending" || status === "in_progress";
    const isCompleted = status === "completed";
    const busy = workingStopId === stop.id;

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", minWidth: "220px" }}>
        {isActive && (
          <button
            onClick={() => openResolve(stop.id)}
            style={{
              ...actionBtn,
              background: stop.needsOperatorReview ? "#f59e0b" : "#16a34a",
              color: "#ffffff",
            }}
          >
            Resolve
          </button>
        )}
        {isCompleted && (
          <button
            onClick={() => openPhotos(stop.id)}
            style={{ ...actionBtn, background: "#6b7280", color: "#ffffff" }}
          >
            Photos
          </button>
        )}
        <button
          onClick={() => openNote(stop.id)}
          style={{ ...actionBtn, background: "#3b82f6", color: "#ffffff" }}
        >
          Note
        </button>
        {isActive && (
          <button
            onClick={() => handleMarkComplete(stop.id)}
            disabled={busy}
            style={{
              ...actionBtn,
              background: busy ? "#9ca3af" : "#111827",
              color: "#ffffff",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "..." : "Complete"}
          </button>
        )}
        {isActive && (
          <select
            value={stop.priority || "normal"}
            disabled={busy}
            onChange={(e) => handlePriorityChange(stop.id, e.target.value)}
            style={{
              padding: "0.3rem 0.4rem",
              borderRadius: "4px",
              border: "1px solid #e5e7eb",
              fontSize: "0.7rem",
              background: "#ffffff",
            }}
          >
            <option value="normal">Normal</option>
            <option value="high">High Priority</option>
            <option value="low">Low Priority</option>
          </select>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading stops...</div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
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
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>#</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Address</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Bins</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Operator Actions</th>
                </tr>
              </thead>
              <tbody>
                {todayStops.map((stop, index) => (
                  <tr
                    key={stop.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: stop.needsOperatorReview ? "#fffbeb" : "transparent",
                    }}
                  >
                    <td style={{ padding: "0.75rem", fontWeight: "700", color: "#3b82f6" }}>
                      {stop.routeSequence ?? index + 1}
                    </td>
                    <td style={{ padding: "0.75rem" }}>
                      <div style={{ fontWeight: "600" }}>
                        {stop.customerName || stop.customerEmail || "N/A"}
                      </div>
                      {stop.flags && stop.flags.length > 0 && (
                        <div style={{ fontSize: "0.7rem", color: "#dc2626", marginTop: "0.25rem" }}>
                          {stop.flags.join(", ")}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                      {stop.addressLine1 ? `${stop.addressLine1}, ${stop.city}` : "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                      {stop.binsCount || stop.binCount || 1}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{getStatusBadge(stop)}</td>
                    <td style={{ padding: "0.75rem" }}>{renderActions(stop)}</td>
                  </tr>
                ))}
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
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Date</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Bins</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingStops.map((stop) => (
                  <tr key={stop.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem", fontWeight: "600" }}>
                      {stop.customerName || stop.customerEmail || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                      {formatDate(stop.scheduledDate || "")}
                    </td>
                    <td style={{ padding: "0.75rem", color: "#6b7280" }}>
                      {stop.binsCount || stop.binCount || 1}
                    </td>
                    <td style={{ padding: "0.75rem" }}>{getStatusBadge(stop)}</td>
                    <td style={{ padding: "0.75rem" }}>{renderActions(stop)}</td>
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
          setSelectedStopId(null);
        }}
        employeeId={employeeId}
        initialStopId={selectedStopId}
        onResolved={() => {
          setShowResolveModal(false);
          setSelectedStopId(null);
        }}
      />
      <AddNoteModal
        isOpen={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setSelectedStopId(null);
        }}
        employeeId={employeeId}
        initialStopId={selectedStopId}
        onNoteAdded={() => {
          setShowNoteModal(false);
          setSelectedStopId(null);
        }}
      />
      <ViewProofModal
        isOpen={showPhotosModal}
        onClose={() => {
          setShowPhotosModal(false);
          setSelectedStopId(null);
        }}
        employeeId={employeeId}
        initialStopId={selectedStopId}
      />
    </div>
  );
}
