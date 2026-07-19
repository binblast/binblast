"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface PartnerQuoteAssignmentRow {
  id: string;
  quoteId: string;
  offerId?: string | null;
  scopeLabel: string;
  assignedUnits?: number | null;
  assignedBins?: number | null;
  assignedDumpsters?: number | null;
  monthlyAmount: number;
  status: string;
  notes: string;
  updatedAt: string | null;
  quoteSummary?: {
    customerName: string;
    propertyType: string;
    address: string;
  } | null;
}

export function PartnerQuoteAssignmentsPanel() {
  const [assignments, setAssignments] = useState<PartnerQuoteAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth("/api/partners/quote-assignments");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load quote assignments");
      }
      setAssignments(data.assignments || []);
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load quote assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "16px",
        padding: "1.5rem",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
        border: "1px solid #e5e7eb",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: "700", color: "#111827", marginBottom: "0.25rem" }}>
            Quote Assignments
          </h2>
          <p style={{ color: "#6b7280", fontSize: "0.95rem", maxWidth: "640px" }}>
            Large commercial or HOA jobs split across the partner network. You only see your assigned slice.
          </p>
        </div>
        <button
          onClick={loadAssignments}
          style={{
            padding: "0.625rem 1rem",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading quote assignments...</p>
      ) : error ? (
        <p style={{ color: "#dc2626" }}>{error}</p>
      ) : assignments.length === 0 ? (
        <p style={{ color: "#6b7280" }}>No quote assignments yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {assignments.map((row) => (
            <div
              key={row.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                padding: "1rem",
                background: "#fafafa",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontWeight: 700, color: "#111827" }}>
                    {row.quoteSummary?.customerName || "Custom quote"}
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {row.quoteSummary?.propertyType || "commercial"} • {row.quoteSummary?.address || "Address on file"}
                  </div>
                </div>
                <span
                  style={{
                    alignSelf: "flex-start",
                    padding: "0.25rem 0.625rem",
                    borderRadius: "999px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    background: row.status === "active" ? "#dcfce7" : "#fef3c7",
                    color: row.status === "active" ? "#166534" : "#92400e",
                  }}
                >
                  {row.status}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginTop: "0.75rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Your scope</div>
                  <div style={{ fontWeight: 600 }}>{row.scopeLabel || "Assigned slice"}</div>
                </div>
                {typeof row.assignedUnits === "number" && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Units</div>
                    <div style={{ fontWeight: 600 }}>{row.assignedUnits}</div>
                  </div>
                )}
                {typeof row.assignedBins === "number" && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Bins</div>
                    <div style={{ fontWeight: 600 }}>{row.assignedBins}</div>
                  </div>
                )}
                {typeof row.assignedDumpsters === "number" && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Dumpsters</div>
                    <div style={{ fontWeight: 600 }}>{row.assignedDumpsters}</div>
                  </div>
                )}
                <div>
                  <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Monthly amount</div>
                  <div style={{ fontWeight: 700, color: "#15803d" }}>
                    ${row.monthlyAmount.toLocaleString()}
                  </div>
                </div>
              </div>

              {row.notes ? (
                <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "#374151" }}>
                  {row.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
