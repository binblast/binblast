// components/EmployeeDashboard/PhotoUpload.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { PhotoExamples } from "./PhotoExamples";

interface PhotoUploadProps {
  onPhotoSelect: (file: File, dataUrl: string) => void;
  onPhotoUploaded?: (photoId: string, storageUrl: string) => void;
  currentPhoto?: string | null;
  required?: boolean;
  label?: string;
  photoType?: "inside" | "outside" | "dumpster_pad" | "sticker_placement";
  jobId?: string;
  employeeId?: string;
  showExamples?: boolean;
  uploadImmediately?: boolean;
}

export function PhotoUpload({
  onPhotoSelect,
  onPhotoUploaded,
  currentPhoto,
  required = false,
  label = "Photo",
  photoType,
  jobId,
  employeeId,
  showExamples = false,
  uploadImmediately = false,
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentPhoto || null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPhotoId, setUploadedPhotoId] = useState<string | null>(null);
  const [gpsCoordinates, setGpsCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const cachedPhotoRef = useRef<{ photoId: string; storageUrl: string; file: File } | null>(null);

  // Request GPS coordinates when component mounts (optional)
  useEffect(() => {
    if (navigator.geolocation && photoType) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          // GPS is optional, so we don't show an error
          console.log("GPS not available:", err.message);
        },
        { timeout: 5000, maximumAge: 60000 }
      );
    }
  }, [photoType]);

  // Check for cached photo on mount
  useEffect(() => {
    if (jobId && photoType) {
      const cacheKey = `job-photo-${jobId}-${photoType}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData = JSON.parse(cached);
          if (cachedData.photoId && cachedData.storageUrl) {
            setUploadedPhotoId(cachedData.photoId);
            setPreview(cachedData.storageUrl);
            cachedPhotoRef.current = cachedData;
            if (onPhotoUploaded) {
              onPhotoUploaded(cachedData.photoId, cachedData.storageUrl);
            }
          }
        } catch (e) {
          console.error("Error loading cached photo:", e);
        }
      }
    }
  }, [jobId, photoType, onPhotoUploaded]);

  const uploadPhoto = async (file: File, dataUrl: string): Promise<void> => {
    if (!jobId || !employeeId || !photoType) {
      // If upload not configured, just call onPhotoSelect
      onPhotoSelect(file, dataUrl);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("photoType", photoType);
      formData.append("employeeId", employeeId);
      
      if (gpsCoordinates) {
        formData.append("latitude", gpsCoordinates.latitude.toString());
        formData.append("longitude", gpsCoordinates.longitude.toString());
      }

      const response = await fetch(`/api/employee/jobs/${jobId}/photos/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload photo");
      }

      const result = await response.json();
      
      if (result.success && result.photoId && result.storageUrl) {
        setUploadedPhotoId(result.photoId);
        setUploadProgress(100);
        
        // Cache photo data
        const cacheKey = `job-photo-${jobId}-${photoType}`;
        const cacheData = {
          photoId: result.photoId,
          storageUrl: result.storageUrl,
          file: null, // Don't cache file object
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        cachedPhotoRef.current = cacheData;

        if (onPhotoUploaded) {
          onPhotoUploaded(result.photoId, result.storageUrl);
        }
        
        // Also call onPhotoSelect with storage URL
        onPhotoSelect(file, result.storageUrl);
      } else {
        throw new Error("Upload failed - no photo ID returned");
      }
    } catch (err: any) {
      console.error("Photo upload error:", err);
      setError(err.message || "Failed to upload photo. Please try again.");
      setUploadProgress(0);
      // Still call onPhotoSelect with data URL so user can retry
      onPhotoSelect(file, dataUrl);
    } finally {
      setUploading(false);
    }
  };

  const retryUpload = async () => {
    if (cachedPhotoRef.current?.file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        uploadPhoto(cachedPhotoRef.current!.file, dataUrl);
      };
      reader.readAsDataURL(cachedPhotoRef.current.file);
    } else if (fileInputRef.current?.files?.[0]) {
      const file = fileInputRef.current.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        uploadPhoto(file, dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = async (file: File) => {
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
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      
      // Store file reference for retry
      cachedPhotoRef.current = {
        ...cachedPhotoRef.current,
        file,
      } as any;

      // Upload immediately if configured, otherwise just select
      if (uploadImmediately && jobId && employeeId && photoType) {
        await uploadPhoto(file, dataUrl);
      } else {
        onPhotoSelect(file, dataUrl);
      }
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

      {/* Upload Progress */}
      {uploading && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.75rem",
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            borderRadius: "6px",
          }}
        >
          <div style={{ fontSize: "0.875rem", color: "#1e40af", marginBottom: "0.5rem" }}>
            Uploading photo... {uploadProgress}%
          </div>
          <div
            style={{
              width: "100%",
              height: "4px",
              background: "#dbeafe",
              borderRadius: "2px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${uploadProgress}%`,
                height: "100%",
                background: "#2563eb",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>
      )}

      {/* Upload Success Indicator */}
      {uploadedPhotoId && !uploading && (
        <div
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 0.75rem",
            background: "#d1fae5",
            border: "1px solid #86efac",
            borderRadius: "6px",
            fontSize: "0.75rem",
            color: "#065f46",
          }}
        >
          ✓ Photo uploaded successfully
        </div>
      )}

      {/* Retry Button */}
      {error && !uploading && (
        <div style={{ marginTop: "0.5rem" }}>
          <button
            type="button"
            onClick={retryUpload}
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
            Retry Upload
          </button>
        </div>
      )}

      {/* Photo Examples */}
      {showExamples && photoType && (
        <PhotoExamples photoType={photoType} />
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

