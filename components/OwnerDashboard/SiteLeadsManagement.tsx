"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface SiteLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  referredBy: string;
  heardAboutUs: string;
  referralCode: string;
  partnerCode: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingPage: string;
  pageReferrer: string;
  status: string;
  source: string;
  createdAt: string | null;
}

export function SiteLeadsManagement() {
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/site-leads");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load site leads");
      }
      setLeads(data.leads || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load site leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const filteredLeads = useMemo(() => {
    let result = [...leads];

    if (filterSource !== "all") {
      result = result.filter((lead) => lead.heardAboutUs === filterSource);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.referredBy.toLowerCase().includes(query)
      );
    }

    return result;
  }, [leads, filterSource, searchQuery]);

  const sourceOptions = useMemo(() => {
    return [...new Set(leads.map((lead) => lead.heardAboutUs).filter(Boolean))].sort();
  }, [leads]);

  function formatDate(value: string | null) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        border: "1px solid #e5e7eb",
        padding: "1.5rem",
        marginBottom: "2rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: "700", color: "#111827" }}>
            Website Lead Capture
          </h3>
          <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
            Visitors who shared their info before browsing the site.
          </p>
        </div>
        <button
          type="button"
          onClick={loadLeads}
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
            fontSize: "0.8125rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <div style={{ background: "#f9fafb", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid #e5e7eb" }}>
          <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>Total Leads</div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#111827" }}>{leads.length}</div>
        </div>
        <div style={{ background: "#ecfdf5", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid #bbf7d0" }}>
          <div style={{ fontSize: "0.75rem", color: "#166534", fontWeight: "600" }}>New</div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#166534" }}>
            {leads.filter((lead) => lead.status === "new").length}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <input
          type="search"
          placeholder="Search name, email, phone, referral..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        />
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">All sources</option>
          {sourceOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading leads...</p>
      ) : error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : filteredLeads.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No leads captured yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                {["Captured", "Name", "Contact", "Heard About Us", "Referred By", "Attribution"].map((label) => (
                  <th
                    key={label}
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      color: "#374151",
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem", fontSize: "0.8125rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {formatDate(lead.createdAt)}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
                    {lead.name}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.8125rem", color: "#374151" }}>
                    <div>{lead.email}</div>
                    <div>{lead.phone}</div>
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.8125rem", color: "#374151" }}>
                    {lead.heardAboutUs || "—"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.8125rem", color: "#374151" }}>
                    {lead.referredBy || "—"}
                  </td>
                  <td style={{ padding: "0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                    {lead.referralCode && <div>Ref: {lead.referralCode}</div>}
                    {lead.partnerCode && <div>Partner: {lead.partnerCode}</div>}
                    {lead.utmSource && <div>UTM: {lead.utmSource}</div>}
                    {lead.landingPage && <div>Page: {lead.landingPage}</div>}
                    {!lead.referralCode && !lead.partnerCode && !lead.utmSource && !lead.landingPage && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
