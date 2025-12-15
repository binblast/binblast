// components/EmployeeDashboard/StickerConfirmation.tsx
"use client";

import { useState } from "react";

export type StickerStatus = "existing" | "placed" | "none";

interface StickerConfirmationProps {
  onStatusChange: (status: StickerStatus) => void;
  currentStatus?: StickerStatus;
}

export function StickerConfirmation({
  onStatusChange,
  currentStatus,
}: StickerConfirmationProps) {
  const [status, setStatus] = useState<StickerStatus>(
    currentStatus || "none"
  );

  const handleStatusChange = (newStatus: StickerStatus) => {
    setStatus(newStatus);
    onStatusChange(newStatus);
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "0.875rem",
          fontWeight: "600",
          marginBottom: "0.75rem",
          color: "#111827",
        }}
      >
        Bin Blast Sticker Status <span style={{ color: "#dc2626" }}>*</span>
      </label>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem",
            background: status === "existing" ? "#eff6ff" : "#f9fafb",
            border: `2px solid ${status === "existing" ? "#3b82f6" : "#e5e7eb"}`,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <input
            type="radio"
            name="sticker-status"
            value="existing"
            checked={status === "existing"}
            onChange={() => handleStatusChange("existing")}
            style={{
              width: "20px",
              height: "20px",
              cursor: "pointer",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
              ✓ Customer Already Has Sticker
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              The bin already has a Bin Blast sticker
            </div>
          </div>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem",
            background: status === "placed" ? "#f0fdf4" : "#f9fafb",
            border: `2px solid ${status === "placed" ? "#16a34a" : "#e5e7eb"}`,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <input
            type="radio"
            name="sticker-status"
            value="placed"
            checked={status === "placed"}
            onChange={() => handleStatusChange("placed")}
            style={{
              width: "20px",
              height: "20px",
              cursor: "pointer",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
              I Placed a Sticker
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              I placed a new Bin Blast sticker on the bin
            </div>
          </div>
        </label>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem",
            background: status === "none" ? "#fef3c7" : "#f9fafb",
            border: `2px solid ${status === "none" ? "#f59e0b" : "#e5e7eb"}`,
            borderRadius: "8px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          <input
            type="radio"
            name="sticker-status"
            value="none"
            checked={status === "none"}
            onChange={() => handleStatusChange("none")}
            style={{
              width: "20px",
              height: "20px",
              cursor: "pointer",
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
              No Sticker Needed
            </div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
              Sticker not applicable for this job
            </div>
          </div>
        </label>
      </div>

      {status === "none" && (
        <div
          style={{
            marginTop: "0.75rem",
            padding: "0.75rem",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            fontSize: "0.75rem",
            color: "#92400e",
          }}
        >
          Note: Most jobs require a Bin Blast sticker. Please confirm this is correct.
        </div>
      )}
    </div>
  );
}

