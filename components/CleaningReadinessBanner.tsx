"use client";

import {
  CURB_PLACEMENT_MESSAGE,
  STAFF_CURB_REMINDER,
  TRASH_CAN_PREP_REMINDER,
} from "@/lib/cleaning-readiness";

type Variant = "customer" | "staff" | "compact";

export function CleaningReadinessBanner({ variant = "customer" }: { variant?: Variant }) {
  const message =
    variant === "staff"
      ? STAFF_CURB_REMINDER
      : variant === "compact"
        ? "Trash cans must be at the curb during your scheduled window."
        : CURB_PLACEMENT_MESSAGE;

  const background = variant === "staff" ? "#eff6ff" : "#fff7ed";
  const border = variant === "staff" ? "#bfdbfe" : "#fed7aa";
  const color = variant === "staff" ? "#1e3a8a" : "#9a3412";

  return (
    <div
      style={{
        padding: variant === "compact" ? "0.75rem 1rem" : "1rem 1.125rem",
        background,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        marginBottom: variant === "compact" ? "0.75rem" : "1rem",
      }}
    >
      <div
        style={{
          fontWeight: "700",
          color,
          marginBottom: variant === "compact" ? "0.15rem" : "0.35rem",
          fontSize: variant === "compact" ? "0.8125rem" : "0.9rem",
        }}
      >
        {variant === "staff" ? "Before You Start" : "Trash Can Reminder"}
      </div>
      <div style={{ color, fontSize: variant === "compact" ? "0.8125rem" : "0.875rem", lineHeight: 1.5 }}>
        {message}
      </div>
      {variant === "customer" && (
        <div style={{ color: "#7c2d12", fontSize: "0.8125rem", marginTop: "0.5rem" }}>
          {TRASH_CAN_PREP_REMINDER}
        </div>
      )}
    </div>
  );
}

export function CleaningJobPrepDetails({
  binsCount,
  scheduledTime,
  trashDay,
  notes,
  internalNotes,
  showInternalNotes = false,
}: {
  binsCount?: number;
  scheduledTime?: string;
  trashDay?: string;
  notes?: string;
  internalNotes?: string;
  showInternalNotes?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "0.5rem" }}>
      <div style={{ fontSize: "0.8125rem", color: "#374151" }}>
        <strong>Bins to clean:</strong> {binsCount || 1}
      </div>
      {scheduledTime && (
        <div style={{ fontSize: "0.8125rem", color: "#374151" }}>
          <strong>Time window:</strong> {scheduledTime}
        </div>
      )}
      {trashDay && (
        <div style={{ fontSize: "0.8125rem", color: "#374151" }}>
          <strong>Trash day:</strong> {trashDay}
        </div>
      )}
      {notes && (
        <div style={{ fontSize: "0.8125rem", color: "#6b7280", fontStyle: "italic" }}>
          <strong>Customer notes:</strong> {notes}
        </div>
      )}
      {showInternalNotes && internalNotes && (
        <div style={{ fontSize: "0.8125rem", color: "#6b7280" }}>
          <strong>Internal notes:</strong> {internalNotes}
        </div>
      )}
      <div style={{ fontSize: "0.75rem", color: "#c2410c", fontWeight: "600" }}>
        Curb placement required
      </div>
    </div>
  );
}
