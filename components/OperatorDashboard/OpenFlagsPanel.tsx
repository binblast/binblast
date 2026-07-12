"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface OpenIssue {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
  issueType: string;
  description: string;
  severity: string;
  status: string;
  createdAt: string | null;
}

export function OpenFlagsPanel() {
  const router = useRouter();
  const [issues, setIssues] = useState<OpenIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadOpenIssues();
  }, []);

  const loadOpenIssues = async () => {
    try {
      const response = await fetch("/api/operator/issues?status=open");
      if (response.ok) {
        const data = await response.json();
        setIssues(data.issues || []);
      }
    } catch (error) {
      console.error("Error loading open flags:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) return null;

  if (issues.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem 1.25rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              background: "#dc2626",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: "700",
            }}
          >
            {issues.length}
          </span>
          <div>
            <div style={{ fontSize: "1rem", fontWeight: "600", color: "#991b1b" }}>
              Open Employee Flags
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#b91c1c" }}>
              Review and follow up on flagged issues
            </div>
          </div>
        </div>
        <span style={{ color: "#991b1b", fontSize: "1.25rem" }}>{expanded ? "−" : "+"}</span>
      </button>

      {expanded && (
        <div style={{ padding: "0 1.25rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {issues.slice(0, 5).map((issue) => (
            <div
              key={issue.id}
              style={{
                padding: "1rem",
                background: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #fecaca",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                  {issue.employeeName || "Unknown Employee"}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                  <span style={{ textTransform: "capitalize" }}>{issue.issueType}</span>
                  {" · "}
                  <span style={{ textTransform: "capitalize" }}>{issue.severity}</span>
                  {issue.createdAt && ` · ${formatDate(issue.createdAt)}`}
                </div>
                <div style={{ fontSize: "0.875rem", color: "#374151", lineHeight: 1.4 }}>
                  {issue.description.length > 120
                    ? `${issue.description.slice(0, 120)}...`
                    : issue.description}
                </div>
              </div>
              <button
                onClick={() => router.push(`/operator/employees/${issue.employeeId}?tab=issues`)}
                style={{
                  padding: "0.5rem 1rem",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "0.8125rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                View Employee
              </button>
            </div>
          ))}
          {issues.length > 5 && (
            <div style={{ fontSize: "0.8125rem", color: "#991b1b", textAlign: "center" }}>
              +{issues.length - 5} more open flags
            </div>
          )}
        </div>
      )}
    </div>
  );
}
