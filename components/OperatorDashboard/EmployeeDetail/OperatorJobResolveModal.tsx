"use client";

import { useEffect, useState } from "react";
import type { OperatorResolutionType } from "@/lib/operator-job-resolution";

interface Stop {
  id: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
  customerName?: string;
  customerEmail?: string;
  binsCount?: number;
  binCount?: number;
  flags?: string[];
}

interface OperatorJobResolveModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onResolved: () => void;
  initialStopId?: string | null;
}

const RESOLUTION_PRESETS: Array<{
  resolution: OperatorResolutionType;
  label: string;
  description: string;
  color: string;
  needsBinCount?: boolean;
}> = [
  {
    resolution: "bins_not_present",
    label: "Bins Not Present",
    description: "Skip this stop — employee moves on, no photos required",
    color: "#f59e0b",
  },
  {
    resolution: "skip_stop",
    label: "Skip Stop",
    description: "Customer declined service today — complete without photos",
    color: "#6b7280",
  },
  {
    resolution: "access_blocked",
    label: "Access Blocked",
    description: "Gate locked, dog, or blocked driveway — skip without photos",
    color: "#dc2626",
  },
  {
    resolution: "customer_cancelled",
    label: "Customer Cancelled",
    description: "Remove this stop from today's route",
    color: "#991b1b",
  },
  {
    resolution: "complete_no_photos",
    label: "Complete (No Photos)",
    description: "Job was done but photos aren't available",
    color: "#16a34a",
  },
  {
    resolution: "reduce_bins",
    label: "Reduce Bins",
    description: "Customer only wants some bins cleaned today",
    color: "#3b82f6",
    needsBinCount: true,
  },
];

export function OperatorJobResolveModal({
  isOpen,
  onClose,
  employeeId,
  onResolved,
  initialStopId = null,
}: OperatorJobResolveModalProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [notes, setNotes] = useState("");
  const [binCount, setBinCount] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStops();
      if (!initialStopId) {
        setSelectedStop(null);
      }
      setNotes("");
      setError(null);
    }
  }, [isOpen, employeeId, initialStopId]);

  useEffect(() => {
    if (!isOpen || !initialStopId || stops.length === 0) return;
    const match = stops.find((stop) => stop.id === initialStopId);
    if (match) {
      setSelectedStop(match);
      setBinCount(match.binCount ?? match.binsCount ?? 1);
    }
  }, [isOpen, initialStopId, stops]);

  const loadStops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`);
      if (response.ok) {
        const data = await response.json();
        const todayStops = (data.todayStops || []) as Stop[];
        const activeStops = todayStops.filter((stop) => {
          const status = stop.status || stop.jobStatus || "pending";
          return status === "pending" || status === "in_progress";
        });
        setStops(activeStops);
      }
    } catch (loadError) {
      console.error("Error loading stops:", loadError);
      setError("Failed to load stops");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (resolution: OperatorResolutionType) => {
    if (!selectedStop) return;

    setResolving(resolution);
    setError(null);

    try {
      const { getAuthInstance } = await import("@/lib/firebase");
      const auth = await getAuthInstance();
      const operatorId = auth?.currentUser?.uid || "operator";

      const response = await fetch(`/api/operator/jobs/${selectedStop.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operatorId,
          resolution,
          notes: notes.trim() || undefined,
          binCount: resolution === "reduce_bins" ? binCount : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to resolve job");
      }

      setStops((prev) => prev.filter((stop) => stop.id !== selectedStop.id));
      setSelectedStop(null);
      setNotes("");
      onResolved();
    } catch (resolveError: unknown) {
      const message =
        resolveError instanceof Error ? resolveError.message : "Failed to resolve job";
      setError(message);
    } finally {
      setResolving(null);
    }
  };

  const formatAddress = (stop: Stop) => {
    return [stop.addressLine1, stop.addressLine2, stop.city, stop.state, stop.zipCode]
      .filter(Boolean)
      .join(", ");
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "720px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>
              Resolve Job Issue
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
              One tap to clear field problems — employee can move on immediately
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fee2e2",
              color: "#991b1b",
              borderRadius: "6px",
              marginBottom: "1rem",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            Loading active stops...
          </div>
        ) : stops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No active stops need resolution
          </div>
        ) : !selectedStop ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {stops.map((stop) => (
              <button
                key={stop.id}
                onClick={() => {
                  setSelectedStop(stop);
                  setBinCount(stop.binCount ?? stop.binsCount ?? 1);
                }}
                style={{
                  textAlign: "left",
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: "#ffffff",
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: "600", color: "#111827" }}>
                  {stop.customerName || stop.customerEmail || "Customer"}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                  {formatAddress(stop)}
                </div>
                {stop.flags && stop.flags.length > 0 && (
                  <div style={{ fontSize: "0.75rem", color: "#dc2626", marginTop: "0.5rem", fontWeight: "600" }}>
                    Flagged: {stop.flags.join(", ")}
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedStop(null)}
              style={{
                background: "transparent",
                border: "none",
                color: "#3b82f6",
                fontSize: "0.875rem",
                cursor: "pointer",
                marginBottom: "1rem",
              }}
            >
              ← Back to stop list
            </button>

            <div
              style={{
                padding: "1rem",
                background: "#f9fafb",
                borderRadius: "8px",
                marginBottom: "1rem",
              }}
            >
              <div style={{ fontWeight: "600" }}>
                {selectedStop.customerName || selectedStop.customerEmail}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {formatAddress(selectedStop)}
              </div>
            </div>

            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. Customer called — bins already taken inside"
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                marginBottom: "1rem",
              }}
            />

            <div style={{ display: "grid", gap: "0.75rem" }}>
              {RESOLUTION_PRESETS.map((preset) => (
                <div key={preset.resolution}>
                  {preset.needsBinCount && (
                    <div style={{ marginBottom: "0.5rem" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: "600", color: "#374151" }}>
                        Bins to clean
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={binCount}
                        onChange={(e) => setBinCount(Number(e.target.value))}
                        style={{
                          width: "80px",
                          marginLeft: "0.5rem",
                          padding: "0.375rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                  )}
                  <button
                    onClick={() => handleResolve(preset.resolution)}
                    disabled={resolving !== null}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "1rem",
                      border: `2px solid ${preset.color}`,
                      borderRadius: "8px",
                      background: resolving === preset.resolution ? "#f3f4f6" : "#ffffff",
                      cursor: resolving ? "not-allowed" : "pointer",
                    }}
                  >
                    <div style={{ fontWeight: "700", color: preset.color }}>{preset.label}</div>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
                      {preset.description}
                    </div>
                    {resolving === preset.resolution && (
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
                        Applying...
                      </div>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
