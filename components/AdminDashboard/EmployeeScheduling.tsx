// components/AdminDashboard/EmployeeScheduling.tsx
"use client";

import { useState, useEffect } from "react";

interface EmployeeSchedulingProps {
  employeeId: string;
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function EmployeeScheduling({ employeeId }: EmployeeSchedulingProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>("");
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const today = new Date();
    const monday = getMonday(today);
    const weekStart = monday.toISOString().split('T')[0];
    setCurrentWeekStart(weekStart);
    loadSchedule(weekStart);
  }, [employeeId]);

  function getMonday(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  function getWeekStartDate(date: Date): string {
    const monday = getMonday(date);
    return monday.toISOString().split('T')[0];
  }

  async function loadSchedule(weekStart: string) {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/employees/${employeeId}/schedule?weekStartDate=${weekStart}`);
      const data = await response.json();

      if (data.success) {
        if (data.schedule && data.schedule.schedule) {
          setSchedule(data.schedule.schedule);
        } else {
          // Initialize empty schedule
          setSchedule(
            DAYS_OF_WEEK.map((day, index) => ({
              dayOfWeek: index,
              dayName: day,
              startTime: "",
              endTime: "",
              available: false,
            }))
          );
        }
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
      setError("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  }

  function handleWeekChange(direction: "prev" | "next") {
    const currentDate = new Date(currentWeekStart);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === "next" ? 7 : -7));
    const newWeekStart = getWeekStartDate(newDate);
    setCurrentWeekStart(newWeekStart);
    loadSchedule(newWeekStart);
  }

  function updateDaySchedule(dayIndex: number, field: string, value: any) {
    const newSchedule = [...schedule];
    newSchedule[dayIndex] = {
      ...newSchedule[dayIndex],
      [field]: value,
    };
    setSchedule(newSchedule);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/admin/employees/${employeeId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: currentWeekStart,
          schedule: schedule.map((day, index) => ({
            dayOfWeek: index,
            dayName: DAYS_OF_WEEK[index],
            startTime: day.startTime || "",
            endTime: day.endTime || "",
            available: day.available || false,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save schedule");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading schedule...</div>;
  }

  const weekEndDate = new Date(currentWeekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Weekly Schedule</h3>
          <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
            {new Date(currentWeekStart).toLocaleDateString()} - {weekEndDate.toLocaleDateString()}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => handleWeekChange("prev")}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: "white",
              cursor: "pointer",
            }}
          >
            ← Previous Week
          </button>
          <button
            onClick={() => {
              const today = new Date();
              const monday = getMonday(today);
              const weekStart = monday.toISOString().split('T')[0];
              setCurrentWeekStart(weekStart);
              loadSchedule(weekStart);
            }}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: "white",
              cursor: "pointer",
            }}
          >
            This Week
          </button>
          <button
            onClick={() => handleWeekChange("next")}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              background: "white",
              cursor: "pointer",
            }}
          >
            Next Week →
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1.5rem" }}>
        {schedule.map((day, index) => (
          <div
            key={index}
            style={{
              padding: "1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              background: day.available ? "#f0fdf4" : "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
              <input
                type="checkbox"
                checked={day.available || false}
                onChange={(e) => updateDaySchedule(index, "available", e.target.checked)}
                style={{ width: "18px", height: "18px", cursor: "pointer" }}
              />
              <label style={{ fontWeight: "600", fontSize: "1rem", flex: "0 0 120px" }}>
                {DAYS_OF_WEEK[index]}
              </label>
            </div>
            {day.available && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginLeft: "2rem" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "#6b7280" }}>
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={day.startTime || ""}
                    onChange={(e) => updateDaySchedule(index, "startTime", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.875rem", marginBottom: "0.25rem", color: "#6b7280" }}>
                    End Time
                  </label>
                  <input
                    type="time"
                    value={day.endTime || ""}
                    onChange={(e) => updateDaySchedule(index, "endTime", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "6px",
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{
          marginBottom: "1rem",
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

      {success && (
        <div style={{
          marginBottom: "1rem",
          padding: "0.75rem 1rem",
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: "8px",
          color: "#16a34a",
          fontSize: "0.875rem"
        }}>
          Schedule saved successfully
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "0.75rem 1.5rem",
          background: "#16a34a",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "0.95rem",
          fontWeight: "600",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Schedule"}
      </button>
    </div>
  );
}
