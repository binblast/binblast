"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScheduleJob,
  ScheduleStaffMember,
  ScheduleBoardStats,
  buildScheduleStats,
  getStatusStyle,
  isThisWeek,
  isToday,
  normalizeJobStatus,
} from "@/lib/schedule-board";
import { getReadinessLabel, getReadinessStyle } from "@/lib/cleaning-readiness";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import { ScheduleEmployeeAssign } from "@/components/ScheduleEmployeeAssign";
import { DAY_NAMES } from "@/lib/day-assignment";

interface CleaningScheduleBoardProps {
  userId: string;
}

type QuickFilter = "all" | "today" | "week" | "ready-today" | "unassigned" | "in-progress";
type ViewMode = "board" | "list";

const TIME_OPTIONS = [
  "6:00 AM - 9:00 AM",
  "9:00 AM - 12:00 PM",
  "12:00 PM - 3:00 PM",
  "3:00 PM - 6:00 PM",
  "6:00 PM - 9:00 PM",
];

export function CleaningScheduleBoard({ userId }: CleaningScheduleBoardProps) {
  const [jobs, setJobs] = useState<ScheduleJob[]>([]);
  const [staff, setStaff] = useState<ScheduleStaffMember[]>([]);
  const [stats, setStats] = useState<ScheduleBoardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterPartner, setFilterPartner] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterTrashDay, setFilterTrashDay] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("board");

  const [selectedJob, setSelectedJob] = useState<ScheduleJob | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [bulkEmployeeId, setBulkEmployeeId] = useState("");
  const [bulkWorking, setBulkWorking] = useState(false);

  const loadSchedule = useCallback(async (silent = false) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/schedule");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load schedule");
      }

      setJobs(data.jobs || []);
      setStaff(data.staff || []);
      setStats(data.stats || buildScheduleStats(data.jobs || []));
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load schedule");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (userId) loadSchedule();
  }, [userId, loadSchedule]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (quickFilter === "today") {
      result = result.filter((job) => isToday(job.scheduledDate));
    } else if (quickFilter === "week") {
      result = result.filter((job) => isThisWeek(job.scheduledDate));
    } else if (quickFilter === "ready-today") {
      result = result.filter(
        (job) => isToday(job.scheduledDate) && job.readinessStatus === "ready_today"
      );
    } else if (quickFilter === "unassigned") {
      result = result.filter(
        (job) =>
          !job.assignedEmployeeId &&
          normalizeJobStatus(job.status, job.jobStatus) !== "completed" &&
          normalizeJobStatus(job.status, job.jobStatus) !== "cancelled"
      );
    } else if (quickFilter === "in-progress") {
      result = result.filter(
        (job) => normalizeJobStatus(job.status, job.jobStatus) === "in-progress"
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (job) =>
          job.customerName.toLowerCase().includes(query) ||
          job.customerEmail.toLowerCase().includes(query) ||
          job.addressLine1.toLowerCase().includes(query) ||
          job.city.toLowerCase().includes(query) ||
          job.assignedEmployeeName.toLowerCase().includes(query)
      );
    }

    if (filterEmployee) {
      result = result.filter(
        (job) =>
          job.assignedEmployeeId === filterEmployee ||
          job.assignedEmployeeName.toLowerCase().includes(filterEmployee.toLowerCase())
      );
    }

    if (filterPartner) {
      result = result.filter((job) =>
        job.partner.toLowerCase().includes(filterPartner.toLowerCase())
      );
    }

    if (filterCity) {
      result = result.filter((job) =>
        job.city.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    if (filterStatus) {
      result = result.filter(
        (job) => normalizeJobStatus(job.status, job.jobStatus) === filterStatus
      );
    }

    if (filterDate) {
      result = result.filter((job) => job.scheduledDate === filterDate);
    }

    if (filterTrashDay) {
      result = result.filter((job) => job.trashDay === filterTrashDay);
    }

    result.sort((a, b) => {
      const dayCompare = (a.trashDay || "").localeCompare(b.trashDay || "");
      if (dayCompare !== 0) return dayCompare;
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });

    return result;
  }, [
    jobs,
    quickFilter,
    searchQuery,
    filterEmployee,
    filterPartner,
    filterCity,
    filterStatus,
    filterDate,
    filterTrashDay,
  ]);

  const groupedJobs = useMemo(() => {
    return filteredJobs.reduce((acc, job) => {
      const key = job.scheduledDate;
      if (!acc[key]) acc[key] = [];
      acc[key].push(job);
      return acc;
    }, {} as Record<string, ScheduleJob[]>);
  }, [filteredJobs]);

  async function updateJob(jobId: string, updates: Record<string, unknown>) {
    const response = await fetch(`/api/admin/schedule/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Failed to update job");
    }
  }

  async function handleQuickStatus(job: ScheduleJob, status: string) {
    try {
      setMessage(null);
      await updateJob(job.id, { status });
      setMessage(`Marked ${job.customerName} as ${status}`);
      await loadSchedule(true);
    } catch (actionError: unknown) {
      setError(actionError instanceof Error ? actionError.message : "Failed to update status");
    }
  }

  async function handleBulkAction(action: "assign" | "status" | "unassign", status?: string) {
    if (selectedJobIds.length === 0) return;

    try {
      setBulkWorking(true);
      setError(null);

      const employee = staff.find((member) => member.id === bulkEmployeeId);
      const response = await fetch("/api/admin/schedule/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: selectedJobIds,
          action,
          status,
          assignedEmployeeId: employee?.id,
          assignedEmployeeName: employee?.name,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Bulk update failed");
      }

      setMessage(data.message || "Bulk update completed");
      setSelectedJobIds([]);
      setBulkEmployeeId("");
      await loadSchedule(true);
    } catch (bulkError: unknown) {
      setError(bulkError instanceof Error ? bulkError.message : "Bulk update failed");
    } finally {
      setBulkWorking(false);
    }
  }

  function toggleJobSelection(jobId: string) {
    setSelectedJobIds((current) =>
      current.includes(jobId) ? current.filter((id) => id !== jobId) : [...current, jobId]
    );
  }

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "#6b7280" }}>Loading operations board...</p>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: "3rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", marginBottom: "0.35rem" }}>
            Cleaning Schedule & Operations Board
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
            Manage routes, assignments, statuses, and job details across the full platform.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => loadSchedule(true)}
            disabled={refreshing}
            style={toolbarButtonStyle}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => setViewMode(viewMode === "board" ? "list" : "board")}
            style={toolbarButtonStyle}
          >
            {viewMode === "board" ? "List View" : "Board View"}
          </button>
        </div>
      </div>

      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {[
            { label: "Total Jobs", value: stats.total, color: "#111827" },
            { label: "Today", value: stats.today, color: "#2563eb" },
            { label: "Ready Today", value: stats.readyToday, color: "#16a34a" },
            { label: "Blocked Today", value: stats.blockedToday, color: "#dc2626" },
            { label: "In Progress", value: stats.inProgress, color: "#7c3aed" },
            { label: "Upcoming", value: stats.upcoming, color: "#d97706" },
            { label: "Unassigned", value: stats.unassigned, color: "#dc2626" },
            { label: "Completed", value: stats.completed, color: "#16a34a" },
          ].map((item) => (
            <div key={item.label} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "0.875rem 1rem" }}>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>{item.label}</div>
              <div style={{ fontSize: "1.35rem", fontWeight: "700", color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "#ecfdf5", border: "1px solid #bbf7d0", borderRadius: "8px", color: "#166534" }}>
          {message}
        </div>
      )}

      {error && (
        <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <CleaningReadinessBanner variant="staff" />

      {stats && stats.blockedToday > 0 && (
        <div style={{ marginBottom: "1rem", padding: "0.875rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontWeight: "600" }}>
          {stats.blockedToday} trash can cleaning{stats.blockedToday === 1 ? "" : "s"} scheduled today cannot be serviced until payment or account issues are resolved.
        </div>
      )}

      <div style={{ background: "#ffffff", padding: "1.25rem", borderRadius: "12px", border: "1px solid #e5e7eb", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[
            { id: "all" as QuickFilter, label: "All Jobs" },
            { id: "today" as QuickFilter, label: "Today" },
            { id: "ready-today" as QuickFilter, label: "Ready Today" },
            { id: "week" as QuickFilter, label: "This Week" },
            { id: "unassigned" as QuickFilter, label: "Unassigned" },
            { id: "in-progress" as QuickFilter, label: "In Progress" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setQuickFilter(tab.id)}
              style={{
                padding: "0.5rem 0.875rem",
                borderRadius: "999px",
                border: "1px solid #e5e7eb",
                background: quickFilter === tab.id ? "#111827" : "#ffffff",
                color: quickFilter === tab.id ? "#ffffff" : "#374151",
                fontSize: "0.8125rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
          <input
            type="search"
            placeholder="Search customer, address, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
          <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value)} style={inputStyle}>
            <option value="">All Employees</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.role})
              </option>
            ))}
          </select>
          <input type="text" placeholder="Filter by partner..." value={filterPartner} onChange={(e) => setFilterPartner(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Filter by city..." value={filterCity} onChange={(e) => setFilterCity(e.target.value)} style={inputStyle} />
          <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={inputStyle} />
          <select value={filterTrashDay} onChange={(e) => setFilterTrashDay(e.target.value)} style={inputStyle}>
            <option value="">All Cleaning Days</option>
            {DAY_NAMES.map((day) => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={inputStyle}>
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {selectedJobIds.length > 0 && (
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px", padding: "1rem", marginBottom: "1rem", display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontWeight: "600", color: "#1d4ed8" }}>{selectedJobIds.length} selected</span>
          <select value={bulkEmployeeId} onChange={(e) => setBulkEmployeeId(e.target.value)} style={{ ...inputStyle, width: "220px" }}>
            <option value="">Assign to employee...</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>{member.name}</option>
            ))}
          </select>
          <button type="button" disabled={!bulkEmployeeId || bulkWorking} onClick={() => handleBulkAction("assign")} style={primaryButtonStyle}>
            Assign Selected
          </button>
          <button type="button" disabled={bulkWorking} onClick={() => handleBulkAction("status", "in-progress")} style={toolbarButtonStyle}>
            Mark In Progress
          </button>
          <button type="button" disabled={bulkWorking} onClick={() => handleBulkAction("status", "completed")} style={toolbarButtonStyle}>
            Mark Completed
          </button>
          <button type="button" disabled={bulkWorking} onClick={() => handleBulkAction("unassign")} style={toolbarButtonStyle}>
            Unassign
          </button>
          <button type="button" onClick={() => setSelectedJobIds([])} style={toolbarButtonStyle}>
            Clear
          </button>
        </div>
      )}

      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>

      {filteredJobs.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", color: "#6b7280" }}>
          No jobs match your current filters.
        </div>
      ) : viewMode === "list" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              staff={staff}
              selected={selectedJobIds.includes(job.id)}
              onToggleSelect={() => toggleJobSelection(job.id)}
              onEdit={() => setSelectedJob(job)}
              onQuickStatus={handleQuickStatus}
              onAssigned={() => loadSchedule(true)}
            />
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(groupedJobs).map(([date, dateJobs]) => (
            <div key={date} style={{ background: "#ffffff", borderRadius: "12px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
              <div style={{ padding: "1rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", fontWeight: "700", color: "#111827" }}>
                {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })} ({dateJobs.length} jobs)
              </div>
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {dateJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    staff={staff}
                    selected={selectedJobIds.includes(job.id)}
                    onToggleSelect={() => toggleJobSelection(job.id)}
                    onEdit={() => setSelectedJob(job)}
                    onQuickStatus={handleQuickStatus}
                    onAssigned={() => loadSchedule(true)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          staff={staff}
          onClose={() => setSelectedJob(null)}
          onSave={async (updates) => {
            await updateJob(selectedJob.id, updates);
            setSelectedJob(null);
            setMessage("Job updated successfully");
            await loadSchedule(true);
          }}
        />
      )}
    </div>
  );
}

function JobCard({
  job,
  staff,
  selected,
  onToggleSelect,
  onEdit,
  onQuickStatus,
  onAssigned,
}: {
  job: ScheduleJob;
  staff: ScheduleStaffMember[];
  selected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onQuickStatus: (job: ScheduleJob, status: string) => void;
  onAssigned: () => void;
}) {
  const status = normalizeJobStatus(job.status, job.jobStatus);
  const statusStyle = getStatusStyle(status);
  const readinessStyle = getReadinessStyle(job.readinessStatus);

  return (
    <div style={{ padding: "1rem", background: selected ? "#eff6ff" : job.readinessStatus === "ready_today" ? "#f0fdf4" : "#f9fafb", borderRadius: "10px", border: `1px solid ${selected ? "#93c5fd" : job.readinessStatus === "ready_today" ? "#bbf7d0" : "#e5e7eb"}`, display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      <input type="checkbox" checked={selected} onChange={onToggleSelect} style={{ marginTop: "0.35rem" }} />
      <div style={{ flex: 1, minWidth: "240px" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.35rem" }}>
          <div style={{ fontWeight: "700", color: "#111827" }}>{job.customerName}</div>
          {job.isCommercial && (
            <span style={{ fontSize: "0.7rem", fontWeight: "700", color: "#7c3aed", background: "#f3e8ff", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>Commercial</span>
          )}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: "0.25rem" }}>
          {job.addressLine1}{job.addressLine2 ? `, ${job.addressLine2}` : ""} · {job.city}, {job.state} {job.zipCode}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "#6b7280", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <span><strong>Time:</strong> {job.scheduledTime}</span>
          {job.trashDay && <span><strong>Cleaning Day:</strong> {job.trashDay}</span>}
          <span><strong>Plan:</strong> {job.planLabel}</span>
          <span><strong>Bins:</strong> {job.binsCount}</span>
          {job.assignedEmployeeName ? <span><strong>Assigned:</strong> {job.assignedEmployeeName}</span> : <span style={{ color: "#dc2626", fontWeight: "600" }}>Unassigned</span>}
          {job.partner && <span><strong>Partner:</strong> {job.partner}</span>}
        </div>
        {(job.notes || job.internalNotes) && (
          <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.5rem", fontStyle: "italic" }}>
            {job.notes && <>Notes: {job.notes}</>}
            {job.internalNotes && <>{job.notes ? " · " : ""}Internal: {job.internalNotes}</>}
          </div>
        )}
        <div style={{ fontSize: "0.75rem", color: "#c2410c", fontWeight: "700", marginTop: "0.5rem" }}>
          Curb placement required before service window
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", flexWrap: "wrap" }}>
        {!isCancelled && status !== "completed" && (
          <ScheduleEmployeeAssign
            jobId={job.id}
            staff={staff}
            assignedEmployeeId={job.assignedEmployeeId}
            assignedEmployeeName={job.assignedEmployeeName}
            onAssigned={onAssigned}
          />
        )}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "700", background: readinessStyle.background, color: readinessStyle.color, border: `1px solid ${readinessStyle.border}` }}>
          {getReadinessLabel(job.readinessStatus)}
        </span>
        <span style={{ padding: "0.25rem 0.75rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: "700", ...statusStyle }}>
          {status}
        </span>
        {status !== "completed" && status !== "cancelled" && (
          <>
            <button type="button" onClick={() => onQuickStatus(job, "in-progress")} style={smallButtonStyle}>Start</button>
            <button type="button" onClick={() => onQuickStatus(job, "completed")} style={smallButtonStyle}>Complete</button>
            <button type="button" onClick={() => onQuickStatus(job, "cancelled")} style={smallButtonStyle}>Cancel</button>
          </>
        )}
        <button type="button" onClick={onEdit} style={smallButtonStyle}>Manage</button>
        </div>
      </div>
    </div>
  );
}

function JobDetailModal({
  job,
  staff,
  onClose,
  onSave,
}: {
  job: ScheduleJob;
  staff: ScheduleStaffMember[];
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    status: normalizeJobStatus(job.status, job.jobStatus),
    scheduledDate: job.scheduledDate,
    scheduledTime: job.scheduledTime,
    trashDay: job.trashDay,
    assignedEmployeeId: job.assignedEmployeeId,
    addressLine1: job.addressLine1,
    addressLine2: job.addressLine2,
    city: job.city,
    state: job.state,
    zipCode: job.zipCode,
    binsCount: String(job.binsCount || 1),
    partner: job.partner,
    notes: job.notes,
    internalNotes: job.internalNotes,
  });

  async function handleSubmit() {
    try {
      setSaving(true);
      const selectedStaff = staff.find((member) => member.id === formData.assignedEmployeeId);
      await onSave({
        status: formData.status,
        scheduledDate: formData.scheduledDate,
        scheduledTime: formData.scheduledTime,
        trashDay: formData.trashDay,
        addressLine1: formData.addressLine1,
        addressLine2: formData.addressLine2,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        binsCount: Number(formData.binsCount) || 1,
        partner: formData.partner,
        notes: formData.notes,
        internalNotes: formData.internalNotes,
        ...(formData.assignedEmployeeId
          ? {
              assignedEmployeeId: formData.assignedEmployeeId,
              assignedEmployeeName: selectedStaff?.name || job.assignedEmployeeName,
            }
          : { clearAssignment: true }),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
      <div style={{ background: "#ffffff", borderRadius: "14px", padding: "1.5rem", width: "min(720px, 100%)", maxHeight: "90vh", overflowY: "auto" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.35rem" }}>Manage Job</h3>
        <p style={{ color: "#6b7280", marginBottom: "1.25rem" }}>{job.customerName} · {job.planLabel}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
          <Field label="Status">
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} style={inputStyle}>
              <option value="upcoming">Upcoming</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </Field>
          <Field label="Assigned Employee">
            <select value={formData.assignedEmployeeId} onChange={(e) => setFormData({ ...formData, assignedEmployeeId: e.target.value })} style={inputStyle}>
              <option value="">Unassigned</option>
              {staff.map((member) => (
                <option key={member.id} value={member.id}>{member.name} ({member.role})</option>
              ))}
            </select>
          </Field>
          <Field label="Scheduled Date">
            <input type="date" value={formData.scheduledDate} onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Time Window">
            <select value={formData.scheduledTime} onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })} style={inputStyle}>
              {TIME_OPTIONS.map((time) => (
                <option key={time} value={time}>{time}</option>
              ))}
            </select>
          </Field>
          <Field label="Trash Day">
            <input value={formData.trashDay} onChange={(e) => setFormData({ ...formData, trashDay: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Bins">
            <input type="number" min="1" value={formData.binsCount} onChange={(e) => setFormData({ ...formData, binsCount: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Partner">
            <input value={formData.partner} onChange={(e) => setFormData({ ...formData, partner: e.target.value })} style={inputStyle} />
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem", marginTop: "1rem" }}>
          <Field label="Address Line 1">
            <input value={formData.addressLine1} onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })} style={inputStyle} />
          </Field>
          <Field label="Address Line 2">
            <input value={formData.addressLine2} onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })} style={inputStyle} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
            <Field label="City"><input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} style={inputStyle} /></Field>
            <Field label="State"><input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} style={inputStyle} /></Field>
            <Field label="ZIP"><input value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} style={inputStyle} /></Field>
          </div>
          <Field label="Customer Notes">
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
          <Field label="Internal Notes">
            <textarea value={formData.internalNotes} onChange={(e) => setFormData({ ...formData, internalNotes: e.target.value })} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
          </Field>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
          <button type="button" onClick={onClose} style={{ ...toolbarButtonStyle, flex: 1 }}>Cancel</button>
          <button type="button" disabled={saving} onClick={handleSubmit} style={{ ...primaryButtonStyle, flex: 1 }}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: "0.8125rem", fontWeight: "600", marginBottom: "0.35rem", color: "#374151" }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
};

const toolbarButtonStyle: React.CSSProperties = {
  padding: "0.5rem 0.875rem",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  fontSize: "0.8125rem",
  fontWeight: "600",
  cursor: "pointer",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "0.5rem 0.875rem",
  background: "#16a34a",
  color: "#ffffff",
  border: "none",
  borderRadius: "8px",
  fontSize: "0.8125rem",
  fontWeight: "600",
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "0.25rem 0.75rem",
  background: "#f3f4f6",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  fontSize: "0.75rem",
  fontWeight: "600",
  cursor: "pointer",
};
