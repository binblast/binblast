"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface PartnerReferral {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  serviceAddress: string;
  serviceCity: string;
  serviceZipCode: string;
  propertyType: string;
  notes: string;
  status: string;
  referralFeePercent: number;
  createdAt: string | null;
}

const EMPTY_FORM = {
  customerName: "",
  email: "",
  phone: "",
  serviceAddress: "",
  serviceCity: "",
  serviceZipCode: "",
  propertyType: "residential",
  notes: "",
};

export function PartnerReferralsPanel() {
  const [referrals, setReferrals] = useState<PartnerReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/partners/referrals");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load referrals");
      }
      setReferrals(data.referrals || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithAuth("/api/partners/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit referral");
      }
      setSuccess(data.message || "Referral submitted.");
      setForm(EMPTY_FORM);
      await loadReferrals();
    } catch (submitError: unknown) {
      setError(submitError instanceof Error ? submitError.message : "Failed to submit referral");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e5e7eb",
        marginBottom: "2rem",
      }}
    >
      <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
        Out-of-Area Referrals
      </h2>
      <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "1.25rem", maxWidth: "720px" }}>
        Send us a lead outside your service area. When Bin Blast Co. closes the job, you earn a referral fee.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "0.875rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.875rem" }}>
          <input
            required
            placeholder="Customer name"
            value={form.customerName}
            onChange={(e) => setForm((current) => ({ ...current, customerName: e.target.value }))}
            style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
            style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
          <input
            required
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((current) => ({ ...current, phone: e.target.value }))}
            style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.875rem" }}>
          <input
            placeholder="Service address"
            value={form.serviceAddress}
            onChange={(e) => setForm((current) => ({ ...current, serviceAddress: e.target.value }))}
            style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
          <input
            placeholder="City"
            value={form.serviceCity}
            onChange={(e) => setForm((current) => ({ ...current, serviceCity: e.target.value }))}
            style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
          <input
            placeholder="ZIP code"
            value={form.serviceZipCode}
            onChange={(e) => setForm((current) => ({ ...current, serviceZipCode: e.target.value }))}
            style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </div>
        <select
          value={form.propertyType}
          onChange={(e) => setForm((current) => ({ ...current, propertyType: e.target.value }))}
          style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", maxWidth: "280px" }}
        >
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
          <option value="hoa">HOA / Neighborhood</option>
        </select>
        <textarea
          placeholder="Notes about the job, timing, or special requirements"
          value={form.notes}
          onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
          rows={3}
          style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", resize: "vertical" }}
        />
        {error && <p style={{ color: "#dc2626", margin: 0 }}>{error}</p>}
        {success && <p style={{ color: "#166534", margin: 0 }}>{success}</p>}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: "0.875rem 1.25rem",
            background: submitting ? "#9ca3af" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontWeight: "700",
            cursor: submitting ? "not-allowed" : "pointer",
            width: "fit-content",
          }}
        >
          {submitting ? "Submitting..." : "Submit Referral"}
        </button>
      </form>

      <h3 style={{ fontSize: "1.125rem", fontWeight: "700", color: "#111827", marginBottom: "0.75rem" }}>
        Your Submitted Referrals
      </h3>
      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading referrals...</p>
      ) : referrals.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No referrals submitted yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {referrals.map((referral) => (
            <div
              key={referral.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "10px",
                padding: "0.875rem",
                background: "#f9fafb",
              }}
            >
              <div style={{ fontWeight: "700", color: "#111827" }}>{referral.customerName}</div>
              <div style={{ color: "#6b7280", fontSize: "0.9rem" }}>
                {referral.serviceCity || referral.serviceAddress || "Location TBD"} · {referral.propertyType}
              </div>
              <div style={{ marginTop: "0.35rem", fontSize: "0.85rem", color: "#374151" }}>
                Status: <strong>{referral.status}</strong>
                {referral.referralFeePercent > 0 && (
                  <> · Fee: {(referral.referralFeePercent * 100).toFixed(0)}%</>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
