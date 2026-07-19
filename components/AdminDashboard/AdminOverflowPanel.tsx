"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

export function AdminOverflowPanel() {
  const [scheduledDate, setScheduledDate] = useState("");
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function processOverflow() {
    try {
      setLoading(true);
      setMessage(null);
      setError(null);
      const response = await fetchWithAuth("/api/admin/overflow/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledDate: scheduledDate || undefined,
          jobId: jobId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to process overflow jobs");
      }
      setMessage(data.message || "Overflow offers created.");
    } catch (processError: unknown) {
      setError(processError instanceof Error ? processError.message : "Failed to process overflow jobs");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pp-panel" style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "1.5rem" }}>
      <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Overflow Routing</h3>
      <p style={{ margin: "0.35rem 0 1rem", color: "#6b7280", fontSize: "0.875rem" }}>
        Send unassigned jobs to overflow partners who opted in and have capacity.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Scheduled date (optional)</span>
          <input
            type="date"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Single job ID (optional)</span>
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="scheduledCleanings doc ID"
            style={{ padding: "0.625rem 0.75rem", borderRadius: "8px", border: "1px solid #e5e7eb" }}
          />
        </label>
      </div>

      {message && <p style={{ color: "#166534", marginBottom: "0.75rem" }}>{message}</p>}
      {error && <p style={{ color: "#dc2626", marginBottom: "0.75rem" }}>{error}</p>}

      <button
        type="button"
        onClick={processOverflow}
        disabled={loading}
        style={{
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          border: "none",
          background: loading ? "#9ca3af" : "#2563eb",
          color: "#ffffff",
          fontWeight: 700,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "Processing..." : "Send Unassigned Jobs to Overflow"}
      </button>
    </div>
  );
}
