"use client";

import { useCallback, useEffect, useState } from "react";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { parseFirestoreTimestamp } from "@/lib/employee-utils";
import { JobPhotosViewer } from "./JobPhotosViewer";

interface ProofStop {
  cleaningId: string;
  completionPhotoUrl?: string | null;
  insidePhotoUrl?: string | null;
  outsidePhotoUrl?: string | null;
  employeeNotes?: string | null;
  operatorNotes?: string | null;
  flags?: string[];
  completedAt?: unknown;
  scheduledDate?: string | null;
  scheduledTime?: string | null;
  customerName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  operatorSkipPhotos?: boolean;
}

interface ViewProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  initialStopId?: string | null;
}

export function ViewProofModal({
  isOpen,
  onClose,
  employeeId,
  initialStopId = null,
}: ViewProofModalProps) {
  const [stops, setStops] = useState<ProofStop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const loadProofs = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/proof?todayOnly=1`,
        { cache: "no-store" }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load cleaning photos");
      }

      const data = await response.json();
      const proofs = (data.proofs || []) as ProofStop[];
      setStops(proofs);
      setError(null);
      setLastSync(new Date());

      setSelectedStopId((current) => {
        if (current && proofs.some((stop) => stop.cleaningId === current)) {
          return current;
        }
        if (initialStopId && proofs.some((stop) => stop.cleaningId === initialStopId)) {
          return initialStopId;
        }
        return proofs[0]?.cleaningId || "";
      });
    } catch (loadError: unknown) {
      const message =
        loadError instanceof Error ? loadError.message : "Failed to load cleaning photos";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [employeeId, initialStopId]);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    loadProofs();

    let unsubscribe: (() => void) | undefined;
    const pollInterval = window.setInterval(loadProofs, 15000);

    async function setupListener() {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;

      unsubscribe = onSnapshot(
        query(collection(db, "scheduledCleanings"), where("assignedEmployeeId", "==", employeeId)),
        () => loadProofs()
      );
    }

    setupListener().catch(() => undefined);

    return () => {
      if (unsubscribe) unsubscribe();
      window.clearInterval(pollInterval);
    };
  }, [isOpen, employeeId, loadProofs]);

  const formatAddress = (stop: ProofStop) => {
    return [stop.addressLine1, stop.addressLine2, stop.city, stop.state, stop.zipCode]
      .filter(Boolean)
      .join(", ");
  };

  const formatTime = (timestamp: unknown): string => {
    const date = parseFirestoreTimestamp(timestamp);
    if (!date) return "N/A";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const selectedStop = stops.find((stop) => stop.cleaningId === selectedStopId);

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
          maxWidth: "760px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
              Cleaning Photos
            </h3>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
              Live before &amp; after photos from today&apos;s completed stops
              {lastSync ? ` · synced ${lastSync.toLocaleTimeString()}` : ""}
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
            Loading photos...
          </div>
        ) : stops.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            No completed stops yet today. Photos appear here as soon as a stop is finished.
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#374151",
                  marginBottom: "0.5rem",
                }}
              >
                Completed Stop
              </label>
              <select
                value={selectedStopId}
                onChange={(e) => setSelectedStopId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              >
                {stops.map((stop) => (
                  <option key={stop.cleaningId} value={stop.cleaningId}>
                    {formatAddress(stop)} {stop.scheduledTime ? `(${stop.scheduledTime})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedStop && (
              <div style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "1.5rem" }}>
                <div style={{ marginBottom: "1rem" }}>
                  <div style={{ fontWeight: "600", color: "#111827" }}>
                    {selectedStop.customerName || "Customer"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {formatAddress(selectedStop)}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.25rem" }}>
                    Completed {formatTime(selectedStop.completedAt)}
                  </div>
                  {selectedStop.operatorSkipPhotos && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.75rem",
                        color: "#92400e",
                        fontWeight: "600",
                      }}
                    >
                      Cleared by operator — photos not required
                    </div>
                  )}
                </div>

                <JobPhotosViewer cleaningId={selectedStop.cleaningId} />

                {(selectedStop.insidePhotoUrl || selectedStop.outsidePhotoUrl) && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "1rem",
                      marginTop: "1rem",
                    }}
                  >
                    {selectedStop.insidePhotoUrl && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                          Inside Photo
                        </div>
                        <img
                          src={selectedStop.insidePhotoUrl}
                          alt="Inside bin"
                          style={{
                            width: "100%",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      </div>
                    )}
                    {selectedStop.outsidePhotoUrl && (
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                          Outside Photo
                        </div>
                        <img
                          src={selectedStop.outsidePhotoUrl}
                          alt="Outside bin"
                          style={{
                            width: "100%",
                            borderRadius: "8px",
                            border: "1px solid #e5e7eb",
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}

                {selectedStop.employeeNotes && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                      Employee Notes
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        padding: "0.75rem",
                        background: "#f9fafb",
                        borderRadius: "6px",
                      }}
                    >
                      {selectedStop.employeeNotes}
                    </div>
                  </div>
                )}

                {selectedStop.operatorNotes && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                      Operator Notes
                    </div>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        padding: "0.75rem",
                        background: "#f9fafb",
                        borderRadius: "6px",
                      }}
                    >
                      {selectedStop.operatorNotes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.5rem 1rem",
              background: "#6b7280",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
