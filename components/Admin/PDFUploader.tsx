// components/Admin/PDFUploader.tsx
// PDF upload component for admin

"use client";

import { useState } from "react";
import { uploadTrainingPDF, verifyPDFURL } from "@/lib/training-pdf-upload";

interface PDFUploaderProps {
  moduleId: string;
  moduleName: string;
  currentPdfUrl?: string;
  onUploadComplete: (url: string) => void;
}

export function PDFUploader({
  moduleId,
  moduleName,
  currentPdfUrl,
  onUploadComplete,
}: PDFUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf") {
      setError("File must be a PDF");
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadTrainingPDF(file, moduleId, file.name);

      if (result.success && result.url) {
        setSuccess("PDF uploaded successfully!");
        onUploadComplete(result.url);
      } else {
        setError(result.error || "Failed to upload PDF");
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload PDF");
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleVerify = async () => {
    if (!currentPdfUrl) return;

    setError(null);
    setSuccess(null);

    const isValid = await verifyPDFURL(currentPdfUrl);
    if (isValid) {
      setSuccess("PDF URL is valid and accessible");
    } else {
      setError("PDF URL is invalid or not accessible");
    }
  };

  return (
    <div>
      {currentPdfUrl && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
            Current PDF URL:
          </div>
          <div
            style={{
              padding: "0.75rem",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
              wordBreak: "break-all",
              marginBottom: "0.5rem",
            }}
          >
            {currentPdfUrl}
          </div>
          <button
            onClick={handleVerify}
            style={{
              padding: "0.5rem 1rem",
              background: "#f3f4f6",
              color: "#111827",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Verify URL
          </button>
        </div>
      )}

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          padding: "2rem",
          border: `2px dashed ${dragActive ? "#2563eb" : "#e5e7eb"}`,
          borderRadius: "8px",
          background: dragActive ? "#eff6ff" : "#f9fafb",
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
        }}
      >
        <input
          type="file"
          id={`pdf-upload-${moduleId}`}
          accept="application/pdf"
          onChange={handleChange}
          disabled={uploading}
          style={{ display: "none" }}
        />
        <label
          htmlFor={`pdf-upload-${moduleId}`}
          style={{
            cursor: uploading ? "not-allowed" : "pointer",
            display: "block",
          }}
        >
          {uploading ? (
            <div style={{ color: "#6b7280" }}>Uploading PDF...</div>
          ) : (
            <>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}></div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                Drop PDF here or click to upload
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                Upload PDF for {moduleName}
              </div>
            </>
          )}
        </label>
      </div>

      {error && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "6px",
            color: "#dc2626",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#d1fae5",
            border: "1px solid #86efac",
            borderRadius: "6px",
            color: "#065f46",
            fontSize: "0.875rem",
          }}
        >
          {success}
        </div>
      )}
    </div>
  );
}
