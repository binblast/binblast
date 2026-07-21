"use client";

import { PartnerStatSheet, downloadPartnerStatSheet } from "@/lib/partner-dashboard-exports";

interface PartnerStatReportModalProps {
  sheet: PartnerStatSheet | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PartnerStatReportModal({
  sheet,
  isOpen,
  onClose,
}: PartnerStatReportModalProps) {
  if (!isOpen || !sheet) return null;

  const reportSheet = sheet;

  function handleDownload() {
    downloadPartnerStatSheet(reportSheet);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        zIndex: 3000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 1.5rem)",
      }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="partner-stat-report-title"
        style={{
          background: "#ffffff",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "960px",
          maxHeight: "min(90dvh, 90vh)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
          }}
        >
          <div>
            <h2
              id="partner-stat-report-title"
              style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#111827" }}
            >
              {sheet.title}
            </h2>
            {sheet.subtitle ? (
              <p style={{ margin: "0.35rem 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
                {sheet.subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close report"
            style={{
              background: "#f3f4f6",
              border: "1px solid #e5e7eb",
              borderRadius: "999px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
              fontSize: "1.25rem",
              lineHeight: 1,
              color: "#6b7280",
            }}
          >
            ×
          </button>
        </div>

        {sheet.summary?.length ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "0.75rem",
              padding: "1rem 1.5rem",
              background: "#f8fafc",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            {sheet.summary.map((item) => (
              <div
                key={item.label}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "0.875rem 1rem",
                }}
              >
                <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>
                  {item.label}
                </div>
                <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#111827" }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "1rem 1.5rem" }}>
          {sheet.rows.length === 0 ? (
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>
              {sheet.emptyMessage || "No records to show."}
            </p>
          ) : (
            <div className="table-responsive">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {sheet.headers.map((header) => (
                      <th
                        key={header}
                        style={{
                          textAlign: "left",
                          padding: "0.75rem 0.625rem",
                          borderBottom: "2px solid #e5e7eb",
                          color: "#374151",
                          whiteSpace: "nowrap",
                          background: "#f9fafb",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.rows.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={`cell-${rowIndex}-${cellIndex}`}
                          style={{
                            padding: "0.75rem 0.625rem",
                            borderBottom: "1px solid #f3f4f6",
                            color: "#111827",
                            verticalAlign: "top",
                          }}
                        >
                          {cell || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "1rem 1.5rem calc(1rem + env(safe-area-inset-bottom))",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "flex-end",
            gap: "0.75rem",
            flexWrap: "wrap",
            background: "#ffffff",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "10px",
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              padding: "0.75rem 1.25rem",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
              color: "#ffffff",
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(37, 99, 235, 0.25)",
            }}
          >
            Download CSV
          </button>
        </div>
      </div>
    </div>
  );
}
