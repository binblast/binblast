// components/OperatorDashboard/EmployeeDetail/AddNoteModal.tsx
"use client";

import { useState, useEffect } from "react";

interface Stop {
  id: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  scheduledTime?: string;
  customerName?: string;
  customerEmail?: string;
  operatorNotes?: string;
}

interface AddNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  onNoteAdded: () => void;
}

export function AddNoteModal({
  isOpen,
  onClose,
  employeeId,
  onNoteAdded,
}: AddNoteModalProps) {
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStopId, setSelectedStopId] = useState<string>("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStops();
      setSelectedStopId("");
      setNote("");
      setError(null);
    }
  }, [isOpen, employeeId]);

  const loadStops = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/operator/employees/${employeeId}/stops`);
      if (response.ok) {
        const data = await response.json();
        const todayStops = (data.todayStops || []) as Stop[];
        setStops(todayStops);
        // Pre-select first stop if available
        if (todayStops.length > 0 && !selectedStopId) {
          setSelectedStopId(todayStops[0].id);
          setNote(todayStops[0].operatorNotes || "");
        }
      }
    } catch (error) {
      console.error("Error loading stops:", error);
      setError("Failed to load stops");
    } finally {
      setLoading(false);
    }
  };

  const handleStopChange = (stopId: string) => {
    setSelectedStopId(stopId);
    const selectedStop = stops.find(s => s.id === stopId);
    setNote(selectedStop?.operatorNotes || "");
  };

  const handleSave = async () => {
    if (!selectedStopId || !note.trim()) {
      setError("Please select a stop and enter a note");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/operator/jobs/${selectedStopId}/note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save note");
      }

      onNoteAdded();
      onClose();
    } catch (error: any) {
      console.error("Error saving note:", error);
      setError(error.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const formatAddress = (stop: Stop) => {
    const parts = [
      stop.addressLine1,
      stop.addressLine2,
      stop.city,
      stop.state,
      stop.zipCode,
    ].filter(Boolean);
    return parts.join(", ") || "N/A";
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem",
    }}>
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        maxWidth: "500px",
        width: "100%",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
            Add Note to Stop
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1.5rem",
              cursor: "pointer",
              color: "#6b7280",
              padding: "0.25rem",
            }}
          >
            ×
          </button>
        </div>

        {error && (
          <div style={{
            padding: "0.75rem",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
            Loading stops...
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
                Select Stop
              </label>
              <select
                value={selectedStopId}
                onChange={(e) => handleStopChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                }}
              >
                <option value="">-- Select a stop --</option>
                {stops.map((stop) => (
                  <option key={stop.id} value={stop.id}>
                    {formatAddress(stop)} {stop.scheduledTime ? `(${stop.scheduledTime})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedStopId && (
              <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "6px" }}>
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Selected Stop:</div>
                <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
                  {formatAddress(stops.find(s => s.id === selectedStopId) || {})}
                </div>
              </div>
            )}

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
                Note
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter note about this stop..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!selectedStopId || !note.trim() || saving}
                style={{
                  padding: "0.5rem 1rem",
                  background: saving || !selectedStopId || !note.trim() ? "#9ca3af" : "#3b82f6",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: saving || !selectedStopId || !note.trim() ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Note"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

