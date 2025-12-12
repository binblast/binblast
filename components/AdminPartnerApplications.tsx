// components/AdminPartnerApplications.tsx
"use client";

import { useState, useEffect } from "react";

const ADMIN_EMAIL = "binblastcompany@gmail.com";

interface PartnerApplication {
  id: string;
  userId: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  websiteOrInstagram?: string;
  serviceType: string;
  serviceArea: string;
  hasInsurance: boolean;
  promotionMethod: string;
  heardAboutUs?: string;
  status: "pending" | "approved" | "rejected";
  linkedPartnerId?: string;
  createdAt: any;
  updatedAt: any;
}

export function AdminPartnerApplications() {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  async function loadApplications() {
    try {
      const response = await fetch("/api/admin/partners/applications");
      const data = await response.json();
      if (data.success) {
        setApplications(data.applications || []);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error loading applications:", err);
      setLoading(false);
    }
  }

  async function handleApprove(applicationId: string) {
    if (!confirm("Approve this partner application? They will be able to sign up for a partner account.")) {
      return;
    }

    setProcessing(applicationId);
    try {
      const response = await fetch(`/api/admin/partners/applications/${applicationId}/approve`, {
        method: "POST",
      });
      const data = await response.json();
      
      if (data.success) {
        alert(`Partner approved! They can now sign up at /partner\nSignup Link: ${data.signupLink}`);
        loadApplications();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(applicationId: string) {
    const reason = prompt("Enter rejection reason (optional):");
    if (reason === null) return; // User cancelled

    setProcessing(applicationId);
    try {
      const response = await fetch(`/api/admin/partners/applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || undefined }),
      });
      const data = await response.json();
      
      if (data.success) {
        alert("Application rejected.");
        loadApplications();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  }

  const pendingApplications = applications.filter(app => app.status === "pending");
  const approvedApplications = applications.filter(app => app.status === "approved");
  const rejectedApplications = applications.filter(app => app.status === "rejected");

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading applications...</div>;
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "20px",
      padding: "2rem",
      boxShadow: "0 4px 16px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
      marginTop: "2rem"
    }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-dark)" }}>
        Partner Applications
      </h2>

      {/* Pending Applications */}
      {pendingApplications.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#0369a1" }}>
            Pending Review ({pendingApplications.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pendingApplications.map((app) => (
              <div
                key={app.id}
                style={{
                  padding: "1.5rem",
                  background: "#f9fafb",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Business</div>
                    <div style={{ fontWeight: "600", color: "var(--text-dark)" }}>{app.businessName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Owner</div>
                    <div style={{ fontWeight: "600", color: "var(--text-dark)" }}>{app.ownerName}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Email</div>
                    <div style={{ color: "var(--text-dark)" }}>{app.email}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Service Type</div>
                    <div style={{ color: "var(--text-dark)" }}>{app.serviceType}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Service Area</div>
                    <div style={{ color: "var(--text-dark)" }}>{app.serviceArea}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Insurance</div>
                    <div style={{ color: app.hasInsurance ? "#16a34a" : "#dc2626", fontWeight: "600" }}>
                      {app.hasInsurance ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
                {app.promotionMethod && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Promotion Method</div>
                    <div style={{ color: "var(--text-dark)", fontSize: "0.875rem" }}>{app.promotionMethod}</div>
                  </div>
                )}
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => handleApprove(app.id)}
                    disabled={processing === app.id}
                    style={{
                      padding: "0.5rem 1.5rem",
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: processing === app.id ? "not-allowed" : "pointer",
                      opacity: processing === app.id ? 0.6 : 1
                    }}
                  >
                    {processing === app.id ? "Processing..." : "Approve"}
                  </button>
                  <button
                    onClick={() => handleReject(app.id)}
                    disabled={processing === app.id}
                    style={{
                      padding: "0.5rem 1.5rem",
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: processing === app.id ? "not-allowed" : "pointer",
                      opacity: processing === app.id ? 0.6 : 1
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Approved Applications */}
      {approvedApplications.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem", color: "#16a34a" }}>
            Approved ({approvedApplications.length})
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {approvedApplications.map((app) => (
              <div
                key={app.id}
                style={{
                  padding: "1rem",
                  background: "#ecfdf5",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div>
                  <div style={{ fontWeight: "600", color: "var(--text-dark)" }}>{app.businessName}</div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{app.email}</div>
                </div>
                <div style={{ fontSize: "0.875rem", color: "#16a34a", fontWeight: "600" }}>
                  {app.linkedPartnerId ? "Partner Created" : "Pending Signup"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pendingApplications.length === 0 && approvedApplications.length === 0 && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
          No partner applications at this time.
        </div>
      )}
    </div>
  );
}
