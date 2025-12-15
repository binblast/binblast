// components/AdminDashboard/EmployeeTaxInfo.tsx
"use client";

import { useState, useEffect } from "react";

interface EmployeeTaxInfoProps {
  employeeId: string;
}

export function EmployeeTaxInfo({ employeeId }: EmployeeTaxInfoProps) {
  const [taxInfo, setTaxInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    ssn: "",
    ein: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      zipCode: "",
    },
    signature: "",
    signedDate: "",
  });

  useEffect(() => {
    loadTaxInfo();
  }, [employeeId]);

  async function loadTaxInfo() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/employees/${employeeId}/tax-info`);
      const data = await response.json();

      if (data.success) {
        if (data.taxInfo) {
          setTaxInfo(data.taxInfo);
          setFormData({
            name: data.taxInfo.name || "",
            ssn: data.taxInfo.ssn || "",
            ein: data.taxInfo.ein || "",
            address: {
              line1: data.taxInfo.address?.line1 || "",
              line2: data.taxInfo.address?.line2 || "",
              city: data.taxInfo.address?.city || "",
              state: data.taxInfo.address?.state || "",
              zipCode: data.taxInfo.address?.zipCode || "",
            },
            signature: data.taxInfo.signature || "",
            signedDate: data.taxInfo.signedDate || "",
          });
        }
      }
    } catch (error) {
      console.error("Error loading tax info:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);

    try {
      const response = await fetch(`/api/admin/employees/${employeeId}/tax-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          ssn: formData.ssn,
          ein: formData.ein,
          address: formData.address,
          signature: formData.signature,
          signedDate: formData.signedDate || new Date().toISOString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update tax information");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      await loadTaxInfo();
    } catch (err: any) {
      setError(err.message || "Failed to update tax information");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading tax information...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", padding: "1rem", background: "#fef3c7", borderRadius: "8px", border: "1px solid #fbbf24" }}>
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#92400e" }}>
          <strong>Note:</strong> Employees are W-2 employees, not contractors. W-9 information is collected for potential future contractors/partners.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
            Name (as shown on tax return) *
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.95rem",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
              SSN (Social Security Number)
            </label>
            <input
              type="text"
              value={formData.ssn}
              onChange={(e) => setFormData({ ...formData, ssn: e.target.value })}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
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
              EIN (Employer Identification Number)
            </label>
            <input
              type="text"
              value={formData.ein}
              onChange={(e) => setFormData({ ...formData, ein: e.target.value })}
              placeholder="XX-XXXXXXX"
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
            Address Line 1 *
          </label>
          <input
            type="text"
            required
            value={formData.address.line1}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, line1: e.target.value }
            })}
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
            Address Line 2
          </label>
          <input
            type="text"
            value={formData.address.line2}
            onChange={(e) => setFormData({
              ...formData,
              address: { ...formData.address, line2: e.target.value }
            })}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.95rem",
            }}
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: "500", marginBottom: "0.5rem", color: "#111827" }}>
              City *
            </label>
            <input
              type="text"
              required
              value={formData.address.city}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, city: e.target.value }
              })}
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
              State *
            </label>
            <input
              type="text"
              required
              value={formData.address.state}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, state: e.target.value }
              })}
              maxLength={2}
              placeholder="CA"
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
              ZIP Code *
            </label>
            <input
              type="text"
              required
              value={formData.address.zipCode}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, zipCode: e.target.value }
              })}
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
            Signature (name or upload)
          </label>
          <input
            type="text"
            value={formData.signature}
            onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
            placeholder="Full name as signature"
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
            Date Signed
          </label>
          <input
            type="date"
            value={formData.signedDate ? formData.signedDate.split("T")[0] : ""}
            onChange={(e) => setFormData({ ...formData, signedDate: e.target.value })}
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

        {success && (
          <div style={{
            padding: "0.75rem 1rem",
            background: "#dcfce7",
            border: "1px solid #86efac",
            borderRadius: "8px",
            color: "#16a34a",
            fontSize: "0.875rem"
          }}>
            Tax information saved successfully
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.75rem 1rem",
            background: "#16a34a",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.95rem",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Tax Information"}
        </button>
      </form>
    </div>
  );
}
