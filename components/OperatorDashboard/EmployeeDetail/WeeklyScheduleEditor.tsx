// components/OperatorDashboard/EmployeeDetail/WeeklyScheduleEditor.tsx
"use client";

import { useEffect, useState } from "react";

interface DaySchedule {
  dayOfWeek: number;
  isWorking: boolean;
  startTime: string;
  endTime: string;
  maxStops: number;
}

interface WeeklyScheduleEditorProps {
  employeeId: string;
  weekStartDate?: string;
}

const DAYS_OF_WEEK = [
  { day: 0, label: "Sunday", short: "Sun" },
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
];

function getWeekStartDate(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

export function WeeklyScheduleEditor({ employeeId, weekStartDate }: WeeklyScheduleEditorProps) {
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>(
    weekStartDate || getWeekStartDate(new Date())
  );
  const [schedule, setSchedule] = useState<DaySchedule[]>(() => {
    return DAYS_OF_WEEK.map(day => ({
      dayOfWeek: day.day,
      isWorking: day.day >= 1 && day.day <= 5, // Mon-Fri default
      startTime: "08:00",
      endTime: "17:00",
      maxStops: 20,
    }));
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    loadSchedule();
    loadTemplates();
  }, [employeeId, selectedWeekStart]);

  const loadSchedule = async () => {
    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/schedule?weekStartDate=${selectedWeekStart}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.schedule && data.schedule.schedule) {
          setSchedule(data.schedule.schedule);
        }
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/schedule/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStartDate: selectedWeekStart,
          schedule,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save schedule");
      }

      alert("Schedule saved successfully");
    } catch (error: any) {
      alert(error.message || "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  const handleCopyLastWeek = async () => {
    const lastWeek = new Date(selectedWeekStart);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastWeekStart = getWeekStartDate(lastWeek);

    try {
      const response = await fetch(
        `/api/operator/employees/${employeeId}/schedule?weekStartDate=${lastWeekStart}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.schedule && data.schedule.schedule) {
          setSchedule(data.schedule.schedule);
          alert("Last week's schedule copied");
        } else {
          alert("No schedule found for last week");
        }
      }
    } catch (error) {
      alert("Failed to copy last week's schedule");
    }
  };

  const handleApplyTemplate = (template: any) => {
    if (template.schedule) {
      setSchedule(template.schedule);
      alert(`Template "${template.name}" applied`);
    }
  };

  const updateDaySchedule = (dayIndex: number, updates: Partial<DaySchedule>) => {
    setSchedule(prev => prev.map((day, idx) =>
      idx === dayIndex ? { ...day, ...updates } : day
    ));
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading schedule...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827" }}>
          Weekly Work Schedule
        </h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={handleCopyLastWeek}
            style={{
              padding: "0.5rem 1rem",
              background: "#6b7280",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Copy Last Week
          </button>
          {templates.length > 0 && (
            <select
              onChange={(e) => {
                const template = templates.find(t => t.id === e.target.value);
                if (template) handleApplyTemplate(template);
              }}
              defaultValue=""
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <option value="">Apply Template...</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Week Selector */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
          Week Starting
        </label>
        <input
          type="date"
          value={selectedWeekStart}
          onChange={(e) => setSelectedWeekStart(e.target.value)}
          style={{
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        />
      </div>

      {/* Schedule Grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        {DAYS_OF_WEEK.map((dayInfo, idx) => {
          const daySchedule = schedule.find(s => s.dayOfWeek === dayInfo.day) || schedule[idx];
          return (
            <div
              key={dayInfo.day}
              style={{
                display: "grid",
                gridTemplateColumns: "100px 1fr 1fr 1fr 100px",
                gap: "1rem",
                alignItems: "center",
                padding: "1rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                marginBottom: "0.5rem",
                background: daySchedule.isWorking ? "#f0fdf4" : "#f9fafb",
              }}
            >
              <div style={{ fontWeight: "600", color: "#111827" }}>
                {dayInfo.label}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={daySchedule.isWorking}
                  onChange={(e) => updateDaySchedule(idx, { isWorking: e.target.checked })}
                />
                <span style={{ fontSize: "0.875rem", color: "#374151" }}>Working</span>
              </label>
              {daySchedule.isWorking && (
                <>
                  <input
                    type="time"
                    value={daySchedule.startTime}
                    onChange={(e) => updateDaySchedule(idx, { startTime: e.target.value })}
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                    }}
                  />
                  <input
                    type="time"
                    value={daySchedule.endTime}
                    onChange={(e) => updateDaySchedule(idx, { endTime: e.target.value })}
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                    }}
                  />
                  <input
                    type="number"
                    value={daySchedule.maxStops}
                    onChange={(e) => updateDaySchedule(idx, { maxStops: parseInt(e.target.value) || 0 })}
                    placeholder="Max stops"
                    min="0"
                    style={{
                      padding: "0.5rem",
                      border: "1px solid #e5e7eb",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      width: "100px",
                    }}
                  />
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          padding: "0.75rem 1.5rem",
          background: saving ? "#9ca3af" : "#16a34a",
          color: "#ffffff",
          border: "none",
          borderRadius: "6px",
          fontSize: "0.95rem",
          fontWeight: "600",
          cursor: saving ? "not-allowed" : "pointer",
          opacity: saving ? 0.5 : 1,
        }}
      >
        {saving ? "Saving..." : "Save Schedule"}
      </button>
    </div>
  );
}

