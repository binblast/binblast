// components/OperatorDashboard/EmployeeStatus.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { FleetPayrollPanel } from "@/components/OperatorDashboard/FleetPayrollPanel";
import { OpenFlagsPanel } from "@/components/OperatorDashboard/OpenFlagsPanel";
import { ManagerClockControls } from "@/components/OperatorDashboard/ManagerClockControls";
import {
  OperatorActionButton,
  OperatorActionToolbar,
  operatorActionLayouts,
} from "@/components/OperatorDashboard/operator-ui";
import {
  FleetEmployee,
  FleetQuickFilter,
  buildFleetStats,
  filterFleetEmployees,
  formatEmployeeName,
  getAttentionLabel,
  getAttentionTone,
  getClockStatusLabel,
  getClockStatusStyle,
  isClockedIn,
  sortFleetEmployees,
} from "@/lib/operator-fleet";

interface EmployeeStatusProps {
  userId: string;
}

type EmployeeView = "fleet" | "payroll";

const attentionToneStyles = {
  danger: { background: "#fef2f2", color: "#991b1b", border: "#fecaca" },
  warning: { background: "#fffbeb", color: "#92400e", border: "#fde68a" },
  success: { background: "#ecfdf5", color: "#166534", border: "#bbf7d0" },
  neutral: { background: "#f8fafc", color: "#475569", border: "#e2e8f0" },
} as const;

