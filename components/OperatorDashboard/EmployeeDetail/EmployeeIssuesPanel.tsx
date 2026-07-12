"use client";

import { useEffect, useState } from "react";

interface EmployeeIssue {
  id: string;
  employeeId: string;
  employeeName?: string;
  issueType: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string | null;
  resolvedAt: string | null;
}

interface EmployeeIssuesPanelProps {
  employeeId: string;
  refreshKey?: number;
  onIssueResolved?: () => void;
}

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "#fef3c7", text: "#92400e" },
  medium: { bg: "#fed7aa", text: "#9a3412" },
  high: { bg: "#fee2e2", text: "#991b1b" },
  critical: { bg: "#fecaca", text: "#7f1d1d" },
};

export function EmployeeIssuesPanel({
  employeeId,
  refreshKey = 0,
  onIssueResolved,
}: EmployeeIssuesPanelProps) {
  const [issues, setIssues] = useState<EmployeeIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    loadIssues();
  }, [employeeId, refreshKey]);

  const loadIssues = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/issues`);
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
      }
    } catch (error) {
      console.error("Error loading employee issues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (issueId: string) => {
    setResolvingId(issueId);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/issues`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueId, status: "resolved" }),
      });
      if (response.ok) {
        await loadIssues();
        onIssueResolved?.();
      }
    } catch (error) {
      console.error("Error resolving issue:", error);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredIssues = issues.filter((issue) => {
    if (filter === "all") return true;
    return issue.status === filter;
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Unknown";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
        Loading flagged issues...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
            Flagged Issues
          </h3>
          <p style={{ fontSize: "0.875rem", color: "#6b7280", margin: 0 }}>
            Issues you have flagged for this employee. Resolve them once addressed.
          </p>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | "open" | "resolved")}
          style={{
            padding: "0.5rem 0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "0.875rem",
          }}
        >
          <option value="open">Open Only</option>
          <option value="resolved">Resolved</option>
          <option value="all">All Issues</option>
        </select>
      </div>

      {filteredIssues.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "3rem 1rem",
            color: "#6b7280",
            background: "#f9fafb",
            borderRadius: "8px",
          }}
        >
          {filter === "open"
            ? "No open issues for this employee."
            : "No issues found for this filter."}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredIssues.map((issue) => {
            const severityStyle = SEVERITY_COLORS[issue.severity] || SEVERITY_COLORS.medium;
            return (
              <div
                key={issue.id}
                style={{
                  padding: "1.25rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  borderLeft: `4px solid ${issue.status === "open" ? "#dc2626" : "#16a34a"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "0.75rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: severityStyle.bg,
                        color: severityStyle.text,
                        textTransform: "capitalize",
                      }}
                    >
                      {issue.severity}
                    </span>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: "#f3f4f6",
                        color: "#374151",
                        textTransform: "capitalize",
                      }}
                    >
                      {issue.issueType}
                    </span>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: issue.status === "open" ? "#fee2e2" : "#d1fae5",
                        color: issue.status === "open" ? "#991b1b" : "#065f46",
                        textTransform: "capitalize",
                      }}
                    >
                      {issue.status}
                    </span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                    {formatDate(issue.createdAt)}
                  </span>
                </div>
                <p style={{ fontSize: "0.9375rem", color: "#374151", margin: "0 0 0.75rem", lineHeight: 1.5 }}>
                  {issue.description}
                </p>
                {issue.status === "open" && (
                  <button
                    onClick={() => handleResolve(issue.id)}
                    disabled={resolvingId === issue.id}
                    style={{
                      padding: "0.375rem 0.75rem",
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      cursor: resolvingId === issue.id ? "not-allowed" : "pointer",
                      opacity: resolvingId === issue.id ? 0.7 : 1,
                    }}
                  >
                    {resolvingId === issue.id ? "Resolving..." : "Mark Resolved"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
