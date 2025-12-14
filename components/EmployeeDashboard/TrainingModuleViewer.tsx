// components/EmployeeDashboard/TrainingModuleViewer.tsx
"use client";

import { useState, useEffect } from "react";

interface TrainingModuleViewerProps {
  moduleId: string;
  moduleName: string;
  pdfUrl?: string;
  pdfFileName?: string;
  onPdfViewed: () => void;
  onStartQuiz: () => void;
  pdfViewed: boolean;
}

export function TrainingModuleViewer({
  moduleId,
  moduleName,
  pdfUrl,
  pdfFileName,
  onPdfViewed,
  onStartQuiz,
  pdfViewed,
}: TrainingModuleViewerProps) {
  const [error, setError] = useState<string | null>(null);
  const [viewed, setViewed] = useState(pdfViewed);

  useEffect(() => {
    // Mark as viewed after a delay (user has had time to view)
    if (!viewed && pdfUrl) {
      const timer = setTimeout(() => {
        setViewed(true);
        onPdfViewed();
      }, 5000); // Mark as viewed after 5 seconds of viewing
      return () => clearTimeout(timer);
    }
  }, [pdfUrl, viewed, onPdfViewed]);

  const handleDownload = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = pdfFileName || `${moduleId}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleMarkViewed = () => {
    setViewed(true);
    onPdfViewed();
  };

  if (!pdfUrl) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          background: "#f9fafb",
          borderRadius: "8px",
          color: "#6b7280",
        }}
      >
        PDF material not yet available for this module.
      </div>
    );
  }

  return (
    <div>
      {/* Header with Download Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {moduleName}
        </h3>
        <button
          onClick={handleDownload}
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          📥 Download PDF
        </button>
      </div>

      {/* PDF Viewer */}
      <div
        style={{
          border: "2px solid #e5e7eb",
          borderRadius: "8px",
          overflow: "hidden",
          background: "#ffffff",
          marginBottom: "1rem",
        }}
      >
        <iframe
          src={pdfUrl}
          style={{
            width: "100%",
            height: "600px",
            border: "none",
          }}
          onError={() => {
            setError("Failed to load PDF");
          }}
          title={moduleName}
        />
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#dc2626",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
        {!viewed && (
          <button
            onClick={handleMarkViewed}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#f3f4f6",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Mark as Viewed
          </button>
        )}
        <button
          onClick={onStartQuiz}
          disabled={!viewed}
          style={{
            padding: "0.75rem 1.5rem",
            background: viewed ? "#16a34a" : "#9ca3af",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: viewed ? "pointer" : "not-allowed",
            transition: "background 0.2s",
          }}
          onMouseOver={(e) => {
            if (viewed) {
              e.currentTarget.style.background = "#15803d";
            }
          }}
          onMouseOut={(e) => {
            if (viewed) {
              e.currentTarget.style.background = "#16a34a";
            }
          }}
        >
          {viewed ? "Take Quiz →" : "View PDF First"}
        </button>
      </div>

      {!viewed && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fef3c7",
            border: "1px solid #fde68a",
            borderRadius: "6px",
            fontSize: "0.875rem",
            color: "#92400e",
          }}
        >
          ⚠️ Please review the PDF material before taking the quiz.
        </div>
      )}
    </div>
  );
}

