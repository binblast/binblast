// components/EditCleaningModal.tsx
"use client";

import React, { useState, useEffect } from "react";

interface Cleaning {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  trashDay: string;
  notes?: string;
  status: string;
}

interface EditCleaningModalProps {
  cleaning: Cleaning;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

export function EditCleaningModal({ cleaning, isOpen, onClose, onUpdated }: EditCleaningModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [addressLine1, setAddressLine1] = useState(cleaning.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(cleaning.addressLine2 || "");
  const [city, setCity] = useState(cleaning.city || "");
  const [state, setState] = useState(cleaning.state || "");
  const [zipCode, setZipCode] = useState(cleaning.zipCode || "");
  const [trashDay, setTrashDay] = useState(cleaning.trashDay || "");
  const [selectedTime, setSelectedTime] = useState(cleaning.scheduledTime || "");
  const [notes, setNotes] = useState(cleaning.notes || "");

  // Update form when cleaning changes
  useEffect(() => {
    if (cleaning) {
      setAddressLine1(cleaning.addressLine1 || "");
      setAddressLine2(cleaning.addressLine2 || "");
      setCity(cleaning.city || "");
      setState(cleaning.state || "");
      setZipCode(cleaning.zipCode || "");
      setTrashDay(cleaning.trashDay || "");
      setSelectedTime(cleaning.scheduledTime || "");
      setNotes(cleaning.notes || "");
    }
  }, [cleaning]);

  const timeOptions = [
    "9:00 AM - 12:00 PM",
    "12:00 PM - 3:00 PM",
    "3:00 PM - 6:00 PM",
  ];

  const dayOptions = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!addressLine1 || !city || !state || !zipCode || !trashDay || !selectedTime) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/cleanings/${cleaning.id}/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state,
          zipCode,
          trashDay,
          scheduledTime: selectedTime,
          notes: notes || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update cleaning");
      }

      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error updating cleaning:", err);
      setError(err.message || "Failed to update cleaning. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
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
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "16px",
          padding: "2rem",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "1.5rem",
            color: "var(--text-dark)",
          }}
        >
          Edit Cleaning Details
        </h2>

        {error && (
          <div
            style={{
              padding: "0.75rem",
              background: "#fee2e2",
              border: "1px solid #fca5a5",
              borderRadius: "8px",
              marginBottom: "1rem",
              color: "#dc2626",
              fontSize: "0.875rem",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Address Line 1 */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.5rem",
              }}
            >
              Address Line 1 <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <input
              type="text"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
              }}
            />
          </div>

          {/* Address Line 2 */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.5rem",
              }}
            >
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              value={addressLine2}
              onChange={(e) => setAddressLine2(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
              }}
            />
          </div>

          {/* City, State, Zip */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--text-dark)",
                  marginBottom: "0.5rem",
                }}
              >
                City <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--text-dark)",
                  marginBottom: "0.5rem",
                }}
              >
                State <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                maxLength={2}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  textTransform: "uppercase",
                }}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "var(--text-dark)",
                  marginBottom: "0.5rem",
                }}
              >
                ZIP <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                type="text"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                required
                maxLength={5}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                }}
              />
            </div>
          </div>

          {/* Preferred Cleaning Day */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.5rem",
              }}
            >
              Preferred Cleaning Day <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={trashDay}
              onChange={(e) => setTrashDay(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: "#ffffff",
              }}
            >
              <option value="">Select a day</option>
              {dayOptions.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Preferred Time Window */}
          <div style={{ marginBottom: "1rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.5rem",
              }}
            >
              Preferred Time Window <span style={{ color: "#dc2626" }}>*</span>
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                background: "#ffffff",
              }}
            >
              <option value="">Select a time</option>
              {timeOptions.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
                marginBottom: "0.5rem",
              }}
            >
              Special Instructions (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "0.875rem",
                resize: "vertical",
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                background: "#ffffff",
                color: "var(--text-dark)",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                borderRadius: "8px",
                background: loading ? "#9ca3af" : "#16a34a",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Updating..." : "Update Cleaning"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

