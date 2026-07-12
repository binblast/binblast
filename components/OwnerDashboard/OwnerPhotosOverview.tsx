"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface EmployeePhotoEntry {
  id: string;
  name: string;
  email: string;
  jobsAssigned: number;
  jobsCompleted: number;
  clockInStatus: { isActive: boolean } | null;
}

export function OwnerPhotosOverview() {
  const [employees, setEmployees] = useState<EmployeePhotoEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/operator/employee-status");
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
        }
      } catch (error) {
        console.error("Error loading employees for photos:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p style={{ color: "#6b7280", padding: "1rem 0" }}>Loading cleaning photos...</p>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: 0, color: "var(--text-dark)" }}>
          Cleaning Photos & Proof of Work
        </h2>
        <p style={{ color: "#6b7280", margin: "0.5rem 0 0", fontSize: "0.95rem" }}>
          Review before/after photos and proof uploaded by each employee.
        </p>
      </div>

      {employees.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
          No employees found.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
          {employees.map((employee) => (
            <div
              key={employee.id}
              style={{
                background: "#ffffff",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1.25rem",
              }}
            >
              <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{employee.name}</div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>{employee.email}</div>
              <div style={{ fontSize: "0.8125rem", color: "#374151", marginBottom: "0.5rem" }}>
                Today: {employee.jobsCompleted}/{employee.jobsAssigned} jobs completed
              </div>
              <div style={{ fontSize: "0.8125rem", marginBottom: "1rem" }}>
                Status:{" "}
                <span style={{ fontWeight: "600", color: employee.clockInStatus?.isActive ? "#16a34a" : "#6b7280" }}>
                  {employee.clockInStatus?.isActive ? "Clocked In" : "Off Shift"}
                </span>
              </div>
              <Link
                href={`/operator/employees/${employee.id}?tab=photos`}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.625rem 1rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                View Cleaning Photos
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
