"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface PartnerReferralRow {
  id: string;
  referringPartnerName: string;
  customerName: string;
  email: string;
  phone: string;
  serviceAddress: string;
  serviceCity: string;
  propertyType: string;
  status: string;
  createdAt: string | null;
}

const STATUS_OPTIONS = ["pending", "assigned", "converted", "rejected", "paid"];

export function PartnerReferralsAdminPanel() {
  const [referrals, setReferrals] = useState<PartnerReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReferrals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/admin/partner-referrals");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load partner referrals");
      }
      setReferrals(data.referrals || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load partner referrals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  async function updateStatus(referralId: string, status: string) {
    const response = await fetchWithAuth("/api/admin/partner-referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralId, status }),
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.error || "Failed to update referral");
      return;
    }
    setReferrals((current) =>
      current.map((referral) => (referral.id === referralId ? { ...referral, status } : referral))
    );
  }

  return (
    <div className="pp-panel" style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Partner Referrals Queue</h3>
          <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
            Out-of-area leads submitted by partners for routing and referral fees.
          </p>
        </div>
        <button type="button" onClick={loadReferrals} style={{ padding: "0.5rem 0.875rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading referrals...</p>
      ) : error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : referrals.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No partner referrals yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {referrals.map((referral) => (
            <div key={referral.id} style={{ border: "1px solid #e5e7eb", borderRadius: "10px", padding: "1rem", background: "#f9fafb" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827" }}>{referral.customerName}</div>
                  <div style={{ color: "#6b7280", fontSize: "0.875rem" }}>
                    From {referral.referringPartnerName} · {referral.serviceCity || referral.serviceAddress || "Location TBD"}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "0.8125rem", marginTop: "0.25rem" }}>
                    {referral.email} · {referral.phone}
                  </div>
                </div>
                <select
                  value={referral.status}
                  onChange={(e) => updateStatus(referral.id, e.target.value)}
                  style={{ padding: "0.5rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
