// components/OperatorDashboard/EmployeeDetail/ProofOfWorkSection.tsx
"use client";

import { useEffect, useState } from "react";

interface Proof {
  cleaningId: string;
  completionPhotoUrl: string | null;
  employeeNotes: string | null;
  operatorNotes: string | null;
  flags: string[];
  completedAt: any;
  scheduledDate: string | null;
}

interface ProofOfWorkSectionProps {
  employeeId: string;
  cleaningId?: string;
}

export function ProofOfWorkSection({ employeeId, cleaningId }: ProofOfWorkSectionProps) {
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [isOperatorOverride, setIsOperatorOverride] = useState(false);

  useEffect(() => {
    loadProof();
  }, [employeeId, cleaningId]);

  const loadProof = async () => {
    try {
      const url = cleaningId
        ? `/api/operator/employees/${employeeId}/proof?cleaningId=${cleaningId}`
        : `/api/operator/employees/${employeeId}/proof`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (cleaningId) {
          setProof(data.proof);
        } else {
          setProofs(data.proofs || []);
        }
      }
    } catch (error) {
      console.error("Error loading proof:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async () => {
    if (!photoFile && !isOperatorOverride) {
      alert("Photo is required unless operator override is provided");
      return;
    }

    setUploading(true);
    try {
      // In a real implementation, upload photo to storage first
      // For now, we'll use a placeholder
      const photoUrl = photoFile ? URL.createObjectURL(photoFile) : null;

      const response = await fetch(`/api/operator/employees/${employeeId}/proof`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cleaningId: cleaningId || "",
          photoUrl,
          note,
          isOperatorOverride,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to upload proof");
      }

      alert("Proof uploaded successfully");
      setPhotoFile(null);
      setNote("");
      setIsOperatorOverride(false);
      loadProof();
    } catch (error: any) {
      alert(error.message || "Failed to upload proof");
    } finally {
      setUploading(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US");
    } catch {
      return "N/A";
    }
  };

  if (loading) {
    return (
      <div style={{
        background: "#ffffff",
        borderRadius: "12px",
        padding: "2rem",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
        border: "1px solid #e5e7eb",
      }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>Loading proof...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: "#ffffff",
      borderRadius: "12px",
      padding: "2rem",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      border: "1px solid #e5e7eb",
    }}>
      <h3 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "1.5rem", color: "#111827" }}>
        Proof of Work
      </h3>

      {/* Upload Section */}
      {cleaningId && (
        <div style={{ marginBottom: "2rem", padding: "1.5rem", background: "#f9fafb", borderRadius: "8px" }}>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
            Upload Proof
          </h4>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
              Photo (Required {!isOperatorOverride && "*"})
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              disabled={isOperatorOverride}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
              <input
                type="checkbox"
                checked={isOperatorOverride}
                onChange={(e) => setIsOperatorOverride(e.target.checked)}
              />
              <span style={{ fontSize: "0.875rem", color: "#374151" }}>
                Operator Override (skip photo requirement)
              </span>
            </label>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: "600", color: "#374151" }}>
              Notes
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={isOperatorOverride ? "Explain why photo is not required..." : "Add notes about this stop..."}
              style={{
                width: "100%",
                padding: "0.75rem",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
                fontSize: "0.875rem",
                resize: "vertical",
              }}
            />
          </div>

          <button
            onClick={handlePhotoUpload}
            disabled={uploading || (!photoFile && !isOperatorOverride)}
            style={{
              padding: "0.75rem 1.5rem",
              background: uploading || (!photoFile && !isOperatorOverride) ? "#9ca3af" : "#16a34a",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "0.95rem",
              fontWeight: "600",
              cursor: uploading || (!photoFile && !isOperatorOverride) ? "not-allowed" : "pointer",
            }}
          >
            {uploading ? "Uploading..." : "Upload Proof"}
          </button>
        </div>
      )}

      {/* Proof Display */}
      {cleaningId && proof ? (
        <div>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
            Proof for This Stop
          </h4>
          {proof.completionPhotoUrl ? (
            <div style={{ marginBottom: "1rem" }}>
              <img
                src={proof.completionPhotoUrl}
                alt="Completion proof"
                style={{
                  maxWidth: "100%",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                }}
              />
            </div>
          ) : (
            <div style={{
              padding: "2rem",
              background: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              textAlign: "center",
              color: "#991b1b",
              marginBottom: "1rem",
            }}>
              ⚠️ No photo uploaded. Operator override required.
            </div>
          )}
          {proof.employeeNotes && (
            <div style={{ marginBottom: "1rem" }}>
              <strong style={{ fontSize: "0.875rem", color: "#374151" }}>Employee Notes:</strong>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                {proof.employeeNotes}
              </p>
            </div>
          )}
          {proof.operatorNotes && (
            <div style={{ marginBottom: "1rem" }}>
              <strong style={{ fontSize: "0.875rem", color: "#374151" }}>Operator Notes:</strong>
              <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem" }}>
                {proof.operatorNotes}
              </p>
            </div>
          )}
          {proof.flags && proof.flags.length > 0 && (
            <div>
              <strong style={{ fontSize: "0.875rem", color: "#374151" }}>Flags:</strong>
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                {proof.flags.map((flag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: "0.25rem 0.75rem",
                      background: "#fee2e2",
                      color: "#991b1b",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                    }}
                  >
                    {flag}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginTop: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
            Completed: {formatDate(proof.completedAt)}
          </div>
        </div>
      ) : (
        <div>
          <h4 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>
            Recent Proof ({proofs.length})
          </h4>
          {proofs.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#6b7280" }}>
              No proof records found
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {proofs.slice(0, 10).map((p) => (
                <div
                  key={p.cleaningId}
                  style={{
                    padding: "1rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
                      {formatDate(p.scheduledDate)}
                    </span>
                    <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                      {formatDate(p.completedAt)}
                    </span>
                  </div>
                  {p.completionPhotoUrl ? (
                    <img
                      src={p.completionPhotoUrl}
                      alt="Proof"
                      style={{
                        maxWidth: "200px",
                        borderRadius: "4px",
                        marginTop: "0.5rem",
                      }}
                    />
                  ) : (
                    <div style={{
                      padding: "0.5rem",
                      background: "#fee2e2",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      color: "#991b1b",
                      marginTop: "0.5rem",
                    }}>
                      No photo (operator override)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

