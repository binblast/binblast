// components/AdminDashboard/EmployeeApplications.tsx
"use client";

import { useState, useEffect } from "react";

interface EmployeeApplication {
  id: string;
  employeeId: string;
  applicationDate: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
  employee?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export function EmployeeApplications() {
  const [applications, setApplications] = useState<EmployeeApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [selectedApplication, setSelectedApplication] = useState<EmployeeApplication | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  async function loadApplications() {
    try {
      setLoading(true);
      const params = filterStatus ? `?status=${filterStatus}` : "";
      const response = await fetch(`/api/admin/employees/applications${params}`);
      const data = await response.json();

      if (data.success) {
        setApplications(data.applications || []);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(status: "approved" | "rejected") {
    if (!selectedApplication) return;

    try {
      setProcessing(true);
      setError(null);

      const response = await fetch(`/api/admin/employees/applications/${selectedApplication.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          notes: reviewNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to review application");
      }

      setSelectedApplication(null);
      setReviewNotes("");
      await loadApplications();
    } catch (err: any) {
      setError(err.message || "Failed to review application");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading applications...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "600" }}>Employee Applications</h3>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.95rem",
            background: "white",
          }}
        >
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {applications.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
          No applications found
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {applications.map((app) => (
            <div
              key={app.id}
              style={{
                padding: "1.5rem",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                background: "white",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontWeight: "600", fontSize: "1.125rem", marginBottom: "0.25rem" }}>
                    {app.employee?.firstName} {app.employee?.lastName}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {app.employee?.email}
                  </div>
                  {app.employee?.phone && (
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {app.employee.phone}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
                  <span style={{
                    padding: "0.25rem 0.75rem",
                    background: app.status === "approved" ? "#dcfce7" : app.status === "rejected" ? "#fef2f2" : "#fef3c7",
                    color: app.status === "approved" ? "#16a34a" : app.status === "rejected" ? "#dc2626" : "#d97706",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}>
                    {app.status}
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                    Applied: {new Date(app.applicationDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {app.status === "pending" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => {
                      setSelectedApplication(app);
                      setReviewNotes("");
                    }}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#16a34a",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Review Application
                  </button>
                </div>
              )}

              {app.notes && (
                <div style={{ marginTop: "1rem", padding: "0.75rem", background: "#f9fafb", borderRadius: "6px" }}>
                  <div style={{ fontSize: "0.75rem", fontWeight: "600", marginBottom: "0.25rem", color: "#6b7280" }}>
                    Review Notes:
                  </div>
                  <div style={{ fontSize: "0.875rem" }}>{app.notes}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selectedApplication && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            padding: "2rem",
            maxWidth: "500px",
            width: "90%",
            maxHeight: "90vh",
            overflow: "auto",
          }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: "600" }}>
              Review Application
            </h3>
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                {selectedApplication.employee?.firstName} {selectedApplication.employee?.lastName}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {selectedApplication.employee?.email}
              </div>
              {selectedApplication.employee?.phone && (
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {selectedApplication.employee.phone}
                </div>
              )}
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem" }}>
                Review Notes (optional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Add notes about this application..."
                rows={4}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  fontFamily: "inherit",
                }}
              />
            </div>
            {error && (
              <div style={{
                marginBottom: "1rem",
                padding: "0.75rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "6px",
                color: "#dc2626",
                fontSize: "0.875rem"
              }}>
                {error}
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  setSelectedApplication(null);
                  setReviewNotes("");
                  setError(null);
                }}
                disabled={processing}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  color: "#6b7280",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: processing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleReview("rejected")}
                disabled={processing}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: processing ? "not-allowed" : "pointer",
                  opacity: processing ? 0.6 : 1,
                }}
              >
                {processing ? "Processing..." : "Reject"}
              </button>
              <button
                onClick={() => handleReview("approved")}
                disabled={processing}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#16a34a",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: processing ? "not-allowed" : "pointer",
                  opacity: processing ? 0.6 : 1,
                }}
              >
                {processing ? "Processing..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
