"use client";

import { useEffect, useState } from "react";
import { getStorageInstance } from "@/lib/firebase-client";

interface EmployeeTaxDocumentsProps {
  employeeId: string;
  refreshKey?: number;
}

function formatSsnInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function formatEinInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function EmployeeTaxDocuments({ employeeId, refreshKey = 0 }: EmployeeTaxDocumentsProps) {
  const [taxInfo, setTaxInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    taxIdType: "ssn" as "ssn" | "ein",
    ssn: "",
    ein: "",
    taxFormType: "w9" as "w9" | "w4",
  });

  useEffect(() => {
    loadTaxInfo();
  }, [employeeId, refreshKey]);

  const loadTaxInfo = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/tax-info`);
      const data = await response.json();
      if (data.success && data.taxInfo) {
        setTaxInfo(data.taxInfo);
        setFormData({
          name: data.taxInfo.name || "",
          taxIdType:
            data.taxInfo.taxIdType ||
            (data.taxInfo.ein && !data.taxInfo.ssnLast4 ? "ein" : "ssn"),
          ssn: "",
          ein: data.taxInfo.ein || "",
          taxFormType: data.taxInfo.taxFormType || "w9",
        });
      }
    } catch (err) {
      console.error("Error loading tax info:", err);
    } finally {
      setLoading(false);
    }
  };

  const uploadW9File = async (file: File): Promise<string | null> => {
    const storage = await getStorageInstance();
    if (!storage) {
      throw new Error("File storage is not available");
    }

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      throw new Error("W-9 must be a PDF or image file (JPG, PNG, WebP)");
    }

    const { ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `employees/${employeeId}/w9/${timestamp}-${safeName}`;
    const storageRef = ref(storage, storagePath);

    const arrayBuffer = await file.arrayBuffer();
    await uploadBytes(storageRef, new Uint8Array(arrayBuffer), {
      contentType: file.type,
    });

    return getDownloadURL(storageRef);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const url = await uploadW9File(file);
      if (!url) throw new Error("Upload failed");

      const response = await fetch(`/api/operator/employees/${employeeId}/tax-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          taxIdType: formData.taxIdType,
          taxFormType: formData.taxFormType,
          ssn: formData.taxIdType === "ssn" ? formData.ssn : "",
          ein: formData.taxIdType === "ein" ? formData.ein : "",
          w9DocumentUrl: url,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save W-9 document");
      }

      setSuccess("W-9 document uploaded successfully");
      await loadTaxInfo();
    } catch (err: any) {
      setError(err.message || "Failed to upload W-9");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/tax-info`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          taxIdType: formData.taxIdType,
          taxFormType: formData.taxFormType,
          ssn: formData.taxIdType === "ssn" ? formData.ssn : "",
          ein: formData.taxIdType === "ein" ? formData.ein : "",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to save tax information");
      }

      setSuccess("Tax information saved");
      await loadTaxInfo();
    } catch (err: any) {
      setError(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
        Loading tax documents...
      </div>
    );
  }

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}
    >
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", color: "#111827", marginBottom: "0.5rem" }}>
        Tax & W-9 Documents
      </h3>
      <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1.5rem" }}>
        Store this employee&apos;s W-9 and tax information digitally for your records.
      </p>

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "#fee2e2",
            color: "#991b1b",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "#d1fae5",
            color: "#065f46",
            borderRadius: "6px",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          {success}
        </div>
      )}

      <div
        style={{
          padding: "1.5rem",
          background: taxInfo?.w9DocumentUrl ? "#f0fdf4" : "#f9fafb",
          border: `2px dashed ${taxInfo?.w9DocumentUrl ? "#86efac" : "#d1d5db"}`,
          borderRadius: "8px",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        {taxInfo?.w9DocumentUrl ? (
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✓</div>
            <div style={{ fontWeight: "600", color: "#065f46", marginBottom: "0.5rem" }}>
              W-9 On File
            </div>
            <a
              href={taxInfo.w9DocumentUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                background: "#16a34a",
                color: "#ffffff",
                borderRadius: "6px",
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: "600",
                marginRight: "0.5rem",
              }}
            >
              View W-9 Document
            </a>
            <label
              style={{
                display: "inline-block",
                padding: "0.5rem 1rem",
                background: "#ffffff",
                color: "#374151",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Replace Document"}
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📄</div>
            <div style={{ fontWeight: "600", color: "#374151", marginBottom: "0.5rem" }}>
              No W-9 Uploaded Yet
            </div>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "1rem" }}>
              Upload a completed W-9 form (PDF or image)
            </p>
            <label
              style={{
                display: "inline-block",
                padding: "0.625rem 1.25rem",
                background: uploading ? "#9ca3af" : "#3b82f6",
                color: "#ffffff",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: uploading ? "not-allowed" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Upload W-9"}
              <input
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: "none" }}
              />
            </label>
          </div>
        )}
      </div>

      <form onSubmit={handleSaveInfo} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
            Legal Name (as on tax return)
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
            placeholder="Full legal name"
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
            Tax ID Type
          </label>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="taxIdType"
                value="ssn"
                checked={formData.taxIdType === "ssn"}
                onChange={() =>
                  setFormData({ ...formData, taxIdType: "ssn", ein: "" })
                }
              />
              Social Security Number (SSN)
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.875rem",
                color: "#374151",
                cursor: "pointer",
              }}
            >
              <input
                type="radio"
                name="taxIdType"
                value="ein"
                checked={formData.taxIdType === "ein"}
                onChange={() =>
                  setFormData({ ...formData, taxIdType: "ein", ssn: "" })
                }
              />
              Employer Identification Number (EIN)
            </label>
          </div>
        </div>

        {formData.taxIdType === "ssn" ? (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
              Social Security Number
            </label>
            <input
              type="text"
              value={formData.ssn}
              onChange={(e) =>
                setFormData({ ...formData, ssn: formatSsnInput(e.target.value) })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
              placeholder="XXX-XX-XXXX"
              maxLength={11}
              inputMode="numeric"
            />
            {taxInfo?.ssnLast4 && !formData.ssn && (
              <p style={{ fontSize: "0.8125rem", color: "#6b7280", margin: "0.5rem 0 0" }}>
                SSN on file: •••-••-{taxInfo.ssnLast4}. Enter the full number above to update.
              </p>
            )}
          </div>
        ) : (
          <div>
            <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
              Employer Identification Number (EIN)
            </label>
            <input
              type="text"
              value={formData.ein}
              onChange={(e) =>
                setFormData({ ...formData, ein: formatEinInput(e.target.value) })
              }
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
              placeholder="XX-XXXXXXX"
              maxLength={10}
              inputMode="numeric"
            />
          </div>
        )}

        <div>
          <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem", color: "#374151" }}>
            Tax Form Type
          </label>
          <select
            value={formData.taxFormType}
            onChange={(e) => setFormData({ ...formData, taxFormType: e.target.value as "w9" | "w4" })}
            style={{
              width: "100%",
              padding: "0.75rem",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              fontSize: "0.875rem",
            }}
          >
            <option value="w9">W-9 (Contractor)</option>
            <option value="w4">W-4 (Employee)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "0.75rem 1.5rem",
            background: saving ? "#9ca3af" : "#16a34a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
            alignSelf: "flex-start",
          }}
        >
          {saving ? "Saving..." : "Save Tax Info"}
        </button>
      </form>
    </div>
  );
}
