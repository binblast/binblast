"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  CAREER_APPLICATION_STATUS_LABELS,
  type CareerApplicationRecord,
  type CareerApplicationStatus,
} from "@/lib/careers-types";

const ALL_STATUSES = Object.keys(CAREER_APPLICATION_STATUS_LABELS) as CareerApplicationStatus[];

type SortDirection = "newest" | "oldest";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusColor(status: CareerApplicationStatus): { bg: string; color: string } {
  switch (status) {
    case "hired":
      return { bg: "#dcfce7", color: "#166534" };
    case "not_selected":
    case "withdrawn":
      return { bg: "#fef2f2", color: "#dc2626" };
    case "offer_sent":
      return { bg: "#dbeafe", color: "#1d4ed8" };
    default:
      return { bg: "#fef3c7", color: "#b45309" };
  }
}

export function CareerApplicationsHub() {
  const [applications, setApplications] = useState<CareerApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [recruiterName, setRecruiterName] = useState("");
  const [interviewAt, setInterviewAt] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [statusDraft, setStatusDraft] = useState<CareerApplicationStatus>("application_received");

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const query = params.toString();

      const response = await fetchWithAuth(`/api/admin/careers/applications${query ? `?${query}` : ""}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load applications.");
      }

      setApplications(data.applications || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  const sortedApplications = useMemo(() => {
    const copy = [...applications];
    copy.sort((a, b) => {
      const aTime = new Date(a.submittedAt).getTime();
      const bTime = new Date(b.submittedAt).getTime();
      return sortDirection === "newest" ? bTime - aTime : aTime - bTime;
    });
    return copy;
  }, [applications, sortDirection]);

  const selected = sortedApplications.find((app) => app.id === selectedId) || null;

  useEffect(() => {
    if (selected) {
      setRecruiterName(selected.assignedRecruiterName || "");
      setInterviewAt(selected.interviewScheduledAt ? selected.interviewScheduledAt.slice(0, 16) : "");
      setStatusDraft(selected.status);
      setAdminNote("");
    }
  }, [selected]);

  async function updateApplication(body: Record<string, unknown>) {
    if (!selected) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/admin/careers/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: selected.id, ...body }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update application.");
      }

      const updated = data.application as CareerApplicationRecord;
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
      setAdminNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update application.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleSaveChanges() {
    await updateApplication({
      status: statusDraft,
      assignedRecruiterName: recruiterName.trim() || null,
      interviewScheduledAt: interviewAt ? new Date(interviewAt).toISOString() : null,
      adminNote: adminNote.trim() || undefined,
    });
  }

  async function handleHire() {
    if (!selected) return;
    if (!confirm(`Mark ${selected.personal.firstName} ${selected.personal.lastName} as hired?`)) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/admin/careers/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selected.id,
          adminNote: adminNote.trim() || "Applicant hired via admin dashboard",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to hire applicant.");
      }

      const updated = data.application as CareerApplicationRecord;
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
      setStatusDraft("hired");
      setAdminNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to hire applicant.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selected) return;
    if (!confirm(`Mark ${selected.personal.firstName} ${selected.personal.lastName} as not selected?`)) return;
    await updateApplication({
      status: "not_selected",
      adminNote: adminNote.trim() || "Applicant not selected",
    });
    setStatusDraft("not_selected");
  }

  async function handleExportCsv() {
    setExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams({ format: "csv" });
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const response = await fetchWithAuth(`/api/admin/careers/applications?${params.toString()}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to export CSV.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "career-applications.csv";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to export CSV.");
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading career applications...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Career Applications</h3>
          <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.9375rem" }}>
            {sortedApplications.length} application{sortedApplications.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          style={{
            padding: "0.625rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            background: "white",
            fontWeight: 600,
            cursor: exporting ? "not-allowed" : "pointer",
          }}
        >
          {exporting ? "Exporting..." : "Export CSV"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <input
          type="search"
          placeholder="Search name, email, position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "0.625rem 0.875rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: "0.625rem 0.875rem", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}
        >
          <option value="">All statuses</option>
          {ALL_STATUSES.map((status) => (
            <option key={status} value={status}>
              {CAREER_APPLICATION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <select
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value as SortDirection)}
          style={{ padding: "0.625rem 0.875rem", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        <button
          type="button"
          onClick={loadApplications}
          style={{ padding: "0.625rem 0.875rem", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white", fontWeight: 600, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) minmax(320px, 1.2fr)", gap: "1.25rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "720px", overflowY: "auto" }}>
          {sortedApplications.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
              No applications found
            </div>
          ) : (
            sortedApplications.map((app) => {
              const colors = statusColor(app.status);
              const isSelected = app.id === selectedId;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setSelectedId(app.id)}
                  style={{
                    textAlign: "left",
                    padding: "1rem",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid #16a34a" : "1px solid #e5e7eb",
                    background: isSelected ? "#f0fdf4" : "white",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                    {app.personal.firstName} {app.personal.lastName}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.35rem" }}>{app.personal.email}</div>
                  <div style={{ fontSize: "0.8125rem", color: "#374151", marginBottom: "0.5rem" }}>{app.positionTitle}</div>
                  <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 700, background: colors.bg, color: colors.color }}>
                    {CAREER_APPLICATION_STATUS_LABELS[app.status]}
                  </span>
                  <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "0.5rem" }}>
                    Submitted {formatDate(app.submittedAt)}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div style={{ padding: "1.25rem", border: "1px solid #e5e7eb", borderRadius: "12px", background: "white", minHeight: "420px" }}>
          {!selected ? (
            <div style={{ padding: "2rem 0", textAlign: "center", color: "#6b7280" }}>
              Select an application to review details
            </div>
          ) : (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <h4 style={{ margin: "0 0 0.35rem", fontSize: "1.125rem", fontWeight: 700 }}>
                  {selected.personal.firstName} {selected.personal.lastName}
                </h4>
                <p style={{ margin: "0 0 0.25rem", color: "#6b7280" }}>{selected.personal.email}</p>
                <p style={{ margin: "0 0 0.25rem", color: "#6b7280" }}>{selected.personal.phone}</p>
                <p style={{ margin: 0, color: "#374151", fontWeight: 600 }}>{selected.positionTitle}</p>
              </div>

              <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1.25rem", fontSize: "0.875rem", color: "#374151" }}>
                <div>
                  <strong>Location:</strong> {selected.personal.city}, {selected.personal.state} {selected.personal.zip}
                </div>
                <div>
                  <strong>Submitted:</strong> {formatDate(selected.submittedAt)}
                </div>
                <div>
                  <strong>Employment preference:</strong> {selected.availability.employmentPreference || "—"}
                </div>
                <div>
                  <strong>Desired start:</strong> {selected.availability.desiredStartDate || "—"}
                </div>
                {selected.joinTalentPool && (
                  <div>
                    <strong>Talent pool:</strong> Yes{selected.talentPoolDesiredRole ? ` · ${selected.talentPoolDesiredRole}` : ""}
                  </div>
                )}
              </div>

              <details style={{ marginBottom: "1.25rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: "0.75rem" }}>Experience & answers</summary>
                <div style={{ display: "grid", gap: "0.75rem", fontSize: "0.875rem", color: "#4b5563" }}>
                  <p style={{ margin: 0 }}>
                    <strong>Previous employer:</strong> {selected.experience.previousEmployer} ({selected.experience.yearsWorked} yrs)
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Tags:</strong> {selected.experience.experienceTags.join(", ") || "—"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Why Bin Blast:</strong> {selected.shortAnswers.whyBinBlast}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Why hire you:</strong> {selected.shortAnswers.whyHireYou}
                  </p>
                </div>
              </details>

              <details style={{ marginBottom: "1.25rem" }}>
                <summary style={{ cursor: "pointer", fontWeight: 600, marginBottom: "0.75rem" }}>Documents</summary>
                <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.875rem", lineHeight: 1.8 }}>
                  <li>
                    Resume:{" "}
                    {selected.documents.resumeUrl ? (
                      <a href={selected.documents.resumeUrl} target="_blank" rel="noopener noreferrer">View</a>
                    ) : (
                      "—"
                    )}
                  </li>
                  <li>
                    Driver&apos;s license:{" "}
                    {selected.documents.driversLicenseUrl ? (
                      <a href={selected.documents.driversLicenseUrl} target="_blank" rel="noopener noreferrer">View</a>
                    ) : (
                      "—"
                    )}
                  </li>
                </ul>
              </details>

              {selected.adminNotes.length > 0 && (
                <div style={{ marginBottom: "1.25rem" }}>
                  <strong style={{ display: "block", marginBottom: "0.5rem" }}>Admin notes</strong>
                  <ul style={{ margin: 0, paddingLeft: "1.1rem", fontSize: "0.875rem", color: "#4b5563" }}>
                    {selected.adminNotes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.875rem", fontWeight: 600 }}>
                  Assigned recruiter
                  <input
                    type="text"
                    value={recruiterName}
                    onChange={(e) => setRecruiterName(e.target.value)}
                    placeholder="Recruiter name"
                    style={{ padding: "0.625rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.875rem", fontWeight: 600 }}>
                  Interview scheduled
                  <input
                    type="datetime-local"
                    value={interviewAt}
                    onChange={(e) => setInterviewAt(e.target.value)}
                    style={{ padding: "0.625rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "8px" }}
                  />
                </label>

                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.875rem", fontWeight: 600 }}>
                  Status
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as CareerApplicationStatus)}
                    style={{ padding: "0.625rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "8px", background: "white" }}
                  >
                    {ALL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {CAREER_APPLICATION_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.875rem", fontWeight: 600 }}>
                  Add note (optional)
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    placeholder="Internal note saved with status update"
                    style={{ padding: "0.625rem 0.75rem", border: "1px solid #e5e7eb", borderRadius: "8px", resize: "vertical", fontFamily: "inherit" }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={processing}
                  style={{ padding: "0.625rem 1rem", background: "#16a34a", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: processing ? "not-allowed" : "pointer" }}
                >
                  {processing ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={handleHire}
                  disabled={processing || selected.status === "hired"}
                  style={{ padding: "0.625rem 1rem", background: "#1d4ed8", color: "white", border: "none", borderRadius: "8px", fontWeight: 600, cursor: processing ? "not-allowed" : "pointer" }}
                >
                  Hire
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={processing || selected.status === "not_selected"}
                  style={{ padding: "0.625rem 1rem", background: "white", color: "#dc2626", border: "1px solid #fecaca", borderRadius: "8px", fontWeight: 600, cursor: processing ? "not-allowed" : "pointer" }}
                >
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
