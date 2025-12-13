// components/OperatorDashboard/EmployeeStatus.tsx
"use client";

import { useEffect, useState } from "react";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { formatTime, getTodayDateString } from "@/lib/employee-utils";

interface EmployeeStatus {
  id: string;
  name: string;
  email: string;
  serviceArea: string[];
  clockInStatus: {
    isActive: boolean;
    clockInTime: any;
    clockOutTime: any | null;
  } | null;
  jobsAssigned: number;
  jobsCompleted: number;
  jobsRemaining: number;
}

interface EmployeeStatusProps {
  userId: string;
}

export function EmployeeStatus({ userId }: EmployeeStatusProps) {
  const [employees, setEmployees] = useState<EmployeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name");

  useEffect(() => {
    loadEmployeeStatus();
    // Set up real-time listener
    setupListener();
  }, []);

  const loadEmployeeStatus = async () => {
    try {
      const response = await fetch("/api/operator/employee-status");
      if (response.ok) {
        const data = await response.json();
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error("Error loading employee status:", error);
    } finally {
      setLoading(false);
    }
  };

  const setupListener = async () => {
    try {
      const db = await getDbInstance();
      if (!db) return;

      const firestore = await safeImportFirestore();
      const { collection, query, where, onSnapshot } = firestore;

      const today = getTodayDateString();
      
      // Listen to clockIns collection
      const clockInsRef = collection(db, "clockIns");
      const todayClockInsQuery = query(
        clockInsRef,
        where("date", "==", today)
      );

      const unsubscribeClockIns = onSnapshot(todayClockInsQuery, () => {
        loadEmployeeStatus();
      });

      // Listen to scheduledCleanings for today
      const cleaningsRef = collection(db, "scheduledCleanings");
      const todayCleaningsQuery = query(
        cleaningsRef,
        where("scheduledDate", "==", today)
      );

      const unsubscribeCleanings = onSnapshot(todayCleaningsQuery, () => {
        loadEmployeeStatus();
      });

      return () => {
        unsubscribeClockIns();
        unsubscribeCleanings();
      };
    } catch (error) {
      console.error("Error setting up listener:", error);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    if (filter === "all") return true;
    if (filter === "clocked_in") return emp.clockInStatus?.isActive === true;
    if (filter === "not_clocked_in") return !emp.clockInStatus || !emp.clockInStatus.isActive;
    if (filter === "clocked_out")
      return emp.clockInStatus && !emp.clockInStatus.isActive;
    return true;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name);
    }
    if (sortBy === "status") {
      const aStatus = a.clockInStatus?.isActive ? 1 : 0;
      const bStatus = b.clockInStatus?.isActive ? 1 : 0;
      return bStatus - aStatus;
    }
    if (sortBy === "jobs_completed") {
      return b.jobsCompleted - a.jobsCompleted;
    }
    return 0;
  });

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
        Loading employee status...
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          Employee Status
        </h2>

        <a
          href="/employee/register"
          style={{
            padding: "0.5rem 1rem",
            background: "#16a34a",
            color: "#ffffff",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#15803d";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#16a34a";
          }}
        >
          + Register New Employee
        </a>

        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
              background: "#ffffff",
            }}
          >
            <option value="all">All</option>
            <option value="clocked_in">Clocked In</option>
            <option value="not_clocked_in">Not Clocked In</option>
            <option value="clocked_out">Clocked Out</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              padding: "0.5rem 0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
              background: "#ffffff",
            }}
          >
            <option value="name">Sort by Name</option>
            <option value="status">Sort by Status</option>
            <option value="jobs_completed">Sort by Jobs Completed</option>
          </select>
        </div>
      </div>

      {sortedEmployees.length === 0 ? (
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
          No employees found
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {sortedEmployees.map((employee) => {
            const isClockedIn = employee.clockInStatus?.isActive === true;
            const isNotClockedIn = !employee.clockInStatus || !isClockedIn;
            const clockInTime = employee.clockInStatus?.clockInTime
              ? formatTime(employee.clockInStatus.clockInTime)
              : null;

            return (
              <div
                key={employee.id}
                style={{
                  background: "#ffffff",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
                  border: `2px solid ${
                    isNotClockedIn ? "#fee2e2" : isClockedIn ? "#d1fae5" : "#f3f4f6"
                  }`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: "1rem",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        marginBottom: "0.25rem",
                        color: "#111827",
                      }}
                    >
                      {employee.name}
                    </h3>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#6b7280",
                      }}
                    >
                      {employee.email}
                    </div>
                  </div>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      textTransform: "uppercase",
                      background: isClockedIn
                        ? "#d1fae5"
                        : isNotClockedIn
                        ? "#fee2e2"
                        : "#f3f4f6",
                      color: isClockedIn
                        ? "#065f46"
                        : isNotClockedIn
                        ? "#991b1b"
                        : "#6b7280",
                    }}
                  >
                    {isClockedIn
                      ? `CLOCKED IN${clockInTime ? ` - ${clockInTime}` : ""}`
                      : isNotClockedIn
                      ? "NOT CLOCKED IN"
                      : "CLOCKED OUT"}
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#6b7280",
                    marginBottom: "1rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Jobs Assigned:</span>
                    <span style={{ fontWeight: "600", color: "#111827" }}>
                      {employee.jobsAssigned}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Jobs Completed:</span>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#16a34a",
                      }}
                    >
                      {employee.jobsCompleted}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>Jobs Remaining:</span>
                    <span
                      style={{
                        fontWeight: "600",
                        color: "#dc2626",
                      }}
                    >
                      {employee.jobsRemaining}
                    </span>
                  </div>
                </div>

                {employee.serviceArea.length > 0 && (
                  <div
                    style={{
                      paddingTop: "0.75rem",
                      borderTop: "1px solid #e5e7eb",
                      fontSize: "0.875rem",
                      color: "#6b7280",
                    }}
                  >
                    <strong>Service Area:</strong> {employee.serviceArea.join(", ")}
                  </div>
                )}

                {/* Progress indicator */}
                {employee.jobsAssigned > 0 && (
                  <div style={{ marginTop: "0.75rem" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "#f3f4f6",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${
                            (employee.jobsCompleted / employee.jobsAssigned) * 100
                          }%`,
                          height: "100%",
                          background: "#16a34a",
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#6b7280",
                        marginTop: "0.25rem",
                        textAlign: "right",
                      }}
                    >
                      {Math.round(
                        (employee.jobsCompleted / employee.jobsAssigned) * 100
                      )}
                      % complete
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

