// components/EmployeeDashboard/EquipmentChecklist.tsx
"use client";

import { useState, useEffect } from "react";

interface EquipmentItem {
  id: string;
  name: string;
  required: boolean;
  checked: boolean;
  notes?: string;
}

interface EquipmentChecklistProps {
  employeeId: string;
  isClockedIn: boolean;
}

const DEFAULT_EQUIPMENT: Omit<EquipmentItem, "checked">[] = [
  { id: "gloves", name: "Protective Gloves", required: true },
  { id: "cleaning-supplies", name: "Cleaning Supplies", required: true },
  { id: "bin-blast-stickers", name: "Bin Blast Stickers", required: true },
  { id: "spray-bottle", name: "Spray Bottle", required: true },
  { id: "scrub-brush", name: "Scrub Brush", required: true },
  { id: "towel", name: "Cleaning Towel", required: false },
  { id: "trash-bags", name: "Trash Bags", required: false },
  { id: "phone", name: "Mobile Phone (for photos)", required: true },
];

export function EquipmentChecklist({
  employeeId,
  isClockedIn,
}: EquipmentChecklistProps) {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completedAt, setCompletedAt] = useState<Date | null>(null);

  useEffect(() => {
    loadChecklist();
  }, [employeeId]);

  const loadChecklist = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(
        `/api/employee/equipment?employeeId=${employeeId}&date=${today}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.checklist) {
          setItems(data.checklist.items || []);
          setCompleted(data.checklist.completed || false);
          if (data.checklist.completedAt) {
            setCompletedAt(
              data.checklist.completedAt.toDate
                ? data.checklist.completedAt.toDate()
                : new Date(data.checklist.completedAt)
            );
          }
        } else {
          // Initialize with default items
          const defaultItems: EquipmentItem[] = DEFAULT_EQUIPMENT.map(
            (item) => ({
              ...item,
              checked: false,
            })
          );
          setItems(defaultItems);
        }
      } else {
        // Initialize with default items
        const defaultItems: EquipmentItem[] = DEFAULT_EQUIPMENT.map(
          (item) => ({
            ...item,
            checked: false,
          })
        );
        setItems(defaultItems);
      }
    } catch (error) {
      console.error("Error loading checklist:", error);
      // Initialize with default items
      const defaultItems: EquipmentItem[] = DEFAULT_EQUIPMENT.map((item) => ({
        ...item,
        checked: false,
      }));
      setItems(defaultItems);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (completed) return; // Don't allow changes if already completed

    const updatedItems = items.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );
    setItems(updatedItems);

    // Auto-save
    await saveChecklist(updatedItems, false);
  };

  const saveChecklist = async (
    itemsToSave: EquipmentItem[],
    markCompleted: boolean
  ) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await fetch(`/api/employee/equipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          date: today,
          items: itemsToSave,
          completed: markCompleted,
        }),
      });

      if (response.ok) {
        if (markCompleted) {
          setCompleted(true);
          setCompletedAt(new Date());
        }
      }
    } catch (error) {
      console.error("Error saving checklist:", error);
    }
  };

  const handleComplete = async () => {
    const allRequiredChecked = items
      .filter((item) => item.required)
      .every((item) => item.checked);

    if (!allRequiredChecked) {
      alert(
        "Please check all required items before completing the checklist."
      );
      return;
    }

    await saveChecklist(items, true);
  };

  const requiredItems = items.filter((item) => item.required);
  const optionalItems = items.filter((item) => !item.required);
  const allRequiredChecked =
    requiredItems.length > 0 && requiredItems.every((item) => item.checked);
  const missingRequired = requiredItems.filter((item) => !item.checked);

  if (loading) {
    return (
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Loading equipment checklist...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#111827",
          }}
        >
          Equipment Checklist
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {completed
            ? "Checklist completed for today"
            : isClockedIn
            ? "Verify you have all required equipment before starting your route"
            : "Complete this checklist after clocking in"}
        </p>
        {completed && completedAt && (
          <p style={{ fontSize: "0.75rem", color: "#16a34a", marginTop: "0.25rem" }}>
            Completed at: {completedAt.toLocaleTimeString()}
          </p>
        )}
      </div>

      {!isClockedIn && !completed && (
        <div
          style={{
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1.5rem",
            color: "#92400e",
            fontSize: "0.875rem",
          }}
        >
          Please clock in first to complete the equipment checklist.
        </div>
      )}

      {missingRequired.length > 0 && !completed && (
        <div
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            padding: "1rem",
            marginBottom: "1.5rem",
            color: "#dc2626",
            fontSize: "0.875rem",
          }}
        >
          <strong>Missing Required Items:</strong>{" "}
          {missingRequired.map((item) => item.name).join(", ")}
        </div>
      )}

      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
          border: "1px solid #e5e7eb",
        }}
      >
        {requiredItems.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#111827",
              }}
            >
              Required Items
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {requiredItems.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    background: item.checked ? "#f0fdf4" : "#f9fafb",
                    borderRadius: "8px",
                    border: `2px solid ${item.checked ? "#bbf7d0" : "#e5e7eb"}`,
                    cursor: completed ? "default" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItem(item.id)}
                    disabled={completed}
                    style={{
                      width: "20px",
                      height: "20px",
                      cursor: completed ? "not-allowed" : "pointer",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.875rem",
                      fontWeight: item.checked ? "600" : "400",
                      color: item.checked ? "#065f46" : "#111827",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {optionalItems.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: "1rem",
                fontWeight: "600",
                marginBottom: "1rem",
                color: "#111827",
              }}
            >
              Optional Items
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {optionalItems.map((item) => (
                <label
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    background: item.checked ? "#f0fdf4" : "#f9fafb",
                    borderRadius: "8px",
                    border: `2px solid ${item.checked ? "#bbf7d0" : "#e5e7eb"}`,
                    cursor: completed ? "default" : "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleItem(item.id)}
                    disabled={completed}
                    style={{
                      width: "20px",
                      height: "20px",
                      cursor: completed ? "not-allowed" : "pointer",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      fontSize: "0.875rem",
                      fontWeight: item.checked ? "600" : "400",
                      color: item.checked ? "#065f46" : "#111827",
                      textDecoration: item.checked ? "line-through" : "none",
                    }}
                  >
                    {item.name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}

        {!completed && isClockedIn && (
          <button
            onClick={handleComplete}
            disabled={!allRequiredChecked}
            style={{
              marginTop: "1.5rem",
              width: "100%",
              padding: "0.75rem 1rem",
              background: allRequiredChecked ? "#16a34a" : "#9ca3af",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontSize: "1rem",
              fontWeight: "700",
              cursor: allRequiredChecked ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => {
              if (allRequiredChecked) {
                e.currentTarget.style.background = "#15803d";
              }
            }}
            onMouseOut={(e) => {
              if (allRequiredChecked) {
                e.currentTarget.style.background = "#16a34a";
              }
            }}
          >
            Complete Checklist
          </button>
        )}

        {completed && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "#d1fae5",
              borderRadius: "8px",
              color: "#065f46",
              fontSize: "0.875rem",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            ✓ Equipment checklist completed for today
          </div>
        )}
      </div>
    </div>
  );
}

