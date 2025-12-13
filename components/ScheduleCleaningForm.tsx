// components/ScheduleCleaningForm.tsx
"use client";

import { useState, useEffect } from "react";
import { useFirebase } from "@/lib/firebase-context";

interface ScheduledCleaning {
  id: string;
  scheduledDate: string;
  scheduledTime: string;
  address: string;
  status: "upcoming" | "completed" | "cancelled";
  createdAt: any;
}

interface ScheduleCleaningFormProps {
  userId: string;
  userEmail: string;
  onScheduleCreated?: () => void;
}

export function ScheduleCleaningForm({ userId, userEmail, onScheduleCreated }: ScheduleCleaningFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [zipCode, setZipCode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [trashDay, setTrashDay] = useState("");
  const [selectedDateValue, setSelectedDateValue] = useState(""); // Store the actual date value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isReady: firebaseReady } = useFirebase();
  
  // Form fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");

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
      
      // Check if this occurrence is within 2 weeks AND not in the past
      const firstOccurrence = new Date(today);
      firstOccurrence.setDate(today.getDate() + daysUntilDay);
      firstOccurrence.setHours(0, 0, 0, 0);
      
      // Only include if date is in the future (not today), and within 2 weeks
      if (firstOccurrence > today && firstOccurrence <= twoWeeksFromNow) {
        const dateValue = formatDateForInput(firstOccurrence);
        const monthName = firstOccurrence.toLocaleDateString("en-US", { month: "short" });
        const dayNumber = firstOccurrence.getDate();
        const label = `${dayName}, ${monthName} ${dayNumber}`;
        
        options.push({
          dayName,
          date: firstOccurrence,
          value: dateValue,
          label
        });
      }
      
      // Also check the second occurrence (next week) if within 2 weeks
      const secondOccurrence = new Date(firstOccurrence);
      secondOccurrence.setDate(firstOccurrence.getDate() + 7);
      secondOccurrence.setHours(0, 0, 0, 0);
      
      // Only include if date is in the future (not today), and within 2 weeks
      if (secondOccurrence > today && secondOccurrence <= twoWeeksFromNow) {
        const dateValue = formatDateForInput(secondOccurrence);
        const monthName = secondOccurrence.toLocaleDateString("en-US", { month: "short" });
        const dayNumber = secondOccurrence.getDate();
        const label = `${dayName}, ${monthName} ${dayNumber}`;
        
        options.push({
          dayName,
          date: secondOccurrence,
          value: dateValue,
          label
        });
      }
    });
    
    // Sort by date
    options.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return options;
  };

  const dayOptions = getDayOptions();

  // Calculate the scheduled date based on selected date value
  const getCalculatedDate = () => {
    if (!selectedDateValue) return null;
    return new Date(selectedDateValue);
  };

  const calculatedDate = getCalculatedDate();

  // Handle day selection - extract day name and date value
  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    setSelectedDateValue(selectedValue);
    
    // Extract day name from the selected option
    const selectedOption = dayOptions.find(opt => opt.value === selectedValue);
    if (selectedOption) {
      setTrashDay(selectedOption.dayName);
    } else {
      setTrashDay("");
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!addressLine1 || !city || !state || !zipCode || !selectedDateValue || !selectedTime) {
      setError("Please fill in all required fields");
      return;
    }

    // Don't submit if Firebase is not ready
    if (!firebaseReady) {
      setError("Firebase is not ready. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const db = await getDbInstance();
      
      if (!db) {
        throw new Error("Firebase is not configured");
      }
      
      // CRITICAL: Use safe import wrapper to ensure Firebase app exists
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, addDoc, serverTimestamp } = firestore;

      // Use the selected date value directly
      const scheduledDate = selectedDateValue;

      // Save scheduled cleaning to Firestore
      const scheduledCleaning = {
        userId,
        userEmail,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        zipCode,
        trashDay,
        scheduledDate: scheduledDate,
        scheduledTime: selectedTime,
        notes: notes || null,
        status: "upcoming",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "scheduledCleanings"), scheduledCleaning);

      // Reset form
      setAddressLine1("");
      setAddressLine2("");
      setCity("");
      setState("");
      setZipCode("");
      setTrashDay("");
      setSelectedDateValue("");
      setSelectedTime("");
      setNotes("");
      setIsOpen(false);
      
      if (onScheduleCreated) {
        onScheduleCreated();
      }
    } catch (err: any) {
      console.error("Error scheduling cleaning:", err);
      setError(err.message || "Failed to schedule cleaning. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = [
    "6:00 AM - 9:00 AM",
    "9:00 AM - 12:00 PM",
    "12:00 PM - 3:00 PM",
    "3:00 PM - 6:00 PM",
  ];

  return (
    <div>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{ marginBottom: "1.5rem" }}
      >
        {isOpen ? "Cancel Scheduling" : "Schedule Cleaning"}
      </button>

      {isOpen && (
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e5e7eb",
          marginBottom: "2rem"
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
            Schedule Your Bin Cleaning
          </h2>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Preferred Cleaning Day Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Preferred Cleaning Day
              </label>
              <select
                value={selectedDateValue}
                onChange={handleDayChange}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem"
                }}
              >
                <option value="">Select preferred cleaning day</option>
                {dayOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {calculatedDate && (
                <p style={{ 
                  marginTop: "0.5rem", 
                  fontSize: "0.875rem", 
                  color: "#16a34a",
                  fontWeight: "500"
                }}>
                  Scheduled for: {calculatedDate.toLocaleDateString("en-US", { 
                    weekday: "long", 
                    month: "long", 
                    day: "numeric", 
                    year: "numeric" 
                  })}
                </p>
              )}
            </div>

            {/* Time Selection */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Preferred Time Window
              </label>
              <select
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem"
                }}
              >
                <option value="">Select time</option>
                {timeSlots.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Service Address
              </label>
              <input
                type="text"
                placeholder="Street Address"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  marginBottom: "0.75rem"
                }}
              />
              <input
                type="text"
                placeholder="Apt, Unit, Suite (optional)"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  marginBottom: "0.75rem"
                }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.75rem" }}>
                <input
                  type="text"
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem"
                  }}
                />
                <input
                  type="text"
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase())}
                  maxLength={2}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    textTransform: "uppercase"
                  }}
                />
                <input
                  type="text"
                  placeholder="Zip Code"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem"
                  }}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Special Instructions <span style={{ color: "var(--text-light)", fontWeight: "400" }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special instructions for our team..."
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontFamily: "inherit",
                  resize: "vertical"
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "0.875rem"
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedDateValue || !selectedTime}
              className={`btn btn-primary ${loading ? "disabled" : ""}`}
              style={{
                width: "100%",
                marginTop: "0.5rem",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? "Scheduling..." : "Schedule Cleaning"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

