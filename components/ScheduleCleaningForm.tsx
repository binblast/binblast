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

  // Calculate the scheduled date based on preferred cleaning day
  const getCalculatedDate = () => {
    if (!trashDay) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const trashDayIndex = dayNames.indexOf(trashDay);
    
    if (trashDayIndex === -1) return null;
    
    const currentDayIndex = today.getDay();
    let daysUntilTrashDay = trashDayIndex - currentDayIndex;
    if (daysUntilTrashDay < 0) {
      daysUntilTrashDay += 7; // Move to next week
    }
    
    const scheduledDateObj = new Date(today);
    scheduledDateObj.setDate(today.getDate() + daysUntilTrashDay);
    
    return scheduledDateObj;
  };

  const calculatedDate = getCalculatedDate();


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!addressLine1 || !city || !state || !zipCode || !trashDay || !selectedTime) {
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

      // Calculate scheduled date based on preferred cleaning day
      // Use the next occurrence of the selected trash day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const trashDayIndex = dayNames.indexOf(trashDay);
      const currentDayIndex = today.getDay();
      let daysUntilTrashDay = trashDayIndex - currentDayIndex;
      if (daysUntilTrashDay < 0) {
        daysUntilTrashDay += 7; // Move to next week
      }
      const scheduledDateObj = new Date(today);
      scheduledDateObj.setDate(today.getDate() + daysUntilTrashDay);
      const scheduledDate = formatDateForInput(scheduledDateObj);

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
                value={trashDay}
                onChange={(e) => setTrashDay(e.target.value)}
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
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
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
              disabled={loading || !trashDay || !selectedTime}
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

