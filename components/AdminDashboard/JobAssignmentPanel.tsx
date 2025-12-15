// components/AdminDashboard/JobAssignmentPanel.tsx
"use client";

import { useState, useEffect } from "react";

interface JobAssignmentPanelProps {
  employeeId: string;
}

interface CleaningJob {
  id: string;
  customerName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  scheduledDate: string;
  jobStatus: string;
}

export function JobAssignmentPanel({ employeeId }: JobAssignmentPanelProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [unassignedJobs, setUnassignedJobs] = useState<CleaningJob[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<CleaningJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
    loadJobs(today);
  }, [employeeId]);

  async function loadJobs(date: string) {
    try {
      setLoading(true);
      
      // Load unassigned jobs for the date
      const unassignedResponse = await fetch(`/api/operator/unassigned-customers?date=${date}`);
      const unassignedData = await unassignedResponse.json();
      
      if (unassignedData.success) {
        setUnassignedJobs(unassignedData.customers || []);
      }

      // Load assigned jobs for this employee
      const assignedResponse = await fetch(`/api/employee/jobs?employeeId=${employeeId}`);
      const assignedData = await assignedResponse.json();
      
      if (assignedData.jobs) {
        // Filter by date
        const filteredJobs = assignedData.jobs.filter((job: any) => job.scheduledDate === date);
        setAssignedJobs(filteredJobs);
      }
    } catch (error) {
      console.error("Error loading jobs:", error);
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  function handleDateChange(date: string) {
    setSelectedDate(date);
    setSelectedJobIds(new Set());
    loadJobs(date);
  }

  function toggleJobSelection(jobId: string) {
    const newSelected = new Set(selectedJobIds);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobIds(newSelected);
  }

  function selectAllJobs() {
    if (selectedJobIds.size === unassignedJobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(unassignedJobs.map(job => job.id)));
    }
  }

  async function handleAssignJobs() {
    if (selectedJobIds.size === 0) {
      setError("Please select at least one job to assign");
      return;
    }

    try {
      setAssigning(true);
      setError(null);
      setSuccess(false);

      const response = await fetch(`/api/admin/employees/${employeeId}/assign-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: Array.from(selectedJobIds),
          date: selectedDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to assign jobs");
      }

      setSuccess(true);
      setSelectedJobIds(new Set());
      setTimeout(() => setSuccess(false), 3000);
      await loadJobs(selectedDate);
    } catch (err: any) {
      setError(err.message || "Failed to assign jobs");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading jobs...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "center" }}>
        <label style={{ fontSize: "0.95rem", fontWeight: "500" }}>Select Date:</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.95rem",
          }}
        />
      </div>

      {/* Unassigned Jobs */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: "600" }}>
            Unassigned Jobs ({unassignedJobs.length})
          </h3>
          {unassignedJobs.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={selectAllJobs}
                style={{
                  padding: "0.5rem 1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                  background: "white",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                }}
              >
                {selectedJobIds.size === unassignedJobs.length ? "Deselect All" : "Select All"}
              </button>
              <button
                onClick={handleAssignJobs}
                disabled={assigning || selectedJobIds.size === 0}
                style={{
                  padding: "0.5rem 1rem",
                  background: selectedJobIds.size === 0 ? "#f3f4f6" : "#16a34a",
                  color: selectedJobIds.size === 0 ? "#9ca3af" : "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: selectedJobIds.size === 0 ? "not-allowed" : "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                }}
              >
                {assigning ? "Assigning..." : `Assign Selected (${selectedJobIds.size})`}
              </button>
            </div>
          )}
        </div>

        {unassignedJobs.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
            No unassigned jobs for this date
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {unassignedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  padding: "1rem",
                  border: selectedJobIds.has(job.id) ? "2px solid #16a34a" : "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: selectedJobIds.has(job.id) ? "#f0fdf4" : "white",
                  cursor: "pointer",
                }}
                onClick={() => toggleJobSelection(job.id)}
              >
                <div style={{ display: "flex", alignItems: "start", gap: "1rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedJobIds.has(job.id)}
                    onChange={() => toggleJobSelection(job.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: "0.25rem", width: "18px", height: "18px", cursor: "pointer" }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                      {job.customerName || "N/A"}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {job.addressLine1}
                      {job.addressLine2 && `, ${job.addressLine2}`}
                      {`, ${job.city}, ${job.state} ${job.zipCode}`}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assigned Jobs */}
      <div>
        <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.125rem", fontWeight: "600" }}>
          Currently Assigned Jobs ({assignedJobs.length})
        </h3>
        {assignedJobs.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", background: "#f9fafb", borderRadius: "8px" }}>
            No jobs assigned for this date
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {assignedJobs.map((job) => (
              <div
                key={job.id}
                style={{
                  padding: "1rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  background: "white",
                }}
              >
                <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                  {job.customerName || "N/A"}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                  {job.addressLine1}
                  {job.addressLine2 && `, ${job.addressLine2}`}
                  {`, ${job.city}, ${job.state} ${job.zipCode}`}
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <span style={{
                    padding: "0.25rem 0.5rem",
                    background: job.jobStatus === "completed" ? "#dcfce7" : "#fef3c7",
                    color: job.jobStatus === "completed" ? "#16a34a" : "#d97706",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                  }}>
                    {job.jobStatus || "pending"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          fontSize: "0.875rem"
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          marginTop: "1rem",
          padding: "0.75rem 1rem",
          background: "#dcfce7",
          border: "1px solid #86efac",
          borderRadius: "8px",
          color: "#16a34a",
          fontSize: "0.875rem"
        }}>
          Jobs assigned successfully
        </div>
      )}
    </div>
  );
}
