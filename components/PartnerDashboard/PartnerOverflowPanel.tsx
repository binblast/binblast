"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { DEFAULT_MAX_JOBS_PER_DAY } from "@/lib/partner-overflow";

interface OverflowOffer {
  id: string;
  jobId: string;
  scheduledDate: string;
  city: string;
  zipCode: string;
  customerName: string;
  addressLine1: string;
  binsCount: number;
  status: string;
  expiresAt: string | null;
}

export function PartnerOverflowPanel() {
  const [acceptsOverflow, setAcceptsOverflow] = useState(false);
  const [maxJobsPerDay, setMaxJobsPerDay] = useState(DEFAULT_MAX_JOBS_PER_DAY);
  const [offers, setOffers] = useState<OverflowOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyOfferId, setBusyOfferId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [settingsResponse, offersResponse] = await Promise.all([
        fetchWithAuth("/api/partners/overflow-settings"),
        fetchWithAuth("/api/partners/overflow-offers"),
      ]);
      const settingsData = await settingsResponse.json();
      const offersData = await offersResponse.json();

      if (!settingsResponse.ok) {
        throw new Error(settingsData.error || "Failed to load overflow settings");
      }
      if (!offersResponse.ok) {
        throw new Error(offersData.error || "Failed to load overflow offers");
      }

      setAcceptsOverflow(Boolean(settingsData.settings?.acceptsOverflow));
      setMaxJobsPerDay(Number(settingsData.settings?.maxJobsPerDay || DEFAULT_MAX_JOBS_PER_DAY));
      setOffers(offersData.offers || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load overflow data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveSettings() {
    try {
      setSaving(true);
      setMessage(null);
      setError(null);
      const response = await fetchWithAuth("/api/partners/overflow-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptsOverflow, maxJobsPerDay }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save overflow settings");
      }
      setMessage("Overflow settings saved.");
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save overflow settings");
    } finally {
      setSaving(false);
    }
  }

  async function respondToOffer(offerId: string, action: "accept" | "decline") {
    try {
      setBusyOfferId(offerId);
      setError(null);
      const response = await fetchWithAuth(`/api/partners/overflow-offers/${offerId}/${action}`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} offer`);
      }
      setMessage(action === "accept" ? "Overflow job accepted." : "Offer declined.");
      await loadData();
    } catch (respondError: unknown) {
      setError(respondError instanceof Error ? respondError.message : `Failed to ${action} offer`);
    } finally {
      setBusyOfferId(null);
    }
  }

  const pendingOffers = offers.filter((offer) => offer.status === "pending");

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
        Overflow Jobs
      </h2>
      <p style={{ color: "#6b7280", fontSize: "0.95rem", marginBottom: "1.25rem", maxWidth: "720px" }}>
        Pick up extra jobs when you have capacity, or send overflow work to the partner network when you are booked out.
      </p>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading overflow settings...</p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "1rem",
              marginBottom: "1rem",
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "12px",
              border: "1px solid #e5e7eb",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={acceptsOverflow}
                onChange={(e) => setAcceptsOverflow(e.target.checked)}
              />
              Accept overflow jobs
            </label>
            <label style={{ display: "grid", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Max jobs per day</span>
              <input
                type="number"
                min={1}
                max={50}
                value={maxJobsPerDay}
                onChange={(e) => setMaxJobsPerDay(Number(e.target.value) || DEFAULT_MAX_JOBS_PER_DAY)}
                style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
              />
            </label>
            <div style={{ display: "flex", alignItems: "end" }}>
              <button
                type="button"
                onClick={saveSettings}
                disabled={saving}
                style={{
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  border: "none",
                  background: saving ? "#9ca3af" : "#2563eb",
                  color: "#ffffff",
                  fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                }}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>

          {message && <p style={{ color: "#166534", marginBottom: "0.75rem" }}>{message}</p>}
          {error && <p style={{ color: "#dc2626", marginBottom: "0.75rem" }}>{error}</p>}

          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.75rem" }}>
            Available Overflow Offers ({pendingOffers.length})
          </h3>

          {pendingOffers.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No pending overflow offers right now.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {pendingOffers.map((offer) => (
                <div
                  key={offer.id}
                  style={{
                    border: "1px solid #fcd34d",
                    background: "#fffbeb",
                    borderRadius: "12px",
                    padding: "1rem",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#92400e" }}>{offer.customerName}</div>
                  <div style={{ color: "#78350f", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                    {offer.addressLine1 || offer.city || "Address on file"}
                    {offer.city ? ` · ${offer.city}` : ""}
                    {offer.zipCode ? ` ${offer.zipCode}` : ""}
                  </div>
                  <div style={{ color: "#92400e", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                    Scheduled {offer.scheduledDate} · {offer.binsCount} bin{offer.binsCount === 1 ? "" : "s"}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      disabled={busyOfferId === offer.id}
                      onClick={() => respondToOffer(offer.id, "accept")}
                      style={{
                        padding: "0.625rem 1rem",
                        borderRadius: "8px",
                        border: "none",
                        background: "#16a34a",
                        color: "#ffffff",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Accept Job
                    </button>
                    <button
                      type="button"
                      disabled={busyOfferId === offer.id}
                      onClick={() => respondToOffer(offer.id, "decline")}
                      style={{
                        padding: "0.625rem 1rem",
                        borderRadius: "8px",
                        border: "1px solid #e5e7eb",
                        background: "#ffffff",
                        color: "#374151",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
