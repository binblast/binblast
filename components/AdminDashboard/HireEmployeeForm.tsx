// components/AdminDashboard/HireEmployeeForm.tsx
"use client";

import { useState } from "react";

interface HireEmployeeFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function HireEmployeeForm({ onSuccess, onCancel }: HireEmployeeFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    serviceArea: "",
    payRatePerJob: "10",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const serviceAreas = formData.serviceArea
        ? formData.serviceArea.split(",").map((area) => area.trim()).filter(Boolean)
        : [];

      const response = await fetch("/api/admin/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone || null,
          serviceArea: serviceAreas,
          payRatePerJob: parseFloat(formData.payRatePerJob),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create employee account");
      }

      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        serviceArea: "",
        payRatePerJob: "10",
      });
    } catch (err: any) {
      setError(err.message || "Failed to create employee account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
          placeholder="e.g., City1, City2, ZipCode1"
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
          Pay Rate Per Job ($)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={formData.payRatePerJob}
          onChange={(e) => setFormData({ ...formData, payRatePerJob: e.target.value })}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.95rem",
          }}
        />
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
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.95rem",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Creating..." : "Create Employee Account"}
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
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
