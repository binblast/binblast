// components/ScheduleCleaningForm.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useFirebase } from "@/lib/firebase-context";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import { CleaningLimitModal } from "@/components/CleaningLimitModal";
import { PLAN_CONFIGS, type PlanId } from "@/lib/stripe-config";
import {
  buildRecurringPreferenceUpdate,
  formatRecurringScheduleSummary,
  getPlanRecurringHint,
  getNextOccurrenceOfWeekday,
  formatDateForFormInput,
} from "@/lib/recurring-preference";
import {
  canModifyScheduledCleaning,
  getSchedulingPolicyState,
  MODIFY_LOCK_HOURS,
  UPGRADE_MIN_HOURS,
} from "@/lib/cleaning-scheduling-policy";
import {
  getTimeSlotsForDate,
  isSunday,
  normalizeTrashDay,
  validateBusinessSchedule,
} from "@/lib/business-hours";

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
  initialOpenForNewCleaning?: boolean;
  onInitialOpenHandled?: () => void;
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
    binsCount?: number;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    cleaningCredits?: number;
    preferredDayOfWeek?: string;
    preferredTimeWindow?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  } | null;
}

interface EligibilityState {
  planName: string;
  scheduledCount: number;
  baseAllowance: number;
  canScheduleAnother: boolean;
  oneTimePrice: number;
  upgradeBlockedReason?: string | null;
  upgradePreview: {
    newPlanId: string;
    newPlanName: string;
    newPlanPrice: number;
    proratedAmount: number;
    daysRemaining: number;
    cleaningCreditsRollover: number;
  } | null;
}


function isPlanLimitMessage(message?: string | null): boolean {
  if (!message) return false;
  return message.toLowerCase().includes("plan limit");
}

