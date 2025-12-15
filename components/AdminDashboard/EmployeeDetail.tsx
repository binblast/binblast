// components/AdminDashboard/EmployeeDetail.tsx
"use client";

import { useState, useEffect } from "react";
import { EmployeeTaxInfo } from "./EmployeeTaxInfo";
import { EmployeeScheduling } from "./EmployeeScheduling";
import { JobAssignmentPanel } from "./JobAssignmentPanel";

interface EmployeeDetailProps {
  employeeId: string;
}

export function EmployeeDetail({ employeeId }: EmployeeDetailProps) {
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "tax" | "training" | "scheduling" | "jobs">("overview");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadEmployee();
  }, [employeeId]);

  async function loadEmployee() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/employees/${employeeId}`);
      const data = await response.json();

      if (data.success) {
        setEmployee(data.employee);
        setFormData({
          firstName: data.employee.firstName,
          lastName: data.employee.lastName,
          email: data.employee.email,
          phone: data.employee.phone || "",
          serviceArea: data.employee.serviceArea || [],
          payRatePerJob: data.employee.payRatePerJob || 0,
        });
      }
    } catch (error) {
      console.error("Error loading employee:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/admin/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update employee");
      }

      setSuccess(true);
      setEditing(false);
      setTimeout(() => setSuccess(false), 3000);
      await loadEmployee();
    } catch (err: any) {
      setError(err.message || "Failed to update employee");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading employee details...</div>;
  }

  if (!employee) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Employee not found</div>;
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "tax", label: "Tax Information" },
    { id: "training", label: "Training & Certificates" },
    { id: "scheduling", label: "Scheduling" },
    { id: "jobs", label: "Job Assignments" },
  ];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "700" }}>
              {employee.firstName} {employee.lastName}
            </h2>
            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.95rem", color: "#6b7280" }}>
              {employee.email}
            </p>
          </div>
          {activeTab === "overview" && (
            <button
              onClick={() => {
                if (editing) {
                  handleSave();
                } else {
                  setEditing(true);
                }
              }}
              disabled={saving}
              style={{
                padding: "0.75rem 1.5rem",
                background: editing ? "#16a34a" : "#6b7280",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.95rem",
                fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : editing ? "Save Changes" : "Edit"}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "0.5rem", borderBottom: "2px solid #e5e7eb" }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setEditing(false);
              }}
              style={{
                padding: "0.75rem 1.5rem",
                border: "none",
                background: "transparent",
                borderBottom: activeTab === tab.id ? "2px solid #16a34a" : "2px solid transparent",
                color: activeTab === tab.id ? "#16a34a" : "#6b7280",
                fontWeight: activeTab === tab.id ? "600" : "500",
                cursor: "pointer",
                marginBottom: "-2px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div>
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
              Employee updated successfully
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "#6b7280" }}>
                First Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                  }}
                />
              ) : (
                <div style={{ padding: "0.75rem", fontSize: "0.95rem" }}>{employee.firstName}</div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "#6b7280" }}>
                Last Name
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                  }}
                />
              ) : (
                <div style={{ padding: "0.75rem", fontSize: "0.95rem" }}>{employee.lastName}</div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "#6b7280" }}>
                Email
              </label>
              {editing ? (
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                  }}
                />
              ) : (
                <div style={{ padding: "0.75rem", fontSize: "0.95rem" }}>{employee.email}</div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "#6b7280" }}>
                Phone
              </label>
              {editing ? (
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                  }}
                />
              ) : (
                <div style={{ padding: "0.75rem", fontSize: "0.95rem" }}>{employee.phone || "—"}</div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "#6b7280" }}>
                Service Areas
              </label>
              {editing ? (
                <input
                  type="text"
                  value={formData.serviceArea.join(", ")}
                  onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean) })}
                  placeholder="Comma-separated areas"
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                  }}
                />
              ) : (
                <div style={{ padding: "0.75rem", fontSize: "0.95rem" }}>
                  {employee.serviceArea && employee.serviceArea.length > 0
                    ? employee.serviceArea.join(", ")
                    : "—"}
                </div>
              )}
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "500", marginBottom: "0.5rem", color: "#6b7280" }}>
                Pay Rate Per Job
              </label>
              {editing ? (
                <input
                  type="number"
                  step="0.01"
                  value={formData.payRatePerJob}
                  onChange={(e) => setFormData({ ...formData, payRatePerJob: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    fontSize: "0.95rem",
                  }}
                />
              ) : (
                <div style={{ padding: "0.75rem", fontSize: "0.95rem", fontWeight: "600" }}>
                  ${employee.payRatePerJob || 0}/job
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "tax" && <EmployeeTaxInfo employeeId={employeeId} />}
      
      {activeTab === "training" && (
        <div>
          <h3 style={{ marginBottom: "1rem", fontSize: "1.125rem", fontWeight: "600" }}>Training Certificate Status</h3>
          {employee.certificate ? (
            <div style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}>
              <div style={{ marginBottom: "1rem" }}>
                <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>Certificate ID: {employee.certificate.certId}</div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Issued: {new Date(employee.certificate.issuedAt).toLocaleDateString()}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  Expires: {new Date(employee.certificate.expiresAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span style={{
                  padding: "0.25rem 0.75rem",
                  background: employee.certificationStatus === "completed" ? "#dcfce7" : "#fef3c7",
                  color: employee.certificationStatus === "completed" ? "#16a34a" : "#d97706",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  textTransform: "capitalize",
                }}>
                  {employee.certificationStatus || "in_progress"}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
              No certificate found. Training status: {employee.certificationStatus || "not_started"}
            </div>
          )}
        </div>
      )}

      {activeTab === "scheduling" && <EmployeeScheduling employeeId={employeeId} />}
      
      {activeTab === "jobs" && <JobAssignmentPanel employeeId={employeeId} />}
    </div>
  );
}
