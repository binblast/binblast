"use client";

import { useCallback, useEffect, useState } from "react";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import { OperatorJobResolveModal } from "./OperatorJobResolveModal";
import { CommercialCompensationModal } from "./CommercialCompensationModal";
import { AddNoteModal } from "./AddNoteModal";
import { ViewProofModal } from "./ViewProofModal";
import {
  OperatorActionButton,
  OperatorPrioritySelect,
  operatorActionLayouts,
} from "@/components/OperatorDashboard/operator-ui";

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
  planType?: string;
  isCommercial?: boolean;
  commercialType?: string;
}

function isCommercialStop(stop: Stop): boolean {
  const planType = String(stop.planType || "").toLowerCase();
  const commercialType = String(stop.commercialType || "").toLowerCase();
  return (
    stop.isCommercial === true ||
    planType.includes("commercial") ||
    planType.includes("hoa") ||
    commercialType.includes("commercial") ||
    commercialType.includes("hoa")
  );
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
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showCompensationModal, setShowCompensationModal] = useState(false);
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
    return () => window.clearInterval(pollInterval);
  }, [employeeId, refreshKey, loadStops]);

  const getStatusBadge = (stop: Stop) => {
    const status = stop.status || stop.jobStatus || "pending";
    const colors: Record<string, { bg: string; color: string }> = {
      completed: { bg: "#d1fae5", color: "#065f46" },
      in_progress: { bg: "#dbeafe", color: "#1e40af" },
      pending: { bg: "#fef3c7", color: "#92400e" },
      upcoming: { bg: "#fef3c7", color: "#92400e" },
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

  const openCompensation = (stopId: string) => {
    setSelectedStopId(stopId);
    setShowCompensationModal(true);
  };

  const handleMarkComplete = async (stopId: string) => {
    if (workingStopId) return;
    setWorkingStopId(stopId);

    const markCompleted = (stop: Stop): Stop => ({
      ...stop,
      status: "completed",
      jobStatus: "completed",
    });
    setTodayStops((prev) => prev.map((stop) => (stop.id === stopId ? markCompleted(stop) : stop)));
    setUpcomingStops((prev) => prev.map((stop) => (stop.id === stopId ? markCompleted(stop) : stop)));

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

      await loadStops();
    } catch (error: unknown) {
      await loadStops();
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
    const isActive = status === "pending" || status === "in_progress" || status === "upcoming";
    const isCompleted = status === "completed";
    const busy = workingStopId === stop.id;

    return (
      <div className="operator-stop-actions" style={operatorActionLayouts.stopActions}>
        <div style={operatorActionLayouts.stopActionsRow}>
          {isActive && (
            <OperatorActionButton
              size="sm"
              variant={stop.needsOperatorReview ? "danger" : "success"}
              onClick={() => openResolve(stop.id)}
            >
              Resolve
            </OperatorActionButton>
          )}
          {isCompleted && (
            <OperatorActionButton size="sm" variant="neutral" onClick={() => openPhotos(stop.id)}>
              Photos
            </OperatorActionButton>
          )}
          {isActive && (
            <OperatorActionButton
              size="sm"
              variant="neutral"
              disabled={busy}
              onClick={() => handleMarkComplete(stop.id)}
            >
              {busy ? "Completing..." : "Complete"}
            </OperatorActionButton>
          )}
        </div>
        <div style={operatorActionLayouts.stopActionsRow}>
          {isCommercialStop(stop) && (
            <OperatorActionButton size="sm" variant="neutral" onClick={() => openCompensation(stop.id)}>
              Adjust Pay
            </OperatorActionButton>
          )}
          <OperatorActionButton size="sm" variant="ghost" onClick={() => openNote(stop.id)}>
            Add Note
          </OperatorActionButton>
          {isActive && (
            <OperatorPrioritySelect
              value={stop.priority || "normal"}
              disabled={busy}
              onChange={(e) => handlePriorityChange(stop.id, e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="high">High Priority</option>
              <option value="low">Low Priority</option>
            </OperatorPrioritySelect>
          )}
        </div>
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
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>#</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Address</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Bins</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", minWidth: "230px" }}>
                    Operator Actions
                  </th>
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
          <div className="table-responsive" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Customer</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Date</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Bins</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem" }}>Status</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", minWidth: "230px" }}>Actions</th>
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
      {selectedStopId && (
        <CommercialCompensationModal
          isOpen={showCompensationModal}
          onClose={() => {
            setShowCompensationModal(false);
            setSelectedStopId(null);
          }}
          jobId={selectedStopId}
          operatorId={managerId}
          onSaved={() => {
            setShowCompensationModal(false);
            setSelectedStopId(null);
            loadStops();
          }}
        />
      )}
    </div>
  );
}
