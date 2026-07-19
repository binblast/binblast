"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { buildPartnerBookingLink } from "@/lib/partner-links";
import { PARTNER_LEAD_STATUS_OPTIONS } from "@/lib/partner-types";

interface PartnerLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  referredBy: string;
  heardAboutUs: string;
  status: string;
  notes: string;
  createdAt: string | null;
}

interface PartnerLeadsPanelProps {
  partnerCode: string;
}

export function PartnerLeadsPanel({ partnerCode }: PartnerLeadsPanelProps) {
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedLeadId, setCopiedLeadId] = useState<string | null>(null);

  const bookingLink =
    typeof window !== "undefined" && partnerCode
      ? buildPartnerBookingLink(window.location.origin, partnerCode)
      : "";

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/partners/leads");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load leads");
      }
      setLeads(data.leads || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  async function updateLeadStatus(leadId: string, status: string) {
    try {
      setBusyId(leadId);
      const response = await fetchWithAuth("/api/partners/leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update lead");
      }
      setLeads((current) =>
        current.map((lead) => (lead.id === leadId ? { ...lead, status } : lead))
      );
    } catch (updateError: unknown) {
      alert(updateError instanceof Error ? updateError.message : "Failed to update lead");
    } finally {
      setBusyId(null);
    }
  }

  async function copyBookingLink(leadId: string) {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopiedLeadId(leadId);
      setTimeout(() => setCopiedLeadId(null), 2000);
    } catch {
      alert("Could not copy booking link");
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
            Partner Leads
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", maxWidth: "640px" }}>
            Leads assigned to you from Bin Blast Co. Follow up quickly, update status, and send your booking link to close.
          </p>
        </div>
        <button
          onClick={loadLeads}
          style={{
            padding: "0.625rem 1rem",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading leads...</p>
      ) : error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : leads.length === 0 ? (
        <div style={{ background: "#f9fafb", borderRadius: "12px", padding: "1.25rem", border: "1px dashed #d1d5db" }}>
          <p style={{ color: "#374151", marginBottom: "0.5rem" }}>
            No leads assigned yet.
          </p>
          <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
            Share your booking link and promote in your service area — new leads routed to you will appear here.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem" }}>
          {leads.map((lead) => (
            <div
              key={lead.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1rem",
                background: lead.status === "new" ? "#f0fdf4" : "#ffffff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: "700", color: "#111827", fontSize: "1.05rem" }}>{lead.name}</div>
                  <div style={{ color: "#6b7280", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                    {lead.email} · {lead.phone}
                  </div>
                  <div style={{ color: "#6b7280", fontSize: "0.85rem", marginTop: "0.35rem" }}>
                    Heard about us: {lead.heardAboutUs || "—"}
                  </div>
                  {lead.createdAt && (
                    <div style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: "0.35rem" }}>
                      Received {new Date(lead.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.625rem",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      textTransform: "uppercase",
                    }}
                  >
                    {lead.status}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
                {PARTNER_LEAD_STATUS_OPTIONS.filter((option) => option.value !== "new" && option.value !== "converted").map((option) => (
                  <button
                    key={option.value}
                    disabled={busyId === lead.id || lead.status === option.value}
                    onClick={() => updateLeadStatus(lead.id, option.value)}
                    style={{
                      padding: "0.5rem 0.875rem",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      background: lead.status === option.value ? "#2563eb" : "#ffffff",
                      color: lead.status === option.value ? "#ffffff" : "#374151",
                      fontWeight: "600",
                      fontSize: "0.85rem",
                      cursor: busyId === lead.id ? "not-allowed" : "pointer",
                    }}
                  >
                    {option.label}
                  </button>
                ))}
                <button
                  onClick={() => copyBookingLink(lead.id)}
                  style={{
                    padding: "0.5rem 0.875rem",
                    borderRadius: "8px",
                    border: "none",
                    background: "#16a34a",
                    color: "#ffffff",
                    fontWeight: "600",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  {copiedLeadId === lead.id ? "Link Copied!" : "Copy Booking Link"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
