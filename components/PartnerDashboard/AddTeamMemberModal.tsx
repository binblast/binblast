// components/PartnerDashboard/AddTeamMemberModal.tsx
"use client";

import { useState } from "react";

interface AddTeamMemberModalProps {
  partnerId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function AddTeamMemberModal({ partnerId, userId, onSuccess, onCancel }: AddTeamMemberModalProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceArea: "",
    payRatePerJob: "10.00",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Validate pay rate
      const payRate = parseFloat(formData.payRatePerJob);
      if (isNaN(payRate) || payRate < 7.50 || payRate > 10) {
        setError("Pay rate must be between $7.50 and $10.00 per trash can");
        setLoading(false);
        return;
      }

      const serviceAreas = formData.serviceArea
        ? formData.serviceArea.split(",").map((area) => area.trim()).filter(Boolean)
        : [];

      const response = await fetch("/api/partners/team-members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerId,
          userId,
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          serviceArea: serviceAreas,
          payRatePerJob: payRate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to add team member");
      }

      setSuccess(true);
      setTempPassword(data.employee.tempPassword);
      
      // Reset form after showing success
      setTimeout(() => {
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          serviceArea: "",
          payRatePerJob: "10.00",
        });
        setSuccess(false);
        setTempPassword(null);
        if (onSuccess) {
          onSuccess();
        }
      }, 5000);
    } catch (err: any) {
      setError(err.message || "Failed to add team member");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1000,
      padding: "1rem"
    }} onClick={onCancel}>
      <div style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "2rem",
        maxWidth: "600px",
        width: "100%",
        maxHeight: "90vh",
        overflowY: "auto",
        boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
      }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827" }}>Add Team Member</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.5rem",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f3f4f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <svg style={{ width: "24px", height: "24px", color: "#6b7280" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {success ? (
          <div style={{ textAlign: "center", padding: "2rem 0" }}>
            <div style={{
              width: "64px",
              height: "64px",
              background: "#dcfce7",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem"
            }}>
              <svg style={{ width: "32px", height: "32px", color: "#16a34a" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>
              Team Member Added Successfully!
            </h3>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              {formData.firstName} {formData.lastName} has been added to your team.
            </p>
            {tempPassword && (
              <div style={{
                background: "#eff6ff",
                border: "2px solid #93c5fd",
                borderRadius: "12px",
                padding: "1rem",
                marginBottom: "1rem"
              }}>
                <p style={{ fontSize: "0.875rem", fontWeight: "600", color: "#1e40af", marginBottom: "0.5rem" }}>
                  Temporary Password:
                </p>
                <div style={{
                  background: "#ffffff",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  fontFamily: "monospace",
                  fontSize: "1rem",
                  fontWeight: "700",
                  color: "#2563eb",
                  wordBreak: "break-all"
                }}>
                  {tempPassword}
                </div>
                <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
                  Share this password with {formData.firstName}. They'll need to complete training before clocking in.
                </p>
              </div>
            )}
            <div style={{
              background: "#fef3c7",
              border: "1px solid #fcd34d",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1rem"
            }}>
              <p style={{ fontSize: "0.875rem", color: "#92400e", margin: 0 }}>
                <strong>Next Steps:</strong> The team member will receive login credentials and must complete all required training modules before they can clock in for work.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{
              background: "#eff6ff",
              border: "1px solid #93c5fd",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "0.5rem"
            }}>
              <p style={{ fontSize: "0.875rem", color: "#1e40af", margin: 0 }}>
                <strong>Note:</strong> New team members will need to complete training and certification before they can clock in for work.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                  }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                Email *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                Service Areas (comma-separated)
              </label>
              <input
                type="text"
                value={formData.serviceArea}
                onChange={(e) => setFormData({ ...formData, serviceArea: e.target.value })}
                placeholder="e.g., Peachtree City, Fayetteville"
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
                Pay Rate Per Trash Can ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="7.50"
                max="10"
                required
                value={formData.payRatePerJob}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = parseFloat(value);
                  // Enforce min/max in real-time
                  if (value === "" || (!isNaN(numValue) && numValue >= 7.50 && numValue <= 10)) {
                    setFormData({ ...formData, payRatePerJob: value });
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                }}
              />
              <p style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem" }}>
                Minimum: $7.50 | Maximum: $10.00
              </p>
            </div>

            {error && (
              <div style={{
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

            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "0.75rem 1rem",
                  background: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.95rem",
                  fontWeight: "600",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "#1d4ed8";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!loading) {
                    e.currentTarget.style.background = "#2563eb";
                  }
                }}
              >
                {loading ? "Adding..." : "Add Team Member"}
              </button>
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    padding: "0.75rem 1rem",
                    background: "transparent",
                    color: "#6b7280",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "0.95rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#f9fafb";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
