// components/ScheduleCleaningForm.tsx
"use client";

import { useState, useEffect } from "react";

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
  const [suggestedTrashDay, setSuggestedTrashDay] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  
  // Form fields
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [notes, setNotes] = useState("");

  // Calculate available dates (same day or within 24-48 hours of trash day)
  const getAvailableDates = () => {
    if (!trashDay) return [];
    
    const today = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const trashDayIndex = dayNames.indexOf(trashDay);
    
    if (trashDayIndex === -1) return [];
    
    const dates: string[] = [];
    const currentDayIndex = today.getDay();
    
    // Find next occurrence of trash day
    let daysUntilTrashDay = trashDayIndex - currentDayIndex;
    if (daysUntilTrashDay < 0) daysUntilTrashDay += 7;
    if (daysUntilTrashDay === 0) daysUntilTrashDay = 7; // If today is trash day, offer next week
    
    const trashDayDate = new Date(today);
    trashDayDate.setDate(today.getDate() + daysUntilTrashDay);
    
    // Add same day (if trash day is today or tomorrow)
    const sameDay = new Date(trashDayDate);
    dates.push(formatDateForInput(sameDay));
    
    // Add +1 day (24 hours after trash day)
    const nextDay = new Date(trashDayDate);
    nextDay.setDate(trashDayDate.getDate() + 1);
    dates.push(formatDateForInput(nextDay));
    
    // Add +2 days (48 hours after trash day)
    const dayAfter = new Date(trashDayDate);
    dayAfter.setDate(trashDayDate.getDate() + 2);
    dates.push(formatDateForInput(dayAfter));
    
    return dates;
  };

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const lookupTrashDay = async () => {
    if (!zipCode && !city) {
      setError("Please enter a zip code or city");
      return;
    }

    setLookupLoading(true);
    setError(null);
    setSuggestedTrashDay(null);

    try {
      const params = new URLSearchParams();
      if (zipCode) params.append("postalCode", zipCode);
      if (city) params.append("city", city);
      if (state) params.append("state", state);

      const res = await fetch(`/api/trash-schedule/lookup?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not find trash schedule for this area");
      }

      const data = await res.json();
      if (data.defaultTrashDayOfWeek) {
        setSuggestedTrashDay(data.defaultTrashDayOfWeek);
        setTrashDay(data.defaultTrashDayOfWeek);
      } else {
        setError("No trash schedule found for this area. Please enter manually.");
      }
    } catch (err: any) {
      setError(err.message || "Could not fetch trash schedule. Please enter manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!addressLine1 || !city || !state || !zipCode || !trashDay || !selectedDate || !selectedTime) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const { db } = await import("@/lib/firebase");
      const { collection, addDoc, serverTimestamp } = await import("firebase/firestore");

      if (!db) {
        throw new Error("Firebase is not configured");
      }

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
        scheduledDate: selectedDate,
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
      setSelectedDate("");
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

  const availableDates = getAvailableDates();
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
            {/* Zip Code Lookup */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Find Your Trash Day
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
                <div>
                  <input
                    type="text"
                    placeholder="Zip Code"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="City"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem"
                    }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    placeholder="State"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                    maxLength={2}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      textTransform: "uppercase"
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={lookupTrashDay}
                  disabled={lookupLoading}
                  className="btn btn-secondary"
                  style={{ whiteSpace: "nowrap" }}
                >
                  {lookupLoading ? "Searching..." : "Lookup"}
                </button>
              </div>
              {suggestedTrashDay && (
                <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#16a34a", fontWeight: "600" }}>
                  ✓ Trash day found: {suggestedTrashDay}
                </p>
              )}
            </div>

            {/* Manual Trash Day Entry */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Trash Day <span style={{ color: "var(--text-light)", fontWeight: "400" }}>(if lookup didn't work)</span>
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
                <option value="">Select trash day</option>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
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
                  fontSize: "0.95rem"
                }}
              />
            </div>

            {/* Date Selection */}
            {trashDay && availableDates.length > 0 && (
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                  Select Cleaning Date
                </label>
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem"
                  }}
                >
                  <option value="">Select date</option>
                  {availableDates.map((date) => {
                    const dateObj = new Date(date);
                    const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                    const formattedDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    return (
                      <option key={date} value={date}>
                        {dayName}, {formattedDate}
                      </option>
                    );
                  })}
                </select>
                <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "var(--text-light)" }}>
                  Available dates: Same day as trash pickup, or within 24-48 hours after
                </p>
              </div>
            )}

            {/* Time Selection */}
            {selectedDate && (
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
            )}

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
              disabled={loading || !trashDay || !selectedDate || !selectedTime}
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

