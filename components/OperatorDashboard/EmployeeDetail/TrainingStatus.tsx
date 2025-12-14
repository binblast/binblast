// components/OperatorDashboard/EmployeeDetail/TrainingStatus.tsx
"use client";

import { useState, useEffect } from "react";
import { getRequiredModules } from "@/lib/training-modules";
import { CertificationStatus } from "@/lib/training-certification";

interface TrainingStatusProps {
  employeeId: string;
}

interface ModuleProgress {
  moduleId: string;
  moduleName: string;
  completed: boolean;
  completedAt?: string;
  expiresAt?: string;
  quizScore?: number;
  quizAttempts: number;
  certificationStatus: CertificationStatus;
  requiredForPayment: boolean;
}

export function TrainingStatus({ employeeId }: TrainingStatusProps) {
  const [modules, setModules] = useState<ModuleProgress[]>([]);
  const [certificationStatus, setCertificationStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [forcingRetraining, setForcingRetraining] = useState<string | null>(null);

  useEffect(() => {
    loadTrainingStatus();
  }, [employeeId]);

  const loadTrainingStatus = async () => {
    try {
      setLoading(true);
      const [statusResponse, trainingResponse] = await Promise.all([
        fetch(`/api/employee/certification-status?employeeId=${employeeId}`),
        fetch(`/api/operator/employees/${employeeId}/training`),
      ]);

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setCertificationStatus(statusData);
      }

      if (trainingResponse.ok) {
        const trainingData = await trainingResponse.json();
        setModules(trainingData.modules || []);
      }
    } catch (error) {
      console.error("Error loading training status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleForceRetraining = async (moduleId: string) => {
    if (!confirm("Force this employee to retake this training module?")) {
      return;
    }

    setForcingRetraining(moduleId);
    try {
      const response = await fetch(`/api/operator/employees/${employeeId}/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleId,
          forceRetraining: true,
        }),
      });

      if (response.ok) {
        await loadTrainingStatus();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to force re-training");
      }
    } catch (error: any) {
      alert(error.message || "Failed to force re-training");
    } finally {
      setForcingRetraining(null);
    }
  };

  const getStatusBadge = (status: CertificationStatus) => {
    switch (status) {
      case "completed":
        return { icon: "✅", text: "Certified", color: "#065f46", bg: "#d1fae5" };
      case "expired":
        return { icon: "⚠️", text: "Expired", color: "#991b1b", bg: "#fee2e2" };
      case "in_progress":
        return { icon: "🔄", text: "In Progress", color: "#92400e", bg: "#fef3c7" };
      default:
        return { icon: "❌", text: "Not Started", color: "#6b7280", bg: "#f3f4f6" };
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
        Loading training status...
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3
          style={{
            fontSize: "1.25rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#111827",
          }}
        >
          Training & Certification Status
        </h3>
        {certificationStatus && (
          <div
            style={{
              padding: "1rem",
              background: certificationStatus.isCertified ? "#d1fae5" : "#fee2e2",
              border: `1px solid ${certificationStatus.isCertified ? "#bbf7d0" : "#fecaca"}`,
              borderRadius: "8px",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: certificationStatus.isCertified ? "#065f46" : "#991b1b",
                marginBottom: "0.25rem",
              }}
            >
              Status: {certificationStatus.isCertified ? "✅ Certified" : "⚠️ Not Certified"}
            </div>
            <div style={{ fontSize: "0.75rem", color: certificationStatus.isCertified ? "#047857" : "#7f1d1d" }}>
              {certificationStatus.completedModules} / {certificationStatus.totalModules} modules completed
              {certificationStatus.expiresAt && (
                <span>
                  {" "}
                  • Expires: {new Date(certificationStatus.expiresAt).toLocaleDateString()}
                  {certificationStatus.daysUntilExpiration !== undefined && (
                    <span> ({certificationStatus.daysUntilExpiration} days)</span>
                  )}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Module
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Quiz Score
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Completed
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "left",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Expires
                </th>
                <th
                  style={{
                    padding: "1rem",
                    textAlign: "center",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#374151",
                  }}
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {modules.map((module) => {
                const badge = getStatusBadge(module.certificationStatus);
                return (
                  <tr
                    key={module.moduleId}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                    }}
                  >
                    <td style={{ padding: "1rem", fontSize: "0.875rem" }}>
                      <div style={{ fontWeight: "600", color: "#111827", marginBottom: "0.25rem" }}>
                        {module.moduleName}
                      </div>
                      {module.requiredForPayment && (
                        <span
                          style={{
                            fontSize: "0.75rem",
                            padding: "0.25rem 0.5rem",
                            background: "#fef3c7",
                            color: "#92400e",
                            borderRadius: "4px",
                            fontWeight: "600",
                          }}
                        >
                          REQUIRED FOR PAYMENT
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "1rem" }}>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: badge.bg,
                          color: badge.color,
                        }}
                      >
                        {badge.icon} {badge.text}
                      </span>
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {module.quizScore !== undefined ? `${module.quizScore}%` : "N/A"}
                      {module.quizAttempts > 0 && (
                        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>
                          ({module.quizAttempts} attempt{module.quizAttempts > 1 ? "s" : ""})
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {module.completedAt
                        ? new Date(module.completedAt).toLocaleDateString()
                        : "Not completed"}
                    </td>
                    <td style={{ padding: "1rem", fontSize: "0.875rem", color: "#6b7280" }}>
                      {module.expiresAt ? new Date(module.expiresAt).toLocaleDateString() : "N/A"}
                    </td>
                    <td style={{ padding: "1rem", textAlign: "center" }}>
                      <button
                        onClick={() => handleForceRetraining(module.moduleId)}
                        disabled={forcingRetraining === module.moduleId}
                        style={{
                          padding: "0.5rem 1rem",
                          background: forcingRetraining === module.moduleId ? "#9ca3af" : "#dc2626",
                          color: "#ffffff",
                          border: "none",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          cursor: forcingRetraining === module.moduleId ? "not-allowed" : "pointer",
                        }}
                      >
                        {forcingRetraining === module.moduleId ? "Processing..." : "Force Re-training"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

