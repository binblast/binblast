// components/EmployeeDashboard/PhotoUpload.tsx
"use client";

import { useState, useRef } from "react";

interface PhotoUploadProps {
  onPhotoSelect: (file: File, dataUrl: string) => void;
  currentPhoto?: string | null;
  required?: boolean;
  label?: string;
}

export function PhotoUpload({
  onPhotoSelect,
  currentPhoto,
  required = false,
  label = "Photo",
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      onPhotoSelect(file, dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleRemovePhoto = () => {
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "0.875rem",
          fontWeight: "600",
          marginBottom: "0.5rem",
          color: "#111827",
        }}
      >
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
      </label>

      {preview ? (
        <div>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxHeight: "300px",
              borderRadius: "8px",
              overflow: "hidden",
              border: "2px solid #e5e7eb",
              marginBottom: "0.75rem",
            }}
          >
            <img
              src={preview}
              alt="Preview"
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "300px",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
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
              Change Photo
            </button>
            <button
              type="button"
              onClick={handleCameraClick}
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
              📷 Retake
            </button>
            <button
              type="button"
              onClick={handleRemovePhoto}
              style={{
                padding: "0.75rem 1rem",
                background: "#fee2e2",
                color: "#991b1b",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: "8px",
              padding: "2rem",
              textAlign: "center",
              background: "#f9fafb",
              marginBottom: "0.75rem",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📷</div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
              Take a photo of the cleaned bins
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleCameraClick}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: "#16a34a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                📷 Use Camera
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
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
                📁 Choose File
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {error && (
        <div
          style={{
            marginTop: "0.5rem",
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

      {required && !preview && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.75rem",
            color: "#dc2626",
          }}
        >
          Photo is required to complete this job
        </div>
      )}
    </div>
  );
}

