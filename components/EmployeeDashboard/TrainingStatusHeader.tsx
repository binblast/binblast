// components/EmployeeDashboard/TrainingStatusHeader.tsx
// Sticky certification status header for training list

"use client";

import { useState, useEffect } from "react";

interface CertificationStatus {
  status: "completed" | "expired" | "in_progress" | "not_started";
  isCertified: boolean;
  expiresAt?: string;
  daysUntilExpiration?: number;
  completedModules: number;
  totalModules: number;
  canClockIn: boolean;
}

interface TrainingStatusHeaderProps {
  employeeId: string;
}

export function TrainingStatusHeader({ employeeId }: TrainingStatusHeaderProps) {
  const [certification, setCertification] = useState<CertificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<any>(null);

  useEffect(() => {
    loadCertificationStatus();
    loadCertificate();

    // Listen for training progress updates to refresh certification status
    const handleTrainingProgressUpdate = () => {
      console.log("[TrainingStatusHeader] Training progress updated, refreshing certification status");
      loadCertificationStatus();
      loadCertificate();
    };

    window.addEventListener('trainingProgressUpdated', handleTrainingProgressUpdate);

    return () => {
      window.removeEventListener('trainingProgressUpdated', handleTrainingProgressUpdate);
    };
  }, [employeeId]);

  const loadCertificationStatus = async () => {
    try {
      const response = await fetch(`/api/employee/certification-status?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setCertification(data);
      }
    } catch (error) {
      console.error("Error loading certification status:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCertificate = async () => {
    try {
      const response = await fetch(`/api/employee/training/certificate?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setCertificate(data.certificate);
      }
    } catch (error) {
      // Certificate not found is OK
    }
  };

  if (loading || !certification) {
    return (
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>Loading certification status...</div>
      </div>
    );
  }

  const getStatusBadge = () => {
    if (certification.status === "completed") {
      const daysUntilExp = certification.daysUntilExpiration ?? 0;
      if (daysUntilExp <= 14 && daysUntilExp > 0) {
        return {
          icon: "",
          text: `Expiring Soon (${daysUntilExp} days)`,
          color: "#92400e",
          bg: "#fef3c7",
        };
      }
      return {
        icon: "✅",
        text: certification.expiresAt
          ? `Certified (valid until ${new Date(certification.expiresAt).toLocaleDateString()})`
          : "Certified",
        color: "#065f46",
        bg: "#d1fae5",
      };
    }
    if (certification.status === "expired") {
      return {
        icon: "",
        text: "Not Certified / Expired",
        color: "#991b1b",
        bg: "#fee2e2",
      };
    }
    return {
      icon: "",
      text: "Not Certified",
      color: "#991b1b",
      bg: "#fee2e2",
    };
  };

  const statusBadge = getStatusBadge();
  const progressPercentage =
    certification.totalModules > 0
      ? (certification.completedModules / certification.totalModules) * 100
      : 0;

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#ffffff",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1.5rem",
        border: "1px solid #e5e7eb",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Certification Status Badge */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            padding: "0.5rem 1rem",
            borderRadius: "999px",
            fontSize: "0.875rem",
            fontWeight: "600",
            background: statusBadge.bg,
            color: statusBadge.color,
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>{statusBadge.icon}</span>
          <span>{statusBadge.text}</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.5rem",
          }}
        >
          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
            Certificate Progress
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {certification.completedModules} / {certification.totalModules} completed
          </div>
        </div>
        <div
          style={{
            width: "100%",
            height: "12px",
            background: "#e5e7eb",
            borderRadius: "6px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercentage}%`,
              height: "100%",
              background:
                certification.status === "completed" ? "#16a34a" : "#f59e0b",
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Caution Banner - Only show when not certified */}
      {!certification.isCertified && (
        <div
          style={{
            padding: "0.75rem 1rem",
            background: "#fef3c7",
            border: "1px solid #fcd34d",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span style={{ fontSize: "1.25rem" }}></span>
          <div style={{ flex: 1, fontSize: "0.875rem", color: "#92400e" }}>
            Certification required before clock-in. Complete training to unlock Clock In.
          </div>
        </div>
      )}

      {/* Certificate Card - Show when certified */}
      {certification.isCertified && certificate && (
        <div
          style={{
            padding: "1rem",
            background: "#f0fdf4",
            border: "2px solid #16a34a",
            borderRadius: "8px",
            marginTop: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "start",
              marginBottom: "0.75rem",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "700",
                  color: "#065f46",
                  marginBottom: "0.25rem",
                }}
              >
                Certified Bin Blast Technician
              </div>
              {certificate.issuedAt && (
                <div style={{ fontSize: "0.75rem", color: "#047857", marginBottom: "0.25rem" }}>
                  Date issued: {new Date(certificate.issuedAt).toLocaleDateString()}
                </div>
              )}
              {certificate.expiresAt && (
                <div style={{ fontSize: "0.75rem", color: "#047857" }}>
                  Valid until: {new Date(certificate.expiresAt).toLocaleDateString()}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                // TODO: Implement certificate view modal/page
                window.open(`/employee/training/certificate?employeeId=${employeeId}`, "_blank");
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "0.75rem",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              View Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
