// components/EmployeeDashboard/PDFViewer.tsx
// PDF viewer component with page tracking

"use client";

import { useState, useEffect, useRef } from "react";

interface PDFViewerProps {
  pdfUrl: string;
  moduleId: string;
  employeeId: string;
  onPageChange?: (page: number) => void;
  initialPage?: number;
}

export function PDFViewer({
  pdfUrl,
  moduleId,
  employeeId,
  initialPage = 1,
  onPageChange,
}: PDFViewerProps) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
  }, [pdfUrl]);

  const savePagePosition = async (page: number) => {
    try {
      await fetch("/api/employee/training/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          moduleId,
          updates: {
            lastPagePosition: page,
            pdfViewed: true,
          },
        }),
      });
    } catch (err) {
      console.error("Error saving page position:", err);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    onPageChange?.(newPage);

    // Debounce saving page position
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePagePosition(newPage);
    }, 1000);
  };

  const handleIframeLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setLoading(false);
    setError("Failed to load PDF. Please check if the PDF URL is valid.");
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (error) {
    return (
      <div
        style={{
          padding: "2rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          PDF Not Available
        </div>
        <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>{error}</div>
        <button
          onClick={() => {
            // Notify admin functionality
            window.location.href = `mailto:binblastcompany@gmail.com?subject=PDF Missing: ${moduleId}&body=The PDF for module ${moduleId} is not available.`;
          }}
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Notify Admin
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
            borderRadius: "8px",
            zIndex: 10,
          }}
        >
          <div style={{ color: "#6b7280" }}>Loading PDF...</div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={`${pdfUrl}#page=${currentPage}`}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        style={{
          width: "100%",
          height: "600px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
        }}
        title="PDF Viewer"
      />
      {/* Page Navigation Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "1rem",
          marginTop: "1rem",
        }}
      >
        <button
          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          style={{
            padding: "0.5rem 1rem",
            background: currentPage <= 1 ? "#f3f4f6" : "#2563eb",
            color: currentPage <= 1 ? "#9ca3af" : "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: currentPage <= 1 ? "not-allowed" : "pointer",
          }}
        >
          ← Previous
        </button>
        <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Page {currentPage}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
