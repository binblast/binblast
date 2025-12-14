// components/Certificate/TrainingCertificate.tsx
// Certificate template component

"use client";

interface TrainingCertificateProps {
  employeeName: string;
  certificateId: string;
  issueDate: string;
  expiryDate: string;
  scoreSummary?: number;
}

export function TrainingCertificate({
  employeeName,
  certificateId,
  issueDate,
  expiryDate,
  scoreSummary,
}: TrainingCertificateProps) {
  return (
    <div
      style={{
        width: "8.5in",
        height: "11in",
        background: "#ffffff",
        padding: "2rem",
        border: "4px solid #16a34a",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
        fontFamily: "serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            color: "#16a34a",
            marginBottom: "0.5rem",
          }}
        >
          Bin Blast Co.
        </div>
        <div
          style={{
            fontSize: "1.25rem",
            color: "#6b7280",
            fontWeight: "600",
          }}
        >
          Certificate of Training Completion
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div
          style={{
            fontSize: "1.125rem",
            color: "#6b7280",
            marginBottom: "1rem",
          }}
        >
          This is to certify that
        </div>
        <div
          style={{
            fontSize: "2rem",
            fontWeight: "700",
            color: "#111827",
            marginBottom: "2rem",
            borderBottom: "2px solid #16a34a",
            paddingBottom: "1rem",
            display: "inline-block",
          }}
        >
          {employeeName}
        </div>
        <div
          style={{
            fontSize: "1rem",
            color: "#6b7280",
            marginBottom: "1rem",
            lineHeight: "1.6",
          }}
        >
          has successfully completed all required training modules
          {scoreSummary !== undefined && ` with an average score of ${scoreSummary}%`}
        </div>
        <div
          style={{
            fontSize: "1rem",
            color: "#6b7280",
            marginBottom: "2rem",
          }}
        >
          and is certified to perform bin cleaning services for Bin Blast Co.
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "2rem",
          fontSize: "0.875rem",
          color: "#6b7280",
        }}
      >
        <div>
          <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Issue Date</div>
          <div>{new Date(issueDate).toLocaleDateString()}</div>
        </div>
        <div>
          <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>Expiry Date</div>
          <div>{new Date(expiryDate).toLocaleDateString()}</div>
        </div>
      </div>

      {/* Certificate ID */}
      <div
        style={{
          marginTop: "2rem",
          fontSize: "0.75rem",
          color: "#9ca3af",
        }}
      >
        Certificate ID: {certificateId}
      </div>
    </div>
  );
}
