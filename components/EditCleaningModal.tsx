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

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate dropdown options for each day within 2-week window
  const getDayOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // Start from tomorrow
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const options: Array<{ dayName: string; date: Date; value: string; label: string }> = [];
    
    // For each day of the week, find the next occurrence within 2 weeks
    dayNames.forEach((dayName, dayIndex) => {
      const currentDayIndex = today.getDay();
      let daysUntilDay = dayIndex - currentDayIndex;
      
      // If the day has already passed this week, move to next week
      if (daysUntilDay < 0) {
        daysUntilDay += 7;
      }
      
      // First occurrence (this week or next)
      const firstOccurrence = new Date(today);
      firstOccurrence.setDate(today.getDate() + daysUntilDay);
      firstOccurrence.setHours(0, 0, 0, 0);

      if (firstOccurrence >= tomorrow && firstOccurrence <= twoWeeksFromNow) {
        const dateValue = formatDateForInput(firstOccurrence);
        const monthName = firstOccurrence.toLocaleDateString("en-US", { month: "short" });
        const dayNumber = firstOccurrence.getDate();
        const label = `${dayName}, ${monthName} ${dayNumber}`;
        options.push({ dayName, date: firstOccurrence, value: dateValue, label });
      }

      // Second occurrence (next week)
      const secondOccurrence = new Date(firstOccurrence);
      secondOccurrence.setDate(firstOccurrence.getDate() + 7);
      secondOccurrence.setHours(0, 0, 0, 0);

      if (secondOccurrence >= tomorrow && secondOccurrence <= twoWeeksFromNow) {
        const dateValue = formatDateForInput(secondOccurrence);
        const monthName = secondOccurrence.toLocaleDateString("en-US", { month: "short" });
        const dayNumber = secondOccurrence.getDate();
        const label = `${dayName}, ${monthName} ${dayNumber}`;
        options.push({ dayName, date: secondOccurrence, value: dateValue, label });
      }
    });

    options.sort((a, b) => a.date.getTime() - b.date.getTime());
    return options;
  };

  const dayOptions = getDayOptions();

  // Get the selected day option based on the cleaning's scheduled date
  const getSelectedDayValue = (cleaningData: Cleaning, options: typeof dayOptions) => {
    if (!cleaningData.scheduledDate) return "";
    try {
      const cleaningDate = cleaningData.scheduledDate?.toDate?.() || new Date(cleaningData.scheduledDate);
      const dateValue = formatDateForInput(cleaningDate);
      // Find matching option
      const matchingOption = options.find(opt => opt.value === dateValue);
      return matchingOption ? matchingOption.value : "";
    } catch (e) {
      return "";
    }
  };

  const [selectedDayValue, setSelectedDayValue] = useState(() => getSelectedDayValue(cleaning, dayOptions));

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
      const newDayOptions = getDayOptions();
      setSelectedDayValue(getSelectedDayValue(cleaning, newDayOptions));
    }
  }, [cleaning]);

  // Handle day selection change
  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedDayValue(selectedValue);
    
    if (selectedValue) {
      const selectedOption = dayOptions.find(opt => opt.value === selectedValue);
      if (selectedOption) {
        setTrashDay(selectedOption.dayName); // Store the day name
      }
    } else {
      setTrashDay("");
    }
  };

  const timeOptions = [
    "9:00 AM - 12:00 PM",
    "12:00 PM - 3:00 PM",
    "3:00 PM - 6:00 PM",
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
              value={selectedDayValue}
              onChange={handleDayChange}
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
              <option value="">Select preferred cleaning day</option>
              {dayOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {selectedDayValue && (
              <p style={{ 
                marginTop: "0.5rem", 
                fontSize: "0.875rem", 
                color: "#16a34a",
                fontWeight: "500"
              }}>
                Scheduled for: {dayOptions.find(opt => opt.value === selectedDayValue)?.date.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })}
              </p>
            )}
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

