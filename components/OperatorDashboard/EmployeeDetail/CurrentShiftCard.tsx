// components/OperatorDashboard/EmployeeDetail/CurrentShiftCard.tsx
"use client";

import { useEffect, useState } from "react";
import { MarkStopCompleteModal } from "./MarkStopCompleteModal";
import { AddNoteModal } from "./AddNoteModal";
import { ViewProofModal } from "./ViewProofModal";

interface ShiftStatus {
  shiftStatus: "not_started" | "clocked_in" | "completed";
  shiftStartTime: any;
  expectedEndTime: any;
  assignedStops: number;
  completedStops: number;
  inProgressStops: number;
  pendingStops: number;
  missedStops: number;
  stopsRemaining: number;
}

interface EarningsData {
  totalEarnings: number;
  payRatePerJob: number;
  completedStopsCount: number;
  stops: Array<{
    id: string;
    fullAddress: string;
    formattedEarnings: string;
    completedAt: any;
  }>;
}

interface CurrentShiftCardProps {
  employeeId: string;
}

export function CurrentShiftCard({ employeeId }: CurrentShiftCardProps) {
  const [shiftStatus, setShiftStatus] = useState<ShiftStatus | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMarkCompleteModal, setShowMarkCompleteModal] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showViewProofModal, setShowViewProofModal] = useState(false);

  useEffect(() => {
    loadShiftStatus();
    loadEarnings();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadShiftStatus();
      loadEarnings();
    }, 30000);
    return () => clearInterval(interval);
  }, [employeeId]);

  const loadShiftStatus = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/shift-status`);
      if (response.ok) {
        const data = await response.json();
        setShiftStatus(data);
      } else {
        // If API returns error, set default "not started" status instead of showing error
        const errorData = await response.json().catch(() => ({}));
        console.error("Error loading shift status:", errorData.error || response.statusText);
        // Set default status instead of null to avoid error message
        setShiftStatus({
          shiftStatus: "not_started",
          shiftStartTime: null,
          expectedEndTime: null,
          assignedStops: 0,
          completedStops: 0,
          inProgressStops: 0,
          pendingStops: 0,
          missedStops: 0,
          stopsRemaining: 0,
        });
      }
    } catch (error) {
      console.error("Error loading shift status:", error);
      // Set default status instead of null to avoid error message
      setShiftStatus({
        shiftStatus: "not_started",
        shiftStartTime: null,
        expectedEndTime: null,
        assignedStops: 0,
        completedStops: 0,
        inProgressStops: 0,
        pendingStops: 0,
        missedStops: 0,
        stopsRemaining: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEarnings = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/earnings`);
      if (response.ok) {
        const data = await response.json();
        setEarnings(data);
      }
    } catch (error) {
      console.error("Error loading earnings:", error);
    }
  };

  const handleRefresh = () => {
    loadShiftStatus();
    loadEarnings();
  };

  const formatTime = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "N/A";
    }
  };

  const formatCompletionTime = (timestamp: any): string => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "N/A";
    }
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
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading shift status...</div>
      </div>
    );
  }

  // Show default "not started" status if shiftStatus is null (shouldn't happen with new error handling)
  const displayStatus = shiftStatus || {
    shiftStatus: "not_started" as const,
    shiftStartTime: null,
    expectedEndTime: null,
    assignedStops: 0,
    completedStops: 0,
    inProgressStops: 0,
    pendingStops: 0,
    missedStops: 0,
    stopsRemaining: 0,
  };

  const progressPercentage = displayStatus.assignedStops > 0
    ? (displayStatus.completedStops / displayStatus.assignedStops) * 100
    : 0;

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
        Current Shift Progress
      </h3>

      {/* Earnings Section */}
      {earnings && earnings.completedStopsCount > 0 && (
        <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#065f46", fontWeight: "600" }}>Total Earnings Today:</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
              ${earnings.totalEarnings.toFixed(2)}
            </span>
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.75rem" }}>
            {earnings.completedStopsCount} stops × ${earnings.payRatePerJob.toFixed(2)} per stop
          </div>
          
          {/* Earnings Breakdown Table */}
          <div style={{ marginTop: "1rem", borderTop: "1px solid #bbf7d0", paddingTop: "0.75rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "600", color: "#065f46", marginBottom: "0.5rem" }}>
              Earnings Breakdown:
            </div>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              <table style={{ width: "100%", fontSize: "0.75rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #d1fae5" }}>
                    <th style={{ padding: "0.5rem", textAlign: "left", color: "#065f46", fontWeight: "600" }}>Address</th>
                    <th style={{ padding: "0.5rem", textAlign: "left", color: "#065f46", fontWeight: "600" }}>Completed</th>
                    <th style={{ padding: "0.5rem", textAlign: "right", color: "#065f46", fontWeight: "600" }}>Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.stops.map((stop, idx) => (
                    <tr key={stop.id} style={{ borderBottom: idx < earnings.stops.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                      <td style={{ padding: "0.5rem", color: "#374151" }}>
                        <div style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {stop.fullAddress}
                        </div>
                      </td>
                      <td style={{ padding: "0.5rem", color: "#6b7280" }}>
                        {formatCompletionTime(stop.completedAt)}
                      </td>
                      <td style={{ padding: "0.5rem", textAlign: "right", fontWeight: "600", color: "#16a34a" }}>
                        {stop.formattedEarnings}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Shift Status */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Status:</span>
          <span style={{
            fontSize: "0.875rem",
            fontWeight: "600",
            padding: "0.25rem 0.75rem",
            borderRadius: "6px",
            background: displayStatus.shiftStatus === "clocked_in" ? "#d1fae5" : "#f3f4f6",
            color: displayStatus.shiftStatus === "clocked_in" ? "#065f46" : "#6b7280",
          }}>
            {displayStatus.shiftStatus === "not_started" ? "Not Started" :
             displayStatus.shiftStatus === "clocked_in" ? "Clocked In" : "Completed"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Start Time:</span>
          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
            {formatTime(displayStatus.shiftStartTime)}
          </span>
        </div>
        {displayStatus.expectedEndTime && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Expected End:</span>
            <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
              {formatTime(displayStatus.expectedEndTime)}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
          <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
            Progress: {displayStatus.completedStops} / {displayStatus.assignedStops} stops
          </span>
          <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {displayStatus.stopsRemaining} remaining
          </span>
        </div>
        <div style={{
          width: "100%",
          height: "24px",
          background: "#f3f4f6",
          borderRadius: "12px",
          overflow: "hidden",
        }}>
          <div style={{
            width: `${progressPercentage}%`,
            height: "100%",
            background: progressPercentage === 100 ? "#16a34a" : "#3b82f6",
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#16a34a" }}>
            {displayStatus.completedStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Completed
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: displayStatus.missedStops > 0 ? "#dc2626" : "#6b7280" }}>
            {displayStatus.missedStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Missed/Late
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#3b82f6" }}>
            {displayStatus.inProgressStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            In Progress
          </div>
        </div>
        <div style={{
          padding: "1rem",
          background: "#f9fafb",
          borderRadius: "8px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "1.5rem", fontWeight: "700", color: "#f59e0b" }}>
            {displayStatus.pendingStops}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
            Pending
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setShowMarkCompleteModal(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          Mark Stop Complete
        </button>
        <button
          onClick={() => setShowAddNoteModal(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#3b82f6",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          Add Note
        </button>
        <button
          onClick={() => setShowViewProofModal(true)}
          style={{
            padding: "0.5rem 1rem",
            background: "#6b7280",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          View Proof
        </button>
      </div>

      {/* Modals */}
      <MarkStopCompleteModal
        isOpen={showMarkCompleteModal}
        onClose={() => setShowMarkCompleteModal(false)}
        employeeId={employeeId}
        onComplete={handleRefresh}
      />
      <AddNoteModal
        isOpen={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
        employeeId={employeeId}
        onNoteAdded={handleRefresh}
      />
      <ViewProofModal
        isOpen={showViewProofModal}
        onClose={() => setShowViewProofModal(false)}
        employeeId={employeeId}
      />
    </div>
  );
}

