"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  QuotePartnerAssignmentInput,
  summarizePartnerAssignments,
} from "@/lib/quote-partner-assignments";

interface PartnerOption {
  id: string;
  businessName: string;
  status?: string;
}

interface QuotePartnerAssignmentsSectionProps {
  propertyType: "residential" | "commercial" | "hoa";
  offerMonthlyPrice: number;
  assignments: QuotePartnerAssignmentInput[];
  onChange: (assignments: QuotePartnerAssignmentInput[]) => void;
}

function emptyRow(): QuotePartnerAssignmentInput {
  return {
    partnerId: "",
    partnerName: "",
    scopeLabel: "",
    assignedUnits: null,
    assignedBins: null,
    assignedDumpsters: null,
    monthlyAmount: 0,
    notes: "",
  };
}

export function QuotePartnerAssignmentsSection({
  propertyType,
  offerMonthlyPrice,
  assignments,
  onChange,
}: QuotePartnerAssignmentsSectionProps) {
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);

  const loadPartners = useCallback(async () => {
    try {
      setLoadingPartners(true);
      const response = await fetchWithAuth("/api/admin/partners/list");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load partners");
      }
      const activePartners = (data.partners || [])
        .filter((partner: PartnerOption) => partner.status === "active")
        .map((partner: PartnerOption) => ({
          id: partner.id,
          businessName: partner.businessName || "Partner",
          status: partner.status,
        }));
      setPartners(activePartners);
    } catch {
      setPartners([]);
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const summary = useMemo(
    () => summarizePartnerAssignments(assignments, offerMonthlyPrice),
    [assignments, offerMonthlyPrice]
  );

  if (propertyType === "residential") {
    return null;
  }

  function updateRow(index: number, patch: Partial<QuotePartnerAssignmentInput>) {
    onChange(
      assignments.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    );
  }

  function addRow() {
    onChange([...assignments, emptyRow()]);
  }

  function removeRow(index: number) {
    onChange(assignments.filter((_, rowIndex) => rowIndex !== index));
  }

  function handlePartnerSelect(index: number, partnerId: string) {
    const partner = partners.find((item) => item.id === partnerId);
    updateRow(index, {
      partnerId,
      partnerName: partner?.businessName || "",
    });
  }

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        padding: "1rem",
        borderRadius: "12px",
        border: "1px solid #dbeafe",
        background: "#f8fbff",
      }}
    >
      <div style={{ marginBottom: "0.75rem" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#1e3a8a",
          }}
        >
          Partner Network Split
        </h3>
        <p style={{ margin: "0.35rem 0 0", fontSize: "0.8125rem", color: "#475569" }}>
          Split large commercial or HOA jobs across multiple partners. Each partner sees only
          their slice in the partner dashboard.
        </p>
      </div>

      {assignments.length === 0 ? (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.8125rem", color: "#64748b" }}>
          No partner splits yet. Add partners if this job will be fulfilled by the network.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {assignments.map((row, index) => (
            <div
              key={`assignment-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "0.75rem",
                padding: "0.75rem",
                borderRadius: "10px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
              }}
            >
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                  Partner
                </label>
                <select
                  value={row.partnerId}
                  onChange={(event) => handlePartnerSelect(index, event.target.value)}
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                >
                  <option value="">
                    {loadingPartners ? "Loading partners..." : "Select partner"}
                  </option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.businessName}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                  Scope / Zone
                </label>
                <input
                  type="text"
                  value={row.scopeLabel || ""}
                  onChange={(event) => updateRow(index, { scopeLabel: event.target.value })}
                  placeholder="e.g. North section — 400 units"
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              {propertyType === "hoa" ? (
                <>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                      Units
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={row.assignedUnits ?? ""}
                      onChange={(event) =>
                        updateRow(index, {
                          assignedUnits: event.target.value
                            ? parseInt(event.target.value, 10)
                            : null,
                        })
                      }
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                      Bins
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={row.assignedBins ?? ""}
                      onChange={(event) =>
                        updateRow(index, {
                          assignedBins: event.target.value
                            ? parseInt(event.target.value, 10)
                            : null,
                        })
                      }
                      style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                    Dumpsters
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={row.assignedDumpsters ?? ""}
                    onChange={(event) =>
                      updateRow(index, {
                        assignedDumpsters: event.target.value
                          ? parseInt(event.target.value, 10)
                          : null,
                      })
                    }
                    style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.25rem" }}>
                  Monthly $
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={row.monthlyAmount}
                  onChange={(event) =>
                    updateRow(index, {
                      monthlyAmount: parseFloat(event.target.value) || 0,
                    })
                  }
                  style={{ width: "100%", padding: "0.5rem", borderRadius: "6px", border: "1px solid #cbd5e1" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: "6px",
                    border: "1px solid #fecaca",
                    background: "#fef2f2",
                    color: "#b91c1c",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
        <button
          type="button"
          onClick={addRow}
          style={{
            padding: "0.5rem 0.875rem",
            borderRadius: "8px",
            border: "1px solid #93c5fd",
            background: "#eff6ff",
            color: "#1d4ed8",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + Add Partner Slice
        </button>

        {assignments.length > 0 && (
          <div style={{ fontSize: "0.8125rem", color: summary.matchesOfferPrice ? "#15803d" : "#b45309" }}>
            Partner total: ${summary.totalMonthlyAmount.toLocaleString()} / Offer: $
            {offerMonthlyPrice.toLocaleString()}
            {!summary.matchesOfferPrice && (
              <span> ({summary.difference > 0 ? "remaining" : "over by"} ${Math.abs(summary.difference).toLocaleString()})</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
