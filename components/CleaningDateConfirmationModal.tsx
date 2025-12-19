// components/CleaningDateConfirmationModal.tsx
"use client";

import React, { useState } from "react";

interface PendingCleaningData {
  preferredServiceDate: string;
  preferredDayOfWeek?: string;
  preferredTimeWindow: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  notes?: string;
}

interface CleaningDateConfirmationModalProps {
  isOpen: boolean;
  pendingCleaningData: PendingCleaningData;
  userId: string;
  userEmail: string;
  userData: {
    firstName?: string;
    lastName?: string;
    selectedPlan?: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
  onClearPending?: () => void;
  onChangeDate?: () => void; // Callback to handle "Change Date" - scroll to form, etc.
}

export function CleaningDateConfirmationModal({
  isOpen,
  pendingCleaningData,
  userId,
  userEmail,
  userData,
  onConfirm,
  onCancel,
  onClearPending,
  onChangeDate,
}: CleaningDateConfirmationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      const { getDbInstance } = await import("@/lib/firebase");
      const db = await getDbInstance();
      
      if (!db) {
        throw new Error("Firebase is not configured");
      }

      const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
      const firestore = await safeImportFirestore();
      const { collection, doc, setDoc, serverTimestamp, updateDoc } = firestore;

      // Create scheduled cleaning
      const cleaningRef = doc(collection(db, "scheduledCleanings"));
      const preferredDate = new Date(pendingCleaningData.preferredServiceDate);
      
      // Extract day of week from preferred date if not provided
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      const preferredDayOfWeek = pendingCleaningData.preferredDayOfWeek || dayNames[preferredDate.getDay()];
      
      await setDoc(cleaningRef, {
        userId,
        userEmail: userEmail.toLowerCase(),
        customerName: `${userData.firstName || ""} ${userData.lastName || ""}`.trim(),
        addressLine1: pendingCleaningData.addressLine1,
        addressLine2: pendingCleaningData.addressLine2 || null,
        city: pendingCleaningData.city,
        state: pendingCleaningData.state,
        zipCode: pendingCleaningData.zipCode,
        scheduledDate: preferredDate.toISOString().split('T')[0],
        scheduledTime: pendingCleaningData.preferredTimeWindow,
        trashDay: preferredDayOfWeek,
        status: "upcoming",
        notes: pendingCleaningData.notes || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Remove pending cleaning data from user document
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        pendingCleaningConfirmation: false,
        pendingCleaningData: null,
        updatedAt: serverTimestamp(),
      });

      // Send confirmation email
      try {
        const { notifyCleaningScheduled } = await import("@/lib/email-utils");
        const { PLAN_CONFIGS } = await import("@/lib/stripe-config");
        
        const planName = userData.selectedPlan && userData.selectedPlan in PLAN_CONFIGS
          ? PLAN_CONFIGS[userData.selectedPlan as keyof typeof PLAN_CONFIGS].name
          : "Your Plan";
        
        notifyCleaningScheduled({
          email: userEmail,
          firstName: userData.firstName || "",
          lastName: userData.lastName || "",
          scheduledDate: preferredDate.toISOString().split('T')[0],
          scheduledTime: pendingCleaningData.preferredTimeWindow,
          addressLine1: pendingCleaningData.addressLine1,
          addressLine2: pendingCleaningData.addressLine2,
          city: pendingCleaningData.city,
          state: pendingCleaningData.state,
          zipCode: pendingCleaningData.zipCode,
          preferredDayOfWeek: preferredDayOfWeek,
          planName,
        }).catch((emailErr) => {
          console.error("[CleaningDateConfirmationModal] Failed to send confirmation email:", emailErr);
        });
      } catch (emailErr) {
        console.error("[CleaningDateConfirmationModal] Error sending confirmation email:", emailErr);
      }

      setLoading(false);
      onConfirm();
    } catch (err: any) {
      console.error("Error confirming cleaning date:", err);
      setError(err.message || "Failed to confirm cleaning date. Please try again.");
      setLoading(false);
    }
  };

  // Parse the date - handle both ISO string and date string formats
  let scheduledDate: Date;
  try {
    scheduledDate = new Date(pendingCleaningData.preferredServiceDate);
    // Validate the date
    if (isNaN(scheduledDate.getTime())) {
      throw new Error("Invalid date");
    }
  } catch (err) {
    console.error("[CleaningDateConfirmationModal] Invalid date:", pendingCleaningData.preferredServiceDate);
    scheduledDate = new Date(); // Fallback to today
  }
  
  const formattedDate = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Don't allow closing by clicking outside - user must confirm or cancel
        }
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            background: "#16a34a",
            borderTopLeftRadius: "12px",
            borderTopRightRadius: "12px",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#ffffff" }}>
            Confirm Your Cleaning Date
          </h2>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          <p style={{ margin: "0 0 20px 0", fontSize: "16px", color: "#374151", lineHeight: "1.6" }}>
            Great! We're ready to schedule your first cleaning. Please confirm the details below:
          </p>

          {/* Cleaning Details */}
          <div style={{
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            padding: "20px",
            marginBottom: "20px",
          }}>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Date:</span>
              <span style={{ fontSize: "16px", fontWeight: "600", color: "#111827", marginLeft: "8px" }}>
                {formattedDate}
              </span>
            </div>
            <div style={{ marginBottom: "12px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Time Window:</span>
              <span style={{ fontSize: "16px", color: "#111827", marginLeft: "8px" }}>
                {pendingCleaningData.preferredTimeWindow}
              </span>
            </div>
            {pendingCleaningData.preferredDayOfWeek && (
              <div style={{ marginBottom: "12px" }}>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Monthly Schedule:</span>
                <span style={{ fontSize: "16px", color: "#111827", marginLeft: "8px" }}>
                  Every {pendingCleaningData.preferredDayOfWeek}
                </span>
              </div>
            )}
            <div>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#6b7280" }}>Address:</span>
              <div style={{ fontSize: "14px", color: "#111827", marginTop: "4px" }}>
                {pendingCleaningData.addressLine1}
                {pendingCleaningData.addressLine2 && <>, {pendingCleaningData.addressLine2}</>}
                <br />
                {pendingCleaningData.city}, {pendingCleaningData.state} {pendingCleaningData.zipCode}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              padding: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              color: "#dc2626",
              fontSize: "14px",
              marginBottom: "20px",
            }}>
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: "flex", gap: "12px" }}>
            <button
              onClick={() => {
                // Don't clear pending data - just close modal and scroll to form
                // The pending data will be cleared when they actually schedule a cleaning
                // Call onChangeDate first to scroll, then close modal
                if (onChangeDate) {
                  onChangeDate();
                }
                // Small delay to ensure scroll happens before modal closes
                setTimeout(() => {
                  onCancel();
                }, 100);
              }}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "#f3f4f6",
                color: "#374151",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              Change Date
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                flex: 1,
                padding: "12px 24px",
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Confirming..." : "Confirm & Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
