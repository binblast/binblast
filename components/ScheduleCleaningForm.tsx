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
  existingCleaning?: {
    id: string;
    scheduledDate: string;
    scheduledTime: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    trashDay?: string;
    notes?: string;
    status: "upcoming" | "completed" | "cancelled";
  } | null;
  userData?: {
    firstName?: string;
    lastName?: string;
    selectedPlan?: string;
  } | null;
}

export function ScheduleCleaningForm({ userId, userEmail, onScheduleCreated, existingCleaning, userData }: ScheduleCleaningFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Helper to parse date from various formats (including Firestore timestamps)
  const parseDate = (dateInput: any): Date => {
    if (!dateInput) return new Date();
    
    // If it's a Firestore timestamp
    if (dateInput?.toDate && typeof dateInput.toDate === 'function') {
      return dateInput.toDate();
    }
    
    // If it's already a Date object
    if (dateInput instanceof Date) {
      return dateInput;
    }
    
    // If it's a string
    if (typeof dateInput === 'string') {
      if (dateInput.includes('T')) {
        return new Date(dateInput);
      }
      // If it's YYYY-MM-DD format
      return new Date(dateInput + 'T00:00:00');
    }
    
    return new Date();
  };

  // Pre-fill form with existing cleaning data if available
  const getInitialDate = (): string => {
    if (existingCleaning?.scheduledDate) {
      try {
        const date = parseDate(existingCleaning.scheduledDate);
        return formatDateForInput(date);
      } catch (e) {
        return "";
      }
    }
    return "";
  };

  const [zipCode, setZipCode] = useState(existingCleaning?.zipCode || "");
  const [city, setCity] = useState(existingCleaning?.city || "");
  const [state, setState] = useState(existingCleaning?.state || "");
  const [trashDay, setTrashDay] = useState(existingCleaning?.trashDay || "");
  const [selectedDateValue, setSelectedDateValue] = useState(getInitialDate()); // Store the actual date value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isReady: firebaseReady } = useFirebase();
  
  // Form fields
  const [addressLine1, setAddressLine1] = useState(existingCleaning?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(existingCleaning?.addressLine2 || "");
  const [selectedTime, setSelectedTime] = useState(existingCleaning?.scheduledTime || "");
  const [notes, setNotes] = useState(existingCleaning?.notes || "");
  const [isRescheduling, setIsRescheduling] = useState(!!existingCleaning);

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if rescheduling is allowed (within 12 hours before cleaning day)
  const canReschedule = (cleaningDate: Date): boolean => {
    if (!existingCleaning) return true;
    
    const now = new Date();
    const cleaningDateTime = new Date(cleaningDate);
    cleaningDateTime.setHours(0, 0, 0, 0);
    
    // Calculate 12 hours before cleaning day
    const twelveHoursBefore = new Date(cleaningDateTime);
    twelveHoursBefore.setHours(twelveHoursBefore.getHours() - 12);
    
    // Allow rescheduling if current time is more than 12 hours before cleaning day
    return now < twelveHoursBefore;
  };

  // Generate dropdown options for each day within 2-week window
  const getDayOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const options: Array<{ dayName: string; date: Date; value: string; label: string }> = [];
    
    // If there's an existing cleaning date, include it even if it's outside the normal window
    if (existingCleaning?.scheduledDate && selectedDateValue) {
      try {
        const existingDate = parseDate(existingCleaning.scheduledDate);
        const existingDateValue = formatDateForInput(existingDate);
        const dayName = existingDate.toLocaleDateString("en-US", { weekday: "long" });
        const monthName = existingDate.toLocaleDateString("en-US", { month: "short" });
        const dayNumber = existingDate.getDate();
        
        // Check if rescheduling is allowed
        const canRescheduleThis = canReschedule(existingDate);
        
        options.push({
          dayName,
          date: existingDate,
          value: existingDateValue,
          label: `${dayName}, ${monthName} ${dayNumber}${canRescheduleThis ? " (Current)" : " (Cannot reschedule - less than 12hrs away)"}`
        });
      } catch (e) {
        console.error("Error parsing existing cleaning date:", e);
      }
    }
    
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
      // Also exclude if it matches the existing cleaning date (already added above)
      const firstDateValue = formatDateForInput(firstOccurrence);
      const isExistingDate = existingCleaning && firstDateValue === selectedDateValue;
      
      if (firstOccurrence > today && firstOccurrence <= twoWeeksFromNow && !isExistingDate) {
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
      const secondDateValue = formatDateForInput(secondOccurrence);
      const isExistingDate2 = existingCleaning && secondDateValue === selectedDateValue;
      
      if (secondOccurrence > today && secondOccurrence <= twoWeeksFromNow && !isExistingDate2) {
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
      const { collection, addDoc, doc, updateDoc, serverTimestamp } = firestore;

      // Use the selected date value directly
      const scheduledDate = selectedDateValue;

      // Check if rescheduling is allowed
      if (existingCleaning && isRescheduling) {
        const cleaningDate = parseDate(existingCleaning.scheduledDate);
        if (!canReschedule(cleaningDate)) {
          setError("You can only reschedule a cleaning more than 12 hours before the scheduled date.");
          setLoading(false);
          return;
        }

        // Update existing cleaning
        const cleaningRef = doc(db, "scheduledCleanings", existingCleaning.id);
        await updateDoc(cleaningRef, {
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state,
          zipCode,
          trashDay,
          scheduledDate: scheduledDate,
          scheduledTime: selectedTime,
          notes: notes || null,
          updatedAt: serverTimestamp(),
        });
        
        // Send confirmation email after rescheduling
        try {
          const { notifyCleaningScheduled } = await import("@/lib/email-utils");
          const { PLAN_CONFIGS } = await import("@/lib/stripe-config");
          
          const planName = userData?.selectedPlan && userData.selectedPlan in PLAN_CONFIGS
            ? PLAN_CONFIGS[userData.selectedPlan as keyof typeof PLAN_CONFIGS].name
            : "Your Plan";
          
          notifyCleaningScheduled({
            email: userEmail,
            firstName: userData?.firstName || "",
            lastName: userData?.lastName || "",
            scheduledDate: scheduledDate,
            scheduledTime: selectedTime,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            preferredDayOfWeek: trashDay,
            planName,
          }).catch((emailErr) => {
            console.error("[ScheduleCleaningForm] Failed to send confirmation email:", emailErr);
          });
        } catch (emailErr) {
          console.error("[ScheduleCleaningForm] Error sending confirmation email:", emailErr);
        }
      } else {
        // Create new scheduled cleaning
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
        
        // Send confirmation email after scheduling
        try {
          const { notifyCleaningScheduled } = await import("@/lib/email-utils");
          const { PLAN_CONFIGS } = await import("@/lib/stripe-config");
          
          const planName = userData?.selectedPlan && userData.selectedPlan in PLAN_CONFIGS
            ? PLAN_CONFIGS[userData.selectedPlan as keyof typeof PLAN_CONFIGS].name
            : "Your Plan";
          
          notifyCleaningScheduled({
            email: userEmail,
            firstName: userData?.firstName || "",
            lastName: userData?.lastName || "",
            scheduledDate: scheduledDate,
            scheduledTime: selectedTime,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            preferredDayOfWeek: trashDay,
            planName,
          }).catch((emailErr) => {
            console.error("[ScheduleCleaningForm] Failed to send confirmation email:", emailErr);
          });
        } catch (emailErr) {
          console.error("[ScheduleCleaningForm] Error sending confirmation email:", emailErr);
        }
      }

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

  // Get existing cleaning date info for display
  const existingCleaningDate = existingCleaning?.scheduledDate ? parseDate(existingCleaning.scheduledDate) : null;
  const canRescheduleExisting = existingCleaningDate ? canReschedule(existingCleaningDate) : true;

  return (
    <div>
      {existingCleaning && existingCleaningDate && (
        <div style={{
          background: "#eff6ff",
          border: "1px solid #3b82f6",
          borderRadius: "12px",
          padding: "1rem",
          marginBottom: "1rem"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <p style={{ margin: 0, fontSize: "0.875rem", fontWeight: "600", color: "#1e40af", marginBottom: "0.25rem" }}>
                Upcoming Cleaning Scheduled
              </p>
              <p style={{ margin: 0, fontSize: "0.875rem", color: "#1e3a8a" }}>
                {existingCleaningDate.toLocaleDateString("en-US", { 
                  weekday: "long", 
                  month: "long", 
                  day: "numeric", 
                  year: "numeric" 
                })} at {existingCleaning.scheduledTime}
              </p>
              {!canRescheduleExisting && (
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.75rem", color: "#dc2626", fontWeight: "500" }}>
                  ⚠️ Cannot reschedule - less than 12 hours before cleaning day
                </p>
              )}
            </div>
            {canRescheduleExisting && (
              <button
                onClick={() => {
                  setIsOpen(true);
                  setIsRescheduling(true);
                }}
                className="btn btn-primary"
                style={{ 
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  whiteSpace: "nowrap"
                }}
              >
                Reschedule
              </button>
            )}
          </div>
        </div>
      )}
      
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-primary"
        style={{ marginBottom: "1.5rem" }}
      >
        {isOpen ? "Cancel" : existingCleaning ? "Schedule Another Cleaning" : "Schedule Cleaning"}
      </button>

      {isOpen && (
        <div style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "clamp(1rem, 4vw, 2rem)",
          boxShadow: "0 8px 28px rgba(15, 23, 42, 0.06)",
          border: "1px solid #e5e7eb",
          marginBottom: "2rem",
          width: "100%",
          boxSizing: "border-box"
        }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
            {isRescheduling ? "Reschedule Your Cleaning" : "Schedule Your Bin Cleaning"}
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
                  padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "clamp(0.95rem, 2vw, 1rem)",
                  minHeight: "44px",
                  boxSizing: "border-box"
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
                  padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "clamp(0.95rem, 2vw, 1rem)",
                  minHeight: "44px",
                  boxSizing: "border-box"
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

            {isRescheduling && existingCleaningDate && !canRescheduleExisting && (
              <div style={{
                padding: "0.75rem 1rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                fontSize: "0.875rem",
                marginTop: "0.5rem"
              }}>
                ⚠️ You can only reschedule a cleaning more than 12 hours before the scheduled date. 
                Please contact support if you need to change this cleaning.
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !selectedDateValue || !selectedTime || (isRescheduling && existingCleaningDate ? !canRescheduleExisting : false)}
              className={`btn btn-primary ${loading ? "disabled" : ""}`}
              style={{
                width: "100%",
                marginTop: "0.5rem",
                cursor: (loading || (isRescheduling && existingCleaningDate ? !canRescheduleExisting : false)) ? "not-allowed" : "pointer",
                opacity: (loading || (isRescheduling && existingCleaningDate ? !canRescheduleExisting : false)) ? 0.6 : 1
              }}
            >
              {loading ? (isRescheduling ? "Rescheduling..." : "Scheduling...") : (isRescheduling ? "Update Schedule" : "Schedule Cleaning")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

