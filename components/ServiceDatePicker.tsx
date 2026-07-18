"use client";

import { useMemo, useState } from "react";
import {
  formatDateInput,
  getBusinessHoursHint,
  isDateSelectable,
  isSaturday,
  isSunday,
  parseLocalDate,
} from "@/lib/business-hours";

interface ServiceDatePickerProps {
  value: string;
  onChange: (dateValue: string) => void;
  minDate?: string;
  error?: string;
}

export function ServiceDatePicker({
  value,
  onChange,
  minDate,
  error,
}: ServiceDatePickerProps) {
  const min = minDate || formatDateInput(new Date());
  const initialMonth = value ? parseLocalDate(value) : parseLocalDate(min);
  const [viewMonth, setViewMonth] = useState(
    new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1)
  );

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const weeks = useMemo(() => {
    const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(firstOfMonth);
    start.setDate(start.getDate() - start.getDay());

    const rows: Date[][] = [];
    let cursor = new Date(start);

    for (let week = 0; week < 6; week += 1) {
      const row: Date[] = [];
      for (let day = 0; day < 7; day += 1) {
        row.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      rows.push(row);
    }

    return rows;
  }, [viewMonth]);

  const shiftMonth = (delta: number) => {
    setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const handleSelect = (date: Date) => {
    const dateValue = formatDateInput(date);
    if (!isDateSelectable(dateValue, parseLocalDate(min))) return;
    onChange(dateValue);
  };

  return (
    <div>
      <div
        style={{
          border: `1px solid ${error ? "#dc2626" : "#d1d5db"}`,
          borderRadius: "8px",
          padding: "12px",
          background: "#ffffff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "12px",
          }}
        >
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            style={navButtonStyle}
          >
            ‹
          </button>
          <strong style={{ fontSize: "14px", color: "#111827" }}>{monthLabel}</strong>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            style={navButtonStyle}
          >
            ›
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: "4px",
            marginBottom: "4px",
          }}
        >
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label, index) => (
            <div
              key={label}
              style={{
                textAlign: "center",
                fontSize: "11px",
                fontWeight: "700",
                color: index === 0 || index === 6 ? "#dc2626" : "#6b7280",
                padding: "4px 0",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          {weeks.map((week, weekIndex) => (
            <div
              key={weekIndex}
              style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}
            >
              {week.map((date) => {
                const dateValue = formatDateInput(date);
                const inMonth = date.getMonth() === viewMonth.getMonth();
                const selectable = isDateSelectable(dateValue, parseLocalDate(min));
                const selected = value === dateValue;
                const closedSunday = isSunday(dateValue);
                const weekend = isSaturday(dateValue) || closedSunday;

                return (
                  <button
                    key={dateValue}
                    type="button"
                    disabled={!selectable}
                    onClick={() => handleSelect(date)}
                    aria-label={dateValue}
                    style={{
                      border: selected ? "2px solid #2563eb" : "1px solid transparent",
                      borderRadius: "8px",
                      padding: "8px 0",
                      fontSize: "13px",
                      fontWeight: selected ? "700" : "500",
                      background: selected ? "#eff6ff" : "#ffffff",
                      color: !inMonth
                        ? "#d1d5db"
                        : closedSunday
                          ? "#dc2626"
                          : weekend
                            ? "#dc2626"
                            : selectable
                              ? "#111827"
                              : "#9ca3af",
                      cursor: selectable ? "pointer" : "not-allowed",
                      opacity: inMonth ? 1 : 0.45,
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "12px",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>
            <span style={{ color: "#dc2626", fontWeight: "600" }}>Red dates:</span> Sundays
            closed · Saturdays 8 AM–2 PM · Weekdays 8 AM–6 PM ET
          </p>
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {value ? (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "#6b7280" }}>
          {getBusinessHoursHint(value)}
        </p>
      ) : null}
      {error ? (
        <p style={{ margin: "4px 0 0", color: "#dc2626", fontSize: "12px" }}>{error}</p>
      ) : null}
    </div>
  );
}

const navButtonStyle = {
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  borderRadius: "8px",
  width: "32px",
  height: "32px",
  cursor: "pointer",
  color: "#374151",
  fontSize: "18px",
  lineHeight: 1,
} as const;