export function ScheduleCleaningForm({ userId, userEmail, onScheduleCreated, initialOpenForNewCleaning = false, onInitialOpenHandled, existingCleaning, userData }: ScheduleCleaningFormProps) {
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

  // Helper function to format date for input (must be defined before use)
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
    if (userData?.preferredDayOfWeek) {
      try {
        return formatDateForFormInput(getNextOccurrenceOfWeekday(userData.preferredDayOfWeek));
      } catch {
        return "";
      }
    }
    return "";
  };

  const [zipCode, setZipCode] = useState(existingCleaning?.zipCode || userData?.zipCode || "");
  const [city, setCity] = useState(existingCleaning?.city || userData?.city || "");
  const [state, setState] = useState(existingCleaning?.state || userData?.state || "");
  const [trashDay, setTrashDay] = useState(existingCleaning?.trashDay || userData?.preferredDayOfWeek || "");
  const [selectedDateValue, setSelectedDateValue] = useState(getInitialDate()); // Store the actual date value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isReady: firebaseReady } = useFirebase();
  
  // Form fields
  const [addressLine1, setAddressLine1] = useState(existingCleaning?.addressLine1 || userData?.addressLine1 || "");
  const [addressLine2, setAddressLine2] = useState(existingCleaning?.addressLine2 || userData?.addressLine2 || "");
  const [selectedTime, setSelectedTime] = useState(existingCleaning?.scheduledTime || userData?.preferredTimeWindow || "");
  const [notes, setNotes] = useState(existingCleaning?.notes || "");
  const [binsCount, setBinsCount] = useState(
    (existingCleaning as { binsCount?: number } | null | undefined)?.binsCount ||
      userData?.binsCount ||
      1
  );
  const [isRescheduling, setIsRescheduling] = useState(!!existingCleaning);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityState | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);
  const [planLimitState, setPlanLimitState] = useState<{
    isAtLimit: boolean;
    oneTimePrice: number;
  } | null>(null);

  const checkScheduleEligibility = useCallback(async (scheduledDate?: string): Promise<EligibilityState | null> => {
    try {
      const params = new URLSearchParams({ userId, intent: "add_cleaning" });
      if (scheduledDate) {
        params.set("scheduledDate", scheduledDate);
      }
      const response = await fetch(
        `/api/customer/cleaning-schedule-eligibility?${params.toString()}`
      );
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      return {
        planName: data.planName,
        scheduledCount: data.allocation?.scheduledCount || 0,
        baseAllowance: data.allocation?.baseAllowance || 0,
        canScheduleAnother: Boolean(data.allocation?.canScheduleAnother),
        oneTimePrice: data.options?.oneTimeCleaning?.price ?? 35,
        upgradeBlockedReason: data.options?.upgradeBlockedReason || null,
        upgradePreview: data.options?.upgradeToBiWeekly || null,
      };
    } catch (err) {
      console.error("[ScheduleCleaningForm] Eligibility check failed:", err);
      return null;
    }
  }, [userId]);

  const buildLimitEligibility = useCallback(
    (partial?: Partial<EligibilityState> | null): EligibilityState => {
      const planId = (userData?.selectedPlan as PlanId) || "one-time";
      const planConfig = PLAN_CONFIGS[planId in PLAN_CONFIGS ? planId : "one-time"];
      const fallbackUpgrade =
        planId === "one-time"
          ? {
              newPlanId: "twice-month",
              newPlanName: PLAN_CONFIGS["twice-month"].name,
              newPlanPrice: PLAN_CONFIGS["twice-month"].price,
              proratedAmount: 0,
              daysRemaining: 0,
              cleaningCreditsRollover: 0,
            }
          : null;

      return {
        planName: partial?.planName || planConfig.name,
        scheduledCount: partial?.scheduledCount ?? eligibility?.scheduledCount ?? 1,
        baseAllowance: partial?.baseAllowance ?? eligibility?.baseAllowance ?? 1,
        canScheduleAnother: false,
        oneTimePrice: partial?.oneTimePrice ?? planLimitState?.oneTimePrice ?? planConfig.price,
        upgradeBlockedReason:
          partial?.upgradeBlockedReason ?? eligibility?.upgradeBlockedReason ?? null,
        upgradePreview:
          partial?.upgradePreview ?? eligibility?.upgradePreview ?? fallbackUpgrade,
      };
    },
    [eligibility, planLimitState?.oneTimePrice, userData?.selectedPlan]
  );

  const presentPlanLimitOptions = useCallback(
    async (partial?: Partial<EligibilityState> | null) => {
      let resolved = partial ?? null;

      if (!resolved?.upgradePreview || resolved.oneTimePrice == null) {
        const general = await checkScheduleEligibility();
        resolved = {
          ...general,
          ...resolved,
          upgradePreview: resolved?.upgradePreview ?? general?.upgradePreview ?? null,
          oneTimePrice: resolved?.oneTimePrice ?? general?.oneTimePrice,
          planName: resolved?.planName ?? general?.planName,
          scheduledCount: resolved?.scheduledCount ?? general?.scheduledCount,
          baseAllowance: resolved?.baseAllowance ?? general?.baseAllowance,
          upgradeBlockedReason:
            resolved?.upgradeBlockedReason ?? general?.upgradeBlockedReason ?? null,
        };
      }

      setEligibility(buildLimitEligibility(resolved));
      setShowLimitModal(true);
      setError(null);
    },
    [buildLimitEligibility, checkScheduleEligibility]
  );

  const refreshPlanLimitState = useCallback(async () => {
    const result = await checkScheduleEligibility();
    if (result) {
      setEligibility(result);
      setPlanLimitState({
        isAtLimit: !result.canScheduleAnother,
        oneTimePrice: result.oneTimePrice,
      });
    }
    return result;
  }, [checkScheduleEligibility]);

  useEffect(() => {
    refreshPlanLimitState();
  }, [refreshPlanLimitState]);

  const handleScheduleAnotherClick = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setCheckingEligibility(true);
    await refreshPlanLimitState();
    setCheckingEligibility(false);
    setIsRescheduling(false);
    setIsOpen(true);
  };

  useEffect(() => {
    if (!initialOpenForNewCleaning) return;

    let cancelled = false;

    async function openAfterEligibilityCheck() {
      const result = await refreshPlanLimitState();
      if (cancelled) return;

      setIsRescheduling(false);
      setIsOpen(true);
      onInitialOpenHandled?.();
    }

    openAfterEligibilityCheck();

    return () => {
      cancelled = true;
    };
  }, [initialOpenForNewCleaning, onInitialOpenHandled, refreshPlanLimitState, userId]);

  // Update form fields when existingCleaning prop changes (e.g., when pending data is available)
  useEffect(() => {
    if (existingCleaning) {
      setAddressLine1(existingCleaning.addressLine1 || "");
      setAddressLine2(existingCleaning.addressLine2 || "");
      setCity(existingCleaning.city || "");
      setState(existingCleaning.state || "");
      setZipCode(existingCleaning.zipCode || "");
      setTrashDay(existingCleaning.trashDay || "");
      setSelectedTime(existingCleaning.scheduledTime || "");
      setNotes(existingCleaning.notes || "");
      setIsRescheduling(!!existingCleaning.id); // Only rescheduling if it has an ID (existing cleaning)
      
      // Update date
      if (existingCleaning.scheduledDate) {
        try {
          const date = parseDate(existingCleaning.scheduledDate);
          setSelectedDateValue(formatDateForInput(date));
        } catch (e) {
          console.error("[ScheduleCleaningForm] Error parsing date:", e);
        }
      }
    }
  }, [existingCleaning]);

  // Pre-select the customer's recurring day when they have no upcoming visit yet.
  useEffect(() => {
    if (existingCleaning?.id || existingCleaning?.scheduledDate) return;
    if (!userData?.preferredDayOfWeek || selectedDateValue) return;

    try {
      const nextDate = getNextOccurrenceOfWeekday(userData.preferredDayOfWeek);
      setSelectedDateValue(formatDateForFormInput(nextDate));
      setTrashDay(userData.preferredDayOfWeek);
    } catch (error) {
      console.error("[ScheduleCleaningForm] Could not pre-fill recurring day:", error);
    }
  }, [existingCleaning, userData?.preferredDayOfWeek, selectedDateValue]);

  const recurringScheduleSummary = formatRecurringScheduleSummary(
    userData?.selectedPlan,
    trashDay || userData?.preferredDayOfWeek
  );
  const recurringHint = getPlanRecurringHint(
    userData?.selectedPlan,
    trashDay || userData?.preferredDayOfWeek
  );

  const syncUserRecurringPreference = async (
    firestore: Awaited<ReturnType<typeof import("@/lib/firebase-module-loader").safeImportFirestore>>,
    db: NonNullable<Awaited<ReturnType<typeof import("@/lib/firebase").getDbInstance>>>
  ) => {
    if (!trashDay) return;
    const { doc, updateDoc, serverTimestamp } = firestore;
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, {
      ...buildRecurringPreferenceUpdate({
        preferredDayOfWeek: trashDay,
        preferredTimeWindow: selectedTime,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        zipCode,
      }),
      pendingCleaningConfirmation: false,
      pendingCleaningData: null,
      updatedAt: serverTimestamp(),
    });
  };

  // Reschedule/cancel lock: must be at least 24 hours before the scheduled window starts.
  const canReschedule = (cleaningDate: Date, scheduledTime?: string): boolean => {
    return canModifyScheduledCleaning(cleaningDate, scheduledTime);
  };

  // Generate dropdown options for each day within 2-week window
  const getDayOptions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksFromNow = new Date(today);
    twoWeeksFromNow.setDate(today.getDate() + 14);
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const options: Array<{ dayName: string; date: Date; value: string; label: string }> = [];
    const usedValues = new Set<string>();
    
    // If there's an existing cleaning date, include it even if it's outside the normal window
    if (existingCleaning?.scheduledDate) {
      try {
        const existingDate = parseDate(existingCleaning.scheduledDate);
        const existingDateValue = formatDateForInput(existingDate);
        const dayName = existingDate.toLocaleDateString("en-US", { weekday: "long" });
        const monthName = existingDate.toLocaleDateString("en-US", { month: "short" });
        const dayNumber = existingDate.getDate();
        
        options.push({
          dayName,
          date: existingDate,
          value: existingDateValue,
          label: `${dayName}, ${monthName} ${dayNumber} (Current)`
        });
        usedValues.add(existingDateValue);
      } catch (e) {
        console.error("Error parsing existing cleaning date:", e);
      }
    }
    
    // For each day of the week, find the next occurrence within 2 weeks
    dayNames.forEach((dayName, dayIndex) => {
      if (dayIndex === 0) return;
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
      
      if (firstOccurrence > today && firstOccurrence <= twoWeeksFromNow && !usedValues.has(firstDateValue)) {
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
        usedValues.add(dateValue);
      }
      
      // Also check the second occurrence (next week) if within 2 weeks
      const secondOccurrence = new Date(firstOccurrence);
      secondOccurrence.setDate(firstOccurrence.getDate() + 7);
      secondOccurrence.setHours(0, 0, 0, 0);
      
      // Only include if date is in the future (not today), and within 2 weeks
      const secondDateValue = formatDateForInput(secondOccurrence);
      
      if (secondOccurrence > today && secondOccurrence <= twoWeeksFromNow && !usedValues.has(secondDateValue)) {
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
        usedValues.add(dateValue);
      }
    });
    
    // Sort by date
    options.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    return options;
  };

  // Memoize dayOptions to ensure consistency when selectedDateValue changes
  const dayOptions = useMemo(() => getDayOptions(), [selectedDateValue, existingCleaning?.scheduledDate]);

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
      setTrashDay(normalizeTrashDay(selectedOption.dayName));
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

    if (isSunday(selectedDateValue)) {
      setError("We're closed on Sundays. Please choose another day.");
      return;
    }

    const scheduleCheck = validateBusinessSchedule(selectedDateValue, selectedTime);
    if (!scheduleCheck.valid) {
      setError(scheduleCheck.error || "Invalid schedule selection.");
      return;
    }

    // Check 24-hour advance requirement for rescheduling
    if (isRescheduling && existingCleaning?.scheduledDate) {
      const existingDate = parseDate(existingCleaning.scheduledDate);

      if (!canReschedule(existingDate, existingCleaning.scheduledTime)) {
        setError(
          `Changes must be made at least ${MODIFY_LOCK_HOURS} hours before the scheduled cleaning time.`
        );
        return;
      }
    }

    // Don't submit if Firebase is not ready
    if (!firebaseReady) {
      setError("Firebase is not ready. Please wait a moment and try again.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let eligibilityResult: EligibilityState | null = null;

      if (!isRescheduling) {
        eligibilityResult = await checkScheduleEligibility(selectedDateValue);
        const atLimit =
          (eligibilityResult && !eligibilityResult.canScheduleAnother) ||
          (!eligibilityResult && planLimitState?.isAtLimit);

        if (atLimit) {
          await presentPlanLimitOptions(eligibilityResult);
          setLoading(false);
          return;
        }
      }

      const { getDbInstance } = await import("@/lib/firebase");
      const db = await getDbInstance();
      
      if (!db) {
        throw new Error("Firebase is not configured");
      }
      
      // CRITICAL: Use safe import wrapper to ensure Firebase app exists
      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { doc, updateDoc, serverTimestamp } = firestore;

      // Use the selected date value directly
      const scheduledDate = selectedDateValue;

      // Update existing cleaning
      if (existingCleaning && isRescheduling) {
        const updateResponse = await fetch(`/api/cleanings/${existingCleaning.id}/update`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            trashDay,
            scheduledDate,
            scheduledTime: selectedTime,
            notes,
          }),
        });

        const updateData = await updateResponse.json();
        if (!updateResponse.ok) {
          throw new Error(updateData.error || "Failed to reschedule cleaning");
        }

        await syncUserRecurringPreference(firestore, db);
        
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
            binsCount: Number(binsCount) || 1,
          }).catch((emailErr) => {
            console.error("[ScheduleCleaningForm] Failed to send confirmation email:", emailErr);
          });

          const { requestCleaningSmsNotification } = await import("@/lib/cleaning-notification-client");
          requestCleaningSmsNotification({
            userId,
            scheduledDate,
            scheduledTime: selectedTime,
            addressLine1,
            city,
            state,
          });
        } catch (emailErr) {
          console.error("[ScheduleCleaningForm] Error sending confirmation email:", emailErr);
        }
      } else {
        const scheduleResponse = await fetch("/api/customer/schedule-cleaning", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            userEmail,
            addressLine1,
            addressLine2,
            city,
            state,
            zipCode,
            trashDay,
            scheduledDate,
            scheduledTime: selectedTime,
            notes,
            binsCount: Number(binsCount) || 1,
          }),
        });

        const scheduleData = await scheduleResponse.json();
        if (!scheduleResponse.ok) {
          if (scheduleResponse.status === 403 || isPlanLimitMessage(scheduleData.error)) {
            const refreshedEligibility = await checkScheduleEligibility(selectedDateValue);
            await presentPlanLimitOptions(refreshedEligibility);
            setLoading(false);
            return;
          }
          throw new Error(scheduleData.error || "Failed to schedule cleaning");
        }
        
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
            binsCount: Number(binsCount) || 1,
          }).catch((emailErr) => {
            console.error("[ScheduleCleaningForm] Failed to send confirmation email:", emailErr);
          });

          const { requestCleaningSmsNotification } = await import("@/lib/cleaning-notification-client");
          requestCleaningSmsNotification({
            userId,
            scheduledDate,
            scheduledTime: selectedTime,
            addressLine1,
            city,
            state,
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
      if (isPlanLimitMessage(err.message)) {
        await presentPlanLimitOptions(eligibility);
        return;
      }
      setError(err.message || "Failed to schedule cleaning. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const timeSlots = useMemo(
    () => (selectedDateValue ? getTimeSlotsForDate(selectedDateValue) : []),
    [selectedDateValue]
  );

  useEffect(() => {
    if (selectedDateValue && timeSlots.length > 0 && !timeSlots.includes(selectedTime)) {
      setSelectedTime(timeSlots[0]);
    }
  }, [selectedDateValue, timeSlots, selectedTime]);

  // Get existing cleaning date info for display
  const existingCleaningDate = existingCleaning?.scheduledDate ? parseDate(existingCleaning.scheduledDate) : null;
  const reschedulePolicy = getSchedulingPolicyState(
    existingCleaning?.scheduledDate,
    existingCleaning?.scheduledTime
  );
  const canRescheduleExisting = existingCleaningDate
    ? canReschedule(existingCleaningDate, existingCleaning?.scheduledTime)
    : true;

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
                })}
              </p>
            </div>
            <button
              onClick={() => {
                if (!canRescheduleExisting) return;
                setIsOpen(true);
                setIsRescheduling(true);
              }}
              className="btn btn-primary"
              disabled={!canRescheduleExisting}
              style={{ 
                padding: "0.5rem 1rem",
                fontSize: "0.875rem",
                whiteSpace: "nowrap",
                opacity: canRescheduleExisting ? 1 : 0.6,
                cursor: canRescheduleExisting ? "pointer" : "not-allowed",
              }}
            >
              Reschedule
            </button>
          </div>
          {!canRescheduleExisting && reschedulePolicy.message ? (
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.8125rem", color: "#92400e", lineHeight: 1.5 }}>
              {reschedulePolicy.message}
            </p>
          ) : null}
        </div>
      )}
      
      <div className="customer-schedule-actions">
        <button
          onClick={handleScheduleAnotherClick}
          className="btn btn-primary customer-schedule-actions__primary"
          disabled={checkingEligibility}
        >
          {checkingEligibility
            ? "Checking..."
            : isOpen
              ? "Cancel"
              : existingCleaning
                ? "Schedule another cleaning"
                : "Schedule cleaning"}
        </button>
        {planLimitState?.isAtLimit && !isOpen ? (
          <p className="customer-schedule-actions__hint">
            Your monthly cleaning is already scheduled. Purchase an extra cleaning at full price or upgrade
            your plan to add another visit this month.
          </p>
        ) : null}
      </div>

      {showLimitModal && eligibility && (
        <CleaningLimitModal
          isOpen={showLimitModal}
          onClose={() => setShowLimitModal(false)}
          planName={eligibility.planName}
          scheduledCount={eligibility.scheduledCount}
          baseAllowance={eligibility.baseAllowance}
          oneTimePrice={eligibility.oneTimePrice}
          upgradePreview={eligibility.upgradePreview}
          upgradeBlockedReason={eligibility.upgradeBlockedReason}
          userId={userId}
          onPurchaseComplete={() => {
            setShowLimitModal(false);
          }}
          onUpgradeComplete={() => {
            setShowLimitModal(false);
            window.location.reload();
          }}
        />
      )}

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

          <CleaningReadinessBanner variant="customer" />

          <p className="customer-dash-recurring-note">
            {recurringScheduleSummary ? (
              <>
                Your recurring schedule is <strong>{recurringScheduleSummary}</strong>. {recurringHint}
              </>
            ) : (
              recurringHint
            )}{" "}
            Extra visits beyond your plan require payment at your plan rate. Rescheduling and cancellation are locked
            within {MODIFY_LOCK_HOURS} hours of a visit. On the day of your cleaning, cancellation is also locked within{" "}
            {UPGRADE_MIN_HOURS} hours, but plan upgrades remain available.
          </p>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Recurring cleaning day */}
            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Recurring Cleaning Day
              </label>
              <select
                key={`day-select-${selectedDateValue}`}
                value={selectedDateValue || ""}
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
                <option value="">Select your recurring cleaning day</option>
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
                  {trashDay && userData?.selectedPlan
                    ? ` · ${formatRecurringScheduleSummary(userData.selectedPlan, trashDay) ?? `Repeats every ${trashDay}`}`
                    : trashDay
                      ? ` · Repeats every ${trashDay}`
                      : ""}
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
                Number of Trash Cans
              </label>
              <input
                type="number"
                min={1}
                value={binsCount}
                onChange={(e) => setBinsCount(Math.max(1, Number(e.target.value) || 1))}
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "var(--text-dark)" }}>
                Special Instructions <span style={{ color: "var(--text-light)", fontWeight: "400" }}>(optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Gate codes, bin location, pets, or other access notes. Trash cans must be at the curb during your scheduled window."
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

            {!isRescheduling && planLimitState?.isAtLimit ? (
              <div style={{
                padding: "0.75rem 1rem",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: "8px",
                color: "#92400e",
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}>
                This month is already at your plan limit. Submitting will offer a one-time purchase at full
                price or a plan upgrade before another visit can be added.
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading || !selectedDateValue || !selectedTime || (isRescheduling && existingCleaningDate ? !canRescheduleExisting : false)}
              className={`btn btn-primary ${loading ? "disabled" : ""}`}
              style={{
                width: "100%",
                marginTop: "0.5rem",
                cursor: (loading || !selectedDateValue || !selectedTime || (isRescheduling && existingCleaningDate ? !canRescheduleExisting : false)) ? "not-allowed" : "pointer",
                opacity: (loading || !selectedDateValue || !selectedTime || (isRescheduling && existingCleaningDate ? !canRescheduleExisting : false)) ? 0.6 : 1
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

