"use client";

import { fetchWithAuth } from "@/lib/fetch-with-auth";


import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ScheduleJob,
  ScheduleBoardStats,
  ScheduleStaffMember,
  buildScheduleStats,
  getStatusStyle,
  isThisWeek,
  isToday,
  normalizeJobStatus,
} from "@/lib/schedule-board";
import { getReadinessLabel, getReadinessStyle } from "@/lib/cleaning-readiness";
import { CleaningReadinessBanner } from "@/components/CleaningReadinessBanner";
import { ScheduleEmployeeAssign } from "@/components/ScheduleEmployeeAssign";

type QuickFilter = "week" | "today" | "ready-today" | "unassigned" | "in-progress" | "all";

interface OperatorScheduleBoardProps {
  jobs: ScheduleJob[];
  staff: ScheduleStaffMember[];
  loading?: boolean;
  onRefresh: () => Promise<void> | void;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "0.875rem",
  boxSizing: "border-box",
  background: "#ffffff",
};

const toolbarButtonStyle: React.CSSProperties = {
  padding: "0.5rem 0.875rem",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  fontSize: "0.8125rem",
  fontWeight: "600",
  cursor: "pointer",
};

const smallButtonStyle: React.CSSProperties = {
  padding: "0.35rem 0.75rem",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  fontSize: "0.75rem",
  fontWeight: "600",
  cursor: "pointer",
};

