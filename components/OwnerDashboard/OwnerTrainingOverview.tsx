"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface TrainingEmployee {
  id: string;
  name: string;
  email: string;
  certified: boolean;
  completedModules: number;
  totalModules: number;
}

export function OwnerTrainingOverview() {
  const [employees, setEmployees] = useState<TrainingEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/owner/training-overview");
        if (response.ok) {
          const data = await response.json();
          setEmployees(data.employees || []);
        }
      } catch (error) {
        console.error("Error loading training overview:", error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <p style={{ color: "#6b7280", padding: "1rem 0" }}>Loading training status...</p>;
  }

  const certifiedCount = employees.filter((e) => e.certified).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600", margin: 0, color: "var(--text-dark)" }}>
            Training & Certification
          </h2>
          <p style={{ color: "#6b7280", margin: "0.5rem 0 0", fontSize: "0.95rem" }}>
            {certifiedCount} of {employees.length} employees fully certified
          </p>
        </div>
        <Link
          href="/admin/training/modules"
          style={{
            padding: "0.625rem 1rem",
            background: "#16a34a",
            color: "#ffffff",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          Manage Training Modules →
        </Link>
      </div>

      {employees.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "12px" }}>
          No employees found.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {employees.map((employee) => {
            const progress = employee.totalModules > 0
              ? Math.round((employee.completedModules / employee.totalModules) * 100)
              : 0;

            return (
              <div
                key={employee.id}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "1.25rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div style={{ flex: 1, minWidth: "200px" }}>
                  <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>{employee.name}</div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{employee.email}</div>
                  <div style={{ marginTop: "0.75rem" }}>
                    <div style={{ height: "8px", background: "#e5e7eb", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: employee.certified ? "#16a34a" : "#3b82f6", borderRadius: "999px" }} />
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.375rem" }}>
                      {employee.completedModules}/{employee.totalModules} modules complete ({progress}%)
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: "600",
                      background: employee.certified ? "#d1fae5" : "#fef3c7",
                      color: employee.certified ? "#065f46" : "#92400e",
                    }}
                  >
                    {employee.certified ? "Certified" : "In Progress"}
                  </span>
                  <Link
                    href={`/operator/employees/${employee.id}?tab=training`}
                    style={{
                      padding: "0.5rem 0.875rem",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      color: "#374151",
                      textDecoration: "none",
                    }}
                  >
                    View Details
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
