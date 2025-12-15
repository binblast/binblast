// components/EmployeeDashboard/CertificateWidget.tsx
// Dashboard widget showing current certificate

"use client";

import { useState, useEffect } from "react";
import { TrainingCertificate } from "../Certificate/TrainingCertificate";

interface CertificateWidgetProps {
  employeeId: string;
  employeeName: string;
}

export function CertificateWidget({ employeeId, employeeName }: CertificateWidgetProps) {
  const [certificate, setCertificate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCertificate, setShowCertificate] = useState(false);

  useEffect(() => {
    loadCertificate();
  }, [employeeId]);

  const loadCertificate = async () => {
    try {
      const response = await fetch(
        `/api/employee/training/certificate?employeeId=${employeeId}`
      );
      if (response.ok) {
        const data = await response.json();
        setCertificate(data.certificate);
      }
    } catch (err) {
      console.error("Error loading certificate:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!certificate) return;

    try {
      // Generate certificate HTML
      const { generateCertificateHTML } = await import("@/lib/certificate-pdf");
      const html = generateCertificateHTML({
        employeeName,
        certificateId: certificate.certId,
        issueDate: certificate.issuedAt,
        expiryDate: certificate.expiresAt,
        scoreSummary: certificate.scoreSummary,
      });

      // Open in new window for printing/downloading
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        
        // Wait for content to load, then trigger print dialog
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
      }
    } catch (error) {
      console.error("Error generating certificate PDF:", error);
      // Fallback: open certificate view
      setShowCertificate(true);
    }
  };

  if (loading) {
    return null;
  }

  if (!certificate) {
    return null;
  }

  const expiryDate = new Date(certificate.expiresAt);
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpired = daysUntilExpiry < 0;
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.5rem",
        border: "1px solid #e5e7eb",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "start",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "0.5rem",
            }}
          >
            Training Certificate
          </h3>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Certificate ID: {certificate.certId}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Issued: {new Date(certificate.issuedAt).toLocaleDateString()}
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            Expires: {new Date(certificate.expiresAt).toLocaleDateString()}
          </div>
        </div>
        <div
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            fontSize: "0.75rem",
            fontWeight: "600",
            background: isExpired
              ? "#fee2e2"
              : isExpiringSoon
              ? "#fef3c7"
              : "#d1fae5",
            color: isExpired
              ? "#991b1b"
              : isExpiringSoon
              ? "#92400e"
              : "#065f46",
          }}
        >
          {isExpired
            ? "Expired"
            : isExpiringSoon
            ? `${daysUntilExpiry} days left`
            : "Active"}
        </div>
      </div>

      {isExpired && (
        <div
          style={{
            padding: "0.75rem",
            background: "#fee2e2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            fontSize: "0.875rem",
            color: "#991b1b",
            marginBottom: "1rem",
          }}
        >
          Your certificate has expired. Please complete re-certification training.
        </div>
      )}

      {isExpiringSoon && !isExpired && (
        <div
          style={{
            padding: "0.75rem",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "8px",
            fontSize: "0.875rem",
            color: "#92400e",
            marginBottom: "1rem",
          }}
        >
          Your certificate expires in {daysUntilExpiry} days. Re-certification will be required soon.
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          onClick={() => setShowCertificate(true)}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          View Certificate
        </button>
        <button
          onClick={handleDownloadPDF}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Download PDF
        </button>
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "2rem",
          }}
          onClick={() => setShowCertificate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            <TrainingCertificate
              employeeName={employeeName}
              certificateId={certificate.certId}
              issueDate={certificate.issuedAt}
              expiryDate={certificate.expiresAt}
              scoreSummary={certificate.scoreSummary}
            />
            <button
              onClick={() => setShowCertificate(false)}
              style={{
                marginTop: "1rem",
                width: "100%",
                padding: "0.75rem",
                background: "#f3f4f6",
                color: "#111827",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