export function OperatorScheduleBoard({
  jobs,
  staff,
  loading = false,
  onRefresh,
}: OperatorScheduleBoardProps) {
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("week");
  const [showCancelled, setShowCancelled] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const stats = useMemo(() => buildScheduleStats(jobs), [jobs]);

  const filteredJobs = useMemo(() => {
    let result = [...jobs];

    if (!showCancelled) {
      result = result.filter(
        (job) => normalizeJobStatus(job.status, job.jobStatus) !== "cancelled"
      );
    }

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
      result = result.filter((job) => job.assignedEmployeeId === filterEmployee);
    }

    if (filterCity) {
      result = result.filter((job) =>
        job.city.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    if (filterDate) {
      result = result.filter((job) => job.scheduledDate === filterDate);
    }

    if (filterStatus) {
      result = result.filter(
        (job) => normalizeJobStatus(job.status, job.jobStatus) === filterStatus
      );
    }

    if (filterType === "commercial") {
      result = result.filter((job) => job.isCommercial);
    } else if (filterType === "residential") {
      result = result.filter((job) => !job.isCommercial);
    }

    return result;
  }, [
    jobs,
    showCancelled,
    quickFilter,
    searchQuery,
    filterEmployee,
    filterCity,
    filterDate,
    filterStatus,
    filterType,
  ]);

  const groupedJobs = useMemo(() => {
    return filteredJobs.reduce((acc, job) => {
      if (!acc[job.scheduledDate]) acc[job.scheduledDate] = [];
      acc[job.scheduledDate].push(job);
      return acc;
    }, {} as Record<string, ScheduleJob[]>);
  }, [filteredJobs]);

  async function handleRefresh() {
    setRefreshing(true);
    setError(null);
    try {
      await onRefresh();
      setMessage("Schedule refreshed");
      window.setTimeout(() => setMessage(null), 2500);
    } catch (refreshError: unknown) {
      setError(refreshError instanceof Error ? refreshError.message : "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  }

  async function handleQuickStatus(job: ScheduleJob, status: string) {
    try {
      setError(null);
      const response = await fetchWithAuth(`/api/admin/schedule/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update status");
      }
      setMessage(`✓ ${job.customerName} marked as ${status}`);
      window.setTimeout(() => setMessage(null), 5000);
      await onRefresh();
    } catch (statusError: unknown) {
      setError(statusError instanceof Error ? statusError.message : "Failed to update status");
    }
  }

  async function handleAssigned(job: ScheduleJob, result?: { employeeName: string; action: "assign" | "unassign" }) {
    if (result?.action === "assign") {
      setMessage(`✓ ${job.customerName} assigned to ${result.employeeName}`);
    } else if (result?.action === "unassign") {
      setMessage(`✓ ${job.customerName} unassigned`);
    }
    setError(null);
    window.setTimeout(() => setMessage(null), 5000);
    try {
      await onRefresh();
    } catch (refreshError: unknown) {
      setError(refreshError instanceof Error ? refreshError.message : "Assignment saved, but refresh failed");
    }
  }

  if (loading && jobs.length === 0) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading schedule board...
      </div>
    );
  }

  return (
    <div data-operator-tour="schedule-board">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "700", color: "#111827", margin: 0 }}>
            Schedule & Route Board
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0.35rem 0 0" }}>
            Plan routes, assign employees, and track job status for the week ahead.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          style={toolbarButtonStyle}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <StatsBar stats={stats} jobs={jobs} />

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: "#ecfdf5",
            border: "1px solid #bbf7d0",
            borderRadius: "10px",
            color: "#166534",
          }}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.875rem 1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "10px",
            color: "#dc2626",
          }}
        >
          {error}
        </div>
      )}

      <CleaningReadinessBanner variant="staff" />

      <div
        style={{
          background: "#ffffff",
          padding: "1.25rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          marginBottom: "1rem",
        }}
      >
        <div data-operator-tour="schedule-filters" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[
            { id: "week" as QuickFilter, label: "This Week" },
            { id: "today" as QuickFilter, label: "Today" },
            { id: "ready-today" as QuickFilter, label: "Ready Today" },
            { id: "unassigned" as QuickFilter, label: "Unassigned" },
            { id: "in-progress" as QuickFilter, label: "In Progress" },
            { id: "all" as QuickFilter, label: "All Active" },
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
          <button
            type="button"
            onClick={() => setShowCancelled((current) => !current)}
            style={{
              padding: "0.5rem 0.875rem",
              borderRadius: "999px",
              border: `1px solid ${showCancelled ? "#fecaca" : "#e5e7eb"}`,
              background: showCancelled ? "#fef2f2" : "#ffffff",
              color: showCancelled ? "#991b1b" : "#374151",
              fontSize: "0.8125rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            {showCancelled ? "Hide Cancelled" : "Show Cancelled"}
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "0.75rem",
          }}
        >
          <input
            type="search"
            placeholder="Search customer, address, employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={inputStyle}
          />
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Employees</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Filter by city..."
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            style={inputStyle}
          />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            style={inputStyle}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Statuses</option>
            <option value="upcoming">Upcoming</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={inputStyle}
          >
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
          </select>
        </div>
      </div>

      <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
        Showing {filteredJobs.length} of {jobs.length} jobs
      </div>

      {filteredJobs.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            color: "#6b7280",
          }}
        >
          No jobs match your current filters.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {Object.entries(groupedJobs).map(([date, dateJobs]) => (
            <div
              key={date}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  background: "#f8fafc",
                  borderBottom: "1px solid #e5e7eb",
                  fontWeight: "700",
                  color: "#111827",
                }}
              >
                {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}{" "}
                <span style={{ color: "#6b7280", fontWeight: "600" }}>
                  ({dateJobs.length} jobs)
                </span>
              </div>
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {dateJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    staff={staff}
                    onQuickStatus={handleQuickStatus}
                    onAssigned={(result) => handleAssigned(job, result)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsBar({ stats, jobs }: { stats: ScheduleBoardStats; jobs: ScheduleJob[] }) {
  const weekCount = jobs.filter((job) => isThisWeek(job.scheduledDate)).length;
  const items = [
    { label: "Today", value: stats.today, color: "#2563eb" },
    { label: "This Week", value: weekCount, color: "#111827" },
    { label: "Unassigned", value: stats.unassigned, color: "#dc2626" },
    { label: "In Progress", value: stats.inProgress, color: "#7c3aed" },
    { label: "Completed", value: stats.completed, color: "#16a34a" },
    { label: "Ready Today", value: stats.readyToday, color: "#16a34a" },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "10px",
            padding: "0.875rem 1rem",
          }}
        >
          <div style={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: "600" }}>{item.label}</div>
          <div style={{ fontSize: "1.35rem", fontWeight: "700", color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function JobCard({
  job,
  staff,
  onQuickStatus,
  onAssigned,
}: {
  job: ScheduleJob;
  staff: ScheduleStaffMember[];
  onQuickStatus: (job: ScheduleJob, status: string) => void;
  onAssigned: (result?: { employeeName: string; action: "assign" | "unassign" }) => void;
}) {
  const status = normalizeJobStatus(job.status, job.jobStatus);
  const isCancelled = status === "cancelled";
  const isCompleted = status === "completed";
  const statusStyle = getStatusStyle(status);
  const readinessStyle = getReadinessStyle(job.readinessStatus);

  return (
    <div
      style={{
        padding: "1rem",
        background: job.readinessStatus === "ready_today" ? "#f0fdf4" : "#f9fafb",
        borderRadius: "12px",
        border: `1px solid ${job.readinessStatus === "ready_today" ? "#bbf7d0" : "#e5e7eb"}`,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) auto",
        gap: "1rem",
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.35rem" }}>
          <div style={{ fontWeight: "700", color: "#111827", fontSize: "1rem" }}>{job.customerName}</div>
          {job.isCommercial && (
            <span
              style={{
                fontSize: "0.7rem",
                fontWeight: "700",
                color: "#7c3aed",
                background: "#f3e8ff",
                padding: "0.15rem 0.5rem",
                borderRadius: "999px",
              }}
            >
              Commercial
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.875rem", color: "#4b5563", marginBottom: "0.35rem" }}>
          {job.addressLine1}
          {job.addressLine2 ? `, ${job.addressLine2}` : ""} · {job.city}, {job.state} {job.zipCode}
        </div>
        <div
          style={{
            fontSize: "0.8125rem",
            color: "#6b7280",
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <span>
            <strong>Time:</strong> {job.scheduledTime}
          </span>
          {job.trashDay && (
            <span>
              <strong>Day:</strong> {job.trashDay}
            </span>
          )}
          <span>
            <strong>Plan:</strong> {job.planLabel}
          </span>
          <span>
            <strong>Bins:</strong> {job.binsCount}
          </span>
          {job.assignedEmployeeName ? (
            <span>
              <strong>Assigned:</strong> {job.assignedEmployeeName}
            </span>
          ) : (
            <span style={{ color: "#dc2626", fontWeight: "600" }}>Unassigned</span>
          )}
        </div>
        {(job.notes || job.internalNotes) && (
          <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginTop: "0.5rem" }}>
            {job.notes && <>Customer notes: {job.notes}</>}
            {job.internalNotes && (
              <>
                {job.notes ? " · " : ""}
                Internal: {job.internalNotes}
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem", alignItems: "flex-end", minWidth: "220px" }}>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: "700",
              background: readinessStyle.background,
              color: readinessStyle.color,
              border: `1px solid ${readinessStyle.border}`,
            }}
          >
            {getReadinessLabel(job.readinessStatus)}
          </span>
          <span
            style={{
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: "700",
              ...statusStyle,
            }}
          >
            {status}
          </span>
        </div>

        {!isCancelled && !isCompleted && (
          <ScheduleEmployeeAssign
            jobId={job.id}
            staff={staff}
            assignedEmployeeId={job.assignedEmployeeId}
            assignedEmployeeName={job.assignedEmployeeName}
            customerLabel={job.customerName}
            onAssigned={onAssigned}
          />
        )}

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {!isCompleted && !isCancelled && (
            <>
              <button type="button" onClick={() => onQuickStatus(job, "in-progress")} style={smallButtonStyle}>
                Start
              </button>
              <button type="button" onClick={() => onQuickStatus(job, "completed")} style={smallButtonStyle}>
                Complete
              </button>
            </>
          )}
          {job.assignedEmployeeId && (
            <Link
              href={`/operator/employees/${job.assignedEmployeeId}`}
              style={{
                ...smallButtonStyle,
                textDecoration: "none",
                color: "#1d4ed8",
                borderColor: "#bfdbfe",
                background: "#eff6ff",
              }}
            >
              Open Route
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
