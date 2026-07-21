"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  BIN_BLASTER_SERVICE_AREAS,
  BIN_BLASTER_STATUS_LABELS,
  type BinBlasterApplicationRecord,
  type BinBlasterApplicationStatus,
  type BinBlasterCompensation,
} from "@/lib/bin-blaster-types";

const ALL_STATUSES = Object.keys(BIN_BLASTER_STATUS_LABELS) as BinBlasterApplicationStatus[];

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

function statusColor(status: BinBlasterApplicationStatus): { bg: string; color: string } {
  switch (status) {
    case "approved":
    case "employee_account_created":
      return { bg: "#dcfce7", color: "#166534" };
    case "rejected":
      return { bg: "#fef2f2", color: "#dc2626" };
    case "interview_requested":
      return { bg: "#dbeafe", color: "#1d4ed8" };
    case "waitlisted":
      return { bg: "#f3e8ff", color: "#7e22ce" };
    default:
      return { bg: "#fef3c7", color: "#b45309" };
  }
}

export function BinBlasterApplicationsHub() {
  const [applications, setApplications] = useState<BinBlasterApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  const [statusDraft, setStatusDraft] = useState<BinBlasterApplicationStatus>("new");
  const [interviewMessage, setInterviewMessage] = useState("");
  const [assignedServiceAreas, setAssignedServiceAreas] = useState<string[]>([]);
  const [compensation, setCompensation] = useState<BinBlasterCompensation>({
    residentialFirstBin: 8,
    residentialAdditionalBin: 2,
    notes: "",
  });

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());
      const query = params.toString();

      const response = await fetchWithAuth(`/api/admin/bin-blaster/applications${query ? `?${query}` : ""}`);
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

  const selected = useMemo(
    () => applications.find((app) => app.id === selectedId) || null,
    [applications, selectedId]
  );

  useEffect(() => {
    if (selected) {
      setStatusDraft(selected.status);
      setAdminNote("");
      setInterviewMessage("");
      setAssignedServiceAreas(
        selected.assignedServiceAreas.length ? selected.assignedServiceAreas : selected.serviceAreas
      );
      setCompensation(
        selected.compensation || {
          residentialFirstBin: 8,
          residentialAdditionalBin: 2,
          notes: "",
        }
      );
    }
  }, [selected]);

  async function updateApplication(body: Record<string, unknown>) {
    if (!selected) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/admin/bin-blaster/applications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: selected.id, ...body }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update application.");
      }

      const updated = data.application as BinBlasterApplicationRecord;
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
      setAdminNote("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update application.");
    } finally {
      setProcessing(false);
    }
  }

  async function createEmployeeAccount() {
    if (!selected) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetchWithAuth("/api/admin/bin-blaster/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selected.id,
          action: "create_employee_account",
          assignedServiceAreas,
          compensation,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create employee account.");
      }

      const updated = data.application as BinBlasterApplicationRecord;
      setApplications((prev) => prev.map((app) => (app.id === updated.id ? updated : app)));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create employee account.");
    } finally {
      setProcessing(false);
    }
  }

  function toggleAssignedArea(area: string) {
    setAssignedServiceAreas((prev) =>
      prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area]
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.5rem" }}>Bin Blaster Applications</h2>
          <p style={{ margin: "0.5rem 0 0", color: "#6b7280" }}>
            Review public Bin Blaster job applications and invite approved applicants to the employee portal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => loadApplications()}
          disabled={loading}
          style={{
            padding: "0.625rem 1rem",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: "1.5rem" }}>
        <div>
          <div style={{ display: "grid", gap: "0.75rem", marginBottom: "1rem" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, city..."
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
            >
              <option value="">All statuses</option>
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {BIN_BLASTER_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <p>Loading applications...</p>
          ) : applications.length === 0 ? (
            <p style={{ color: "#6b7280" }}>No applications found.</p>
          ) : (
            <div style={{ display: "grid", gap: "0.75rem", maxHeight: "720px", overflowY: "auto" }}>
              {applications.map((app) => {
                const colors = statusColor(app.status);
                return (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => setSelectedId(app.id)}
                    style={{
                      textAlign: "left",
                      padding: "1rem",
                      borderRadius: "12px",
                      border: selectedId === app.id ? "2px solid #16a34a" : "1px solid #e5e7eb",
                      background: "white",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
                      <strong>{app.personal.firstName} {app.personal.lastName}</strong>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "999px",
                          background: colors.bg,
                          color: colors.color,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {BIN_BLASTER_STATUS_LABELS[app.status]}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.35rem" }}>
                      {app.personal.email}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "0.35rem" }}>
                      Submitted {formatDate(app.submittedAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "1.25rem", background: "#fafafa" }}>
          {!selected ? (
            <p style={{ color: "#6b7280" }}>Select an application to review details.</p>
          ) : (
            <div style={{ display: "grid", gap: "1.25rem" }}>
              <div>
                <h3 style={{ margin: "0 0 0.5rem" }}>
                  {selected.personal.firstName} {selected.personal.lastName}
                </h3>
                <p style={{ margin: 0, color: "#6b7280" }}>
                  Submitted {formatDate(selected.submittedAt)} · Updated {formatDate(selected.updatedAt)}
                </p>
              </div>

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <strong>Personal</strong>
                <p style={{ margin: 0 }}>{selected.personal.email} · {selected.personal.phone}</p>
                <p style={{ margin: 0 }}>{selected.personal.city}, GA {selected.personal.zip}</p>
                <p style={{ margin: 0 }}>DOB: {selected.personal.dateOfBirth} · 18+: {selected.personal.isAtLeast18 ? "Yes" : "No"}</p>
              </div>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                <strong>Work & Availability</strong>
                <p style={{ margin: 0 }}>License: {selected.work.hasDriversLicense ? "Yes" : "No"} · Transport: {selected.work.hasReliableTransportation ? "Yes" : "No"}</p>
                <p style={{ margin: 0 }}>Authorized to work: {selected.work.authorizedToWork ? "Yes" : "No"}</p>
                <p style={{ margin: 0 }}>Start: {selected.work.startTimeline}</p>
                <p style={{ margin: 0 }}>Days: {selected.work.availableDays.join(", ") || "—"}</p>
                <p style={{ margin: 0 }}>Times: {selected.work.availableTimes}</p>
                <p style={{ margin: 0 }}>Areas: {selected.serviceAreas.join(", ") || "—"}</p>
                <p style={{ margin: 0 }}>Why Bin Blast: {selected.work.whyBinBlast}</p>
                {selected.work.experienceDescription && (
                  <p style={{ margin: 0 }}>Experience: {selected.work.experienceDescription}</p>
                )}
              </div>

              {selected.adminNotes.length > 0 && (
                <div>
                  <strong>Internal Notes</strong>
                  <div style={{ display: "grid", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {selected.adminNotes.map((note) => (
                      <div key={note.id} style={{ padding: "0.75rem", background: "white", borderRadius: "8px", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                          {note.authorName} · {formatDate(note.createdAt)}
                        </div>
                        <div>{note.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gap: "0.75rem" }}>
                <label>
                  Status
                  <select
                    value={statusDraft}
                    onChange={(e) => setStatusDraft(e.target.value as BinBlasterApplicationStatus)}
                    style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginTop: "0.35rem" }}
                  >
                    {ALL_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {BIN_BLASTER_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Internal note
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Add a note for the recruiting team..."
                    style={{ width: "100%", minHeight: "80px", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginTop: "0.35rem" }}
                  />
                </label>

                <label>
                  Interview email message (optional)
                  <textarea
                    value={interviewMessage}
                    onChange={(e) => setInterviewMessage(e.target.value)}
                    placeholder="Custom message for interview request email..."
                    style={{ width: "100%", minHeight: "70px", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginTop: "0.35rem" }}
                  />
                </label>

                <div>
                  <strong>Assigned service areas</strong>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {BIN_BLASTER_SERVICE_AREAS.map((area) => (
                      <label key={area} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={assignedServiceAreas.includes(area)}
                          onChange={() => toggleAssignedArea(area)}
                        />
                        <span>{area}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <label>
                    First bin pay ($)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={compensation.residentialFirstBin}
                      onChange={(e) =>
                        setCompensation((prev) => ({
                          ...prev,
                          residentialFirstBin: Number(e.target.value),
                        }))
                      }
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginTop: "0.35rem" }}
                    />
                  </label>
                  <label>
                    Additional bin pay ($)
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={compensation.residentialAdditionalBin}
                      onChange={(e) =>
                        setCompensation((prev) => ({
                          ...prev,
                          residentialAdditionalBin: Number(e.target.value),
                        }))
                      }
                      style={{ width: "100%", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginTop: "0.35rem" }}
                    />
                  </label>
                </div>

                <label>
                  Compensation notes
                  <textarea
                    value={compensation.notes}
                    onChange={(e) => setCompensation((prev) => ({ ...prev, notes: e.target.value }))}
                    style={{ width: "100%", minHeight: "60px", padding: "0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb", marginTop: "0.35rem" }}
                  />
                </label>
              </div>

              {error && (
                <div style={{ padding: "0.75rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626" }}>
                  {error}
                </div>
              )}

              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    updateApplication({
                      status: statusDraft,
                      adminNote: adminNote || undefined,
                      assignedServiceAreas,
                      compensation,
                    })
                  }
                  style={{ padding: "0.75rem 1rem", borderRadius: "8px", border: "none", background: "#16a34a", color: "white", cursor: "pointer" }}
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    updateApplication({
                      status: "interview_requested",
                      adminNote: adminNote || undefined,
                      sendInterviewEmail: true,
                      interviewMessage: interviewMessage || undefined,
                      assignedServiceAreas,
                      compensation,
                    })
                  }
                  style={{ padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
                >
                  Send Interview Email
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    updateApplication({
                      status: "approved",
                      adminNote: adminNote || undefined,
                      sendStatusEmail: true,
                      assignedServiceAreas,
                      compensation,
                    })
                  }
                  style={{ padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #e5e7eb", background: "white", cursor: "pointer" }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    updateApplication({
                      status: "rejected",
                      adminNote: adminNote || undefined,
                      sendStatusEmail: true,
                      allowResubmission: false,
                    })
                  }
                  style={{ padding: "0.75rem 1rem", borderRadius: "8px", border: "1px solid #fecaca", background: "#fef2f2", color: "#dc2626", cursor: "pointer" }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={processing || selected.status === "employee_account_created" || Boolean(selected.employeeId)}
                  onClick={createEmployeeAccount}
                  style={{ padding: "0.75rem 1rem", borderRadius: "8px", border: "none", background: "#111827", color: "white", cursor: "pointer" }}
                >
                  Create Employee Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
