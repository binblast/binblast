"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";


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
  notes: string;
  source: string;
  createdAt: string | null;
}

type SortField = "createdAt" | "name" | "email" | "heardAboutUs" | "referredBy" | "status";
type SortDirection = "asc" | "desc";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "#166534", bg: "#ecfdf5", border: "#bbf7d0" },
  { value: "contacted", label: "Contacted", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { value: "converted", label: "Converted", color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "archived", label: "Archived", color: "#6b7280", bg: "#f9fafb", border: "#e5e7eb" },
  { value: "spam", label: "Spam", color: "#b91c1c", bg: "#fef2f2", border: "#fecaca" },
] as const;

function getStatusStyle(status: string) {
  return STATUS_OPTIONS.find((option) => option.value === status) || STATUS_OPTIONS[0];
}

export function SiteLeadsManagement() {
  const [leads, setLeads] = useState<SiteLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSource, setFilterSource] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/admin/site-leads");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load site leads");
      }
      setLeads(data.leads || []);
      setSelectedIds(new Set());
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

    if (filterStatus !== "all") {
      result = result.filter((lead) => lead.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (lead) =>
          lead.name.toLowerCase().includes(query) ||
          lead.email.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.referredBy.toLowerCase().includes(query) ||
          lead.notes.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortField === "createdAt") {
        return direction * (a.createdAt || "").localeCompare(b.createdAt || "");
      }

      const aValue = (a[sortField] || "").toLowerCase();
      const bValue = (b[sortField] || "").toLowerCase();
      return direction * aValue.localeCompare(bValue);
    });

    return result;
  }, [leads, filterSource, filterStatus, searchQuery, sortField, sortDirection]);

  const sourceOptions = useMemo(() => {
    return [...new Set(leads.map((lead) => lead.heardAboutUs).filter(Boolean))].sort();
  }, [leads]);

  const allVisibleSelected =
    filteredLeads.length > 0 && filteredLeads.every((lead) => selectedIds.has(lead.id));

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

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDirection(field === "createdAt" ? "desc" : "asc");
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return "↕";
    return sortDirection === "asc" ? "↑" : "↓";
  }

  function toggleSelectAllVisible() {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredLeads.map((lead) => lead.id)));
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function updateLeadStatus(id: string, status: string) {
    setActionError(null);
    setBusyIds((current) => new Set(current).add(id));
    try {
      const response = await fetchWithAuth(`/api/admin/site-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update lead");
      }
      setLeads((current) =>
        current.map((lead) => (lead.id === id ? { ...lead, status } : lead))
      );
    } catch (updateError: unknown) {
      setActionError(updateError instanceof Error ? updateError.message : "Failed to update lead");
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function deleteLead(id: string, name: string) {
    if (!window.confirm(`Delete lead for ${name}? This cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setBusyIds((current) => new Set(current).add(id));
    try {
      const response = await fetchWithAuth(`/api/admin/site-leads/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete lead");
      }
      setLeads((current) => current.filter((lead) => lead.id !== id));
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    } catch (deleteError: unknown) {
      setActionError(deleteError instanceof Error ? deleteError.message : "Failed to delete lead");
    } finally {
      setBusyIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function runBulkAction(action: "delete" | "updateStatus", status?: string) {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    if (action === "delete") {
      if (!window.confirm(`Delete ${ids.length} selected lead${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) {
        return;
      }
    }

    setActionError(null);
    setBulkBusy(true);
    try {
      const response = await fetchWithAuth("/api/admin/site-leads/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids, status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Bulk action failed");
      }

      if (action === "delete") {
        setLeads((current) => current.filter((lead) => !selectedIds.has(lead.id)));
      } else if (status) {
        setLeads((current) =>
          current.map((lead) => (selectedIds.has(lead.id) ? { ...lead, status } : lead))
        );
      }
      setSelectedIds(new Set());
    } catch (bulkError: unknown) {
      setActionError(bulkError instanceof Error ? bulkError.message : "Bulk action failed");
    } finally {
      setBulkBusy(false);
    }
  }

  function exportCsv() {
    const rows = filteredLeads.map((lead) => [
      formatDate(lead.createdAt),
      lead.name,
      lead.email,
      lead.phone,
      lead.heardAboutUs,
      lead.referredBy,
      lead.status,
      lead.referralCode,
      lead.partnerCode,
      lead.utmSource,
      lead.landingPage,
      lead.notes,
    ]);

    const headers = [
      "Captured",
      "Name",
      "Email",
      "Phone",
      "Heard About Us",
      "Referred By",
      "Status",
      "Referral Code",
      "Partner Code",
      "UTM Source",
      "Landing Page",
      "Notes",
    ];

    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((row) => row.map((cell) => escape(String(cell || ""))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `site-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const buttonStyle = {
    padding: "0.5rem 0.875rem",
    borderRadius: "8px",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    fontSize: "0.8125rem",
    fontWeight: "600" as const,
    cursor: "pointer",
  };

  const dangerButtonStyle = {
    ...buttonStyle,
    border: "1px solid #fecaca",
    background: "#fef2f2",
    color: "#b91c1c",
  };

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
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={exportCsv} disabled={filteredLeads.length === 0} style={buttonStyle}>
            Export CSV
          </button>
          <button type="button" onClick={loadLeads} style={buttonStyle}>
            Refresh
          </button>
        </div>
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
        <div style={{ background: "#eff6ff", borderRadius: "10px", padding: "0.875rem 1rem", border: "1px solid #bfdbfe" }}>
          <div style={{ fontSize: "0.75rem", color: "#1d4ed8", fontWeight: "600" }}>Showing</div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: "#1d4ed8" }}>{filteredLeads.length}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            width: "100%",
            padding: "0.75rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
          }}
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "1rem",
            padding: "0.75rem 1rem",
            background: "#f9fafb",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
          }}
        >
          <span style={{ fontSize: "0.8125rem", fontWeight: "600", color: "#374151" }}>
            {selectedIds.size} selected
          </span>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => runBulkAction("updateStatus", "contacted")}
            style={buttonStyle}
          >
            Mark Contacted
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => runBulkAction("updateStatus", "archived")}
            style={buttonStyle}
          >
            Archive
          </button>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={() => runBulkAction("delete")}
            style={dangerButtonStyle}
          >
            Delete Selected
          </button>
        </div>
      )}

      {actionError && (
        <p style={{ color: "#dc2626", marginBottom: "1rem", fontSize: "0.875rem" }}>{actionError}</p>
      )}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading leads...</p>
      ) : error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : filteredLeads.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No leads match your filters.</p>
      ) : (
        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "1100px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "0.75rem", width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    aria-label="Select all visible leads"
                  />
                </th>
                {[
                  { label: "Captured", field: "createdAt" as SortField },
                  { label: "Name", field: "name" as SortField },
                  { label: "Contact", field: "email" as SortField },
                  { label: "Heard About Us", field: "heardAboutUs" as SortField },
                  { label: "Referred By", field: "referredBy" as SortField },
                  { label: "Status", field: "status" as SortField },
                ].map(({ label, field }) => (
                  <th
                    key={label}
                    style={{
                      padding: "0.75rem",
                      textAlign: "left",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      color: "#374151",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                    onClick={() => toggleSort(field)}
                  >
                    {label} {sortIndicator(field)}
                  </th>
                ))}
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "left",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Attribution
                </th>
                <th
                  style={{
                    padding: "0.75rem",
                    textAlign: "right",
                    fontSize: "0.8125rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => {
                const statusStyle = getStatusStyle(lead.status);
                const isBusy = busyIds.has(lead.id);
                return (
                  <tr key={lead.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.75rem" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        aria-label={`Select ${lead.name}`}
                      />
                    </td>
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
                    <td style={{ padding: "0.75rem" }}>
                      <select
                        value={lead.status}
                        disabled={isBusy}
                        onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                        style={{
                          padding: "0.35rem 0.5rem",
                          borderRadius: "999px",
                          border: `1px solid ${statusStyle.border}`,
                          background: statusStyle.bg,
                          color: statusStyle.color,
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          cursor: isBusy ? "not-allowed" : "pointer",
                        }}
                      >
                        {STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                      {lead.referralCode && <div>Ref: {lead.referralCode}</div>}
                      {lead.partnerCode && <div>Partner: {lead.partnerCode}</div>}
                      {lead.utmSource && <div>UTM: {lead.utmSource}</div>}
                      {lead.landingPage && <div>Page: {lead.landingPage}</div>}
                      {!lead.referralCode && !lead.partnerCode && !lead.utmSource && !lead.landingPage && "—"}
                    </td>
                    <td style={{ padding: "0.75rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => deleteLead(lead.id, lead.name)}
                        style={{
                          ...dangerButtonStyle,
                          padding: "0.35rem 0.65rem",
                          fontSize: "0.75rem",
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
