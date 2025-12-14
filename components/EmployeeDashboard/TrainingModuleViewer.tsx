// components/EmployeeDashboard/TrainingModuleViewer.tsx
"use client";

import { useState, useEffect, useRef } from "react";

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
  const [loading, setLoading] = useState(true);
  const [pdfLoaded, setPdfLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Mark as viewed after a delay (user has had time to view)
    if (!viewed && pdfUrl && pdfLoaded) {
      const timer = setTimeout(() => {
        setViewed(true);
        onPdfViewed();
      }, 5000); // Mark as viewed after 5 seconds of viewing
      return () => clearTimeout(timer);
    }
  }, [pdfUrl, viewed, pdfLoaded, onPdfViewed]);

  // Reset loading state when PDF URL changes
  useEffect(() => {
    if (pdfUrl) {
      setLoading(true);
      setError(null);
      setPdfLoaded(false);
    }
  }, [pdfUrl]);

  const handleDownload = () => {
    if (pdfUrl) {
      // Try to open in new tab first, then fallback to download
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = pdfFileName || `${moduleId}.pdf`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
    
    // Check if iframe content indicates an error (404 page)
    if (iframeRef.current?.contentWindow) {
      try {
        const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow.document;
        const bodyText = iframeDoc?.body?.innerText || "";
        if (bodyText.includes("404") || bodyText.includes("not found") || bodyText.includes("could not be found")) {
          setError("The PDF file could not be found. Please contact support if this issue persists.");
          setPdfLoaded(false);
        } else {
          setPdfLoaded(true);
          setError(null);
        }
      } catch (e) {
        // Cross-origin restrictions may prevent access, but PDF likely loaded if no error thrown
        setPdfLoaded(true);
        setError(null);
      }
    } else {
      setPdfLoaded(true);
      setError(null);
    }
  };

  const handleIframeError = () => {
    setLoading(false);
    setPdfLoaded(false);
    setError("Failed to load PDF. The file may not be available. Please try downloading it instead or contact support.");
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
          position: "relative",
        }}
      >
        {loading && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 10,
              padding: "1rem",
              background: "#ffffff",
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #2563eb",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading PDF...</span>
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1`}
          style={{
            width: "100%",
            height: "calc(100vh - 300px)",
            minHeight: "700px",
            border: "none",
            display: loading && error ? "none" : "block",
          }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          title={moduleName}
          allow="fullscreen"
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
          <div style={{ fontWeight: "600", marginBottom: "0.5rem" }}>⚠️ PDF Loading Error</div>
          <div style={{ fontSize: "0.875rem" }}>{error}</div>
          <div style={{ marginTop: "0.75rem", fontSize: "0.875rem" }}>
            You can still try downloading the PDF using the button above, or contact support if the issue persists.
          </div>
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