export function EmployeeStatus({ userId }: EmployeeStatusProps) {
  const router = useRouter();
  const [employeeView, setEmployeeView] = useState<EmployeeView>("fleet");
  const [employees, setEmployees] = useState<FleetEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [quickFilter, setQuickFilter] = useState<FleetQuickFilter>("on_shift");
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingEmployeeId, setEditingEmployeeId] = useState<string | null>(null);
  const [editingServiceAreas, setEditingServiceAreas] = useState<string[]>([]);
  const [newServiceArea, setNewServiceArea] = useState("");
  const [savingServiceArea, setSavingServiceArea] = useState<string | null>(null);
  const [managerEmail, setManagerEmail] = useState<string | undefined>();
  const [managerRole, setManagerRole] = useState<string | undefined>();

  const loadEmployeeStatus = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const response = await fetch("/api/operator/employee-status", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.error || "Failed to load employee status");
      }

      setEmployees(data.employees || []);
      setError(null);
      setLastSync(new Date());
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load employee status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadEmployeeStatus();
    const pollInterval = window.setInterval(() => loadEmployeeStatus(true), 20000);
    return () => window.clearInterval(pollInterval);
  }, [loadEmployeeStatus]);

  useEffect(() => {
    async function loadManagerInfo() {
      if (!userId) return;
      try {
        const db = await getDbInstance();
        if (!db) return;
        const firestore = await safeImportFirestore();
        const { doc, getDoc } = firestore;
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setManagerEmail(data.email || undefined);
          setManagerRole(data.role || undefined);
        }
      } catch (managerError) {
        console.error("Error loading manager info:", managerError);
      }
    }

    loadManagerInfo();
  }, [userId]);

  const stats = useMemo(() => buildFleetStats(employees), [employees]);
  const visibleEmployees = useMemo(
    () => sortFleetEmployees(filterFleetEmployees(employees, quickFilter)),
    [employees, quickFilter]
  );

  if (employeeView === "payroll") {
    return (
      <div style={{ marginBottom: "2rem" }}>
        <EmployeeViewToggle view={employeeView} onViewChange={setEmployeeView} />
        <FleetPayrollPanel />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
        Loading fleet status...
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <EmployeeViewToggle view={employeeView} onViewChange={setEmployeeView} />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0 }}>
            Fleet Status
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0.35rem 0 0" }}>
            Monitor who is on shift and how today&apos;s routes are progressing.
          </p>
          {lastSync && (
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.35rem" }}>
              Updated {lastSync.toLocaleTimeString()}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <OperatorActionButton variant="neutral" size="sm" onClick={() => loadEmployeeStatus(true)} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </OperatorActionButton>
          <Link href="/employee/register" style={{ textDecoration: "none" }}>
            <OperatorActionButton variant="success" size="sm">
              + Register Employee
            </OperatorActionButton>
          </Link>
        </div>
      </div>

      <FleetStatsBar stats={stats} />

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#dc2626",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {[
          { id: "on_shift" as FleetQuickFilter, label: "On Shift" },
          { id: "not_started" as FleetQuickFilter, label: "Not Started" },
          { id: "done" as FleetQuickFilter, label: "Done for Day" },
          { id: "flags" as FleetQuickFilter, label: "Has Flags" },
          { id: "all" as FleetQuickFilter, label: "All" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setQuickFilter(tab.id)}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "999px",
              border: "1px solid #e5e7eb",
              background: quickFilter === tab.id ? "#111827" : "#ffffff",
              color: quickFilter === tab.id ? "#ffffff" : "#374151",
              fontSize: "0.8125rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <OpenFlagsPanel />

      <div style={{ fontSize: "0.875rem", color: "#6b7280", margin: "1rem 0" }}>
        Showing {visibleEmployees.length} of {employees.length} employees
      </div>

      {visibleEmployees.length === 0 ? (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "2rem",
            textAlign: "center",
            color: "#6b7280",
            border: "1px solid #e5e7eb",
          }}
        >
          No employees match this filter.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "1rem",
          }}
        >
          {visibleEmployees.map((employee) => {
            const clockStyle = getClockStatusStyle(employee);
            const attentionLabel = getAttentionLabel(employee);
            const attentionTone = getAttentionTone(employee);
            const attentionStyle = attentionToneStyles[attentionTone];
            const displayName = formatEmployeeName(employee.name);

            return (
              <div
                key={employee.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  border: `1px solid ${clockStyle.border}`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.85rem",
                  minHeight: "320px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontSize: "1.05rem",
                        fontWeight: "700",
                        margin: 0,
                        color: "#111827",
                      }}
                    >
                      {displayName}
                    </h3>
                    <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.2rem" }}>
                      {employee.email}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "0.3rem 0.65rem",
                      borderRadius: "999px",
                      fontSize: "0.7rem",
                      fontWeight: "700",
                      whiteSpace: "nowrap",
                      background: clockStyle.background,
                      color: clockStyle.color,
                      border: `1px solid ${clockStyle.border}`,
                    }}
                  >
                    {getClockStatusLabel(employee)}
                  </span>
                </div>

                {attentionLabel && (
                  <div
                    style={{
                      padding: "0.55rem 0.7rem",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      background: attentionStyle.background,
                      color: attentionStyle.color,
                      border: `1px solid ${attentionStyle.border}`,
                    }}
                  >
                    {attentionLabel}
                  </div>
                )}

                {employee.jobsAssigned > 0 ? (
                  <>
                    <div style={{ display: "grid", gap: "0.4rem", fontSize: "0.875rem", color: "#4b5563" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Jobs Assigned</span>
                        <strong style={{ color: "#111827" }}>{employee.jobsAssigned}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Jobs Completed</span>
                        <strong style={{ color: "#16a34a" }}>{employee.jobsCompleted}</strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Jobs Remaining</span>
                        <strong style={{ color: "#dc2626" }}>{employee.jobsRemaining}</strong>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: "#f3f4f6",
                          borderRadius: "999px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${(employee.jobsCompleted / employee.jobsAssigned) * 100}%`,
                            height: "100%",
                            background: "#16a34a",
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", textAlign: "right" }}>
                        {Math.round((employee.jobsCompleted / employee.jobsAssigned) * 100)}% complete
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      padding: "0.85rem 1rem",
                      borderRadius: "10px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      color: "#475569",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      textAlign: "center",
                    }}
                  >
                    No route today
                  </div>
                )}

                <div style={{ ...operatorActionLayouts.stopActions, marginTop: "auto" }}>
                  <ManagerClockControls
                    employeeId={employee.id}
                    employeeName={displayName}
                    isClockedIn={isClockedIn(employee)}
                    managerId={userId}
                    managerEmail={managerEmail}
                    managerRole={managerRole}
                    onUpdated={() => loadEmployeeStatus(true)}
                    compact
                  />
                  <div style={operatorActionLayouts.stopActionsRow}>
                    <OperatorActionButton
                      variant="primary"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/operator/employees/${employee.id}`);
                      }}
                    >
                      Open Route
                    </OperatorActionButton>
                    <OperatorActionButton
                      variant="ghost"
                      size="sm"
                      onClick={(event) => {
                        event.stopPropagation();
                        router.push(`/operator/employees/${employee.id}?tab=photos`);
                      }}
                    >
                      Photos
                    </OperatorActionButton>
                  </div>
                </div>

                <div
                  style={{
                    paddingTop: "0.75rem",
                    borderTop: "1px solid #e5e7eb",
                    fontSize: "0.8125rem",
                    color: "#6b7280",
                  }}
                >
                  {editingEmployeeId === employee.id ? (
                    <ServiceAreaEditor
                      areas={editingServiceAreas}
                      newArea={newServiceArea}
                      saving={savingServiceArea === employee.id}
                      onNewAreaChange={setNewServiceArea}
                      onAddArea={() => {
                        if (!newServiceArea.trim()) return;
                        setEditingServiceAreas([...editingServiceAreas, newServiceArea.trim()]);
                        setNewServiceArea("");
                      }}
                      onRemoveArea={(index) =>
                        setEditingServiceAreas(editingServiceAreas.filter((_, i) => i !== index))
                      }
                      onCancel={() => {
                        setEditingEmployeeId(null);
                        setEditingServiceAreas([]);
                        setNewServiceArea("");
                      }}
                      onSave={async () => {
                        setSavingServiceArea(employee.id);
                        try {
                          const response = await fetch(
                            `/api/operator/employees/${employee.id}/service-area`,
                            {
                              method: "PUT",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ serviceArea: editingServiceAreas }),
                            }
                          );
                          if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.message || "Failed to update");
                          }
                          await loadEmployeeStatus(true);
                          setEditingEmployeeId(null);
                          setEditingServiceAreas([]);
                          setNewServiceArea("");
                        } catch (saveError: unknown) {
                          alert(
                            saveError instanceof Error
                              ? saveError.message
                              : "Failed to update service area"
                          );
                        } finally {
                          setSavingServiceArea(null);
                        }
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "center" }}>
                      <div>
                        <strong>Service Area:</strong>{" "}
                        {employee.serviceArea.length > 0 ? employee.serviceArea.join(", ") : "No zone assigned"}
                      </div>
                      <OperatorActionButton
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingEmployeeId(employee.id);
                          setEditingServiceAreas([...employee.serviceArea]);
                          setNewServiceArea("");
                        }}
                      >
                        Edit
                      </OperatorActionButton>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EmployeeViewToggle({
  view,
  onViewChange,
}: {
  view: EmployeeView;
  onViewChange: (view: EmployeeView) => void;
}) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
      {[
        { id: "fleet" as EmployeeView, label: "Fleet Status" },
        { id: "payroll" as EmployeeView, label: "Hours & Pay" },
      ].map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onViewChange(tab.id)}
          style={{
            padding: "0.55rem 0.9rem",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            background: view === tab.id ? "#111827" : "#ffffff",
            color: view === tab.id ? "#ffffff" : "#374151",
            fontSize: "0.8125rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function FleetStatsBar({ stats }: { stats: ReturnType<typeof buildFleetStats> }) {
  const items = [
    { label: "On Shift", value: stats.onShift, color: "#16a34a" },
    { label: "Not Started", value: stats.notStarted, color: "#dc2626" },
    { label: "On Route", value: stats.onRoute, color: "#2563eb" },
    { label: "Jobs Left", value: stats.jobsRemaining, color: "#7c3aed" },
    { label: "Open Flags", value: stats.openFlags, color: "#d97706" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.875rem 1rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>{item.label}</div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function ServiceAreaEditor({
  areas,
  newArea,
  saving,
  onNewAreaChange,
  onAddArea,
  onRemoveArea,
  onCancel,
  onSave,
}: {
  areas: string[];
  newArea: string;
  saving: boolean;
  onNewAreaChange: (value: string) => void;
  onAddArea: () => void;
  onRemoveArea: (index: number) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div onClick={(event) => event.stopPropagation()}>
      <div style={{ marginBottom: "0.5rem", fontWeight: "600", color: "#374151" }}>Service Areas</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {areas.map((area, index) => (
          <span
            key={`${area}-${index}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.25rem",
              padding: "0.25rem 0.5rem",
              background: "#f3f4f6",
              borderRadius: "6px",
              fontSize: "0.75rem",
            }}
          >
            {area}
            <button
              type="button"
              onClick={() => onRemoveArea(index)}
              style={{
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        <input
          type="text"
          value={newArea}
          onChange={(e) => onNewAreaChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAddArea();
          }}
          placeholder="Add service area..."
          style={{
            flex: 1,
            padding: "0.5rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        />
        <OperatorActionButton variant="success" size="sm" disabled={!newArea.trim()} onClick={onAddArea}>
          Add
        </OperatorActionButton>
      </div>
      <OperatorActionToolbar style={{ paddingTop: 0, borderTop: "none" }}>
        <OperatorActionButton variant="success" size="sm" disabled={saving} onClick={onSave}>
          {saving ? "Saving..." : "Save"}
        </OperatorActionButton>
        <OperatorActionButton variant="ghost" size="sm" disabled={saving} onClick={onCancel}>
          Cancel
        </OperatorActionButton>
      </OperatorActionToolbar>
    </div>
  );
}
