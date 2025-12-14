// components/EmployeeDashboard/TrainingSection.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { TrainingModuleViewer } from "./TrainingModuleViewer";
import { TrainingQuiz } from "./TrainingQuiz";
import { getRequiredModules, getModuleById } from "@/lib/training-modules";
import { CertificationStatus } from "@/lib/training-certification";

interface TrainingModuleProgress {
  id: string;
  name: string;
  description: string;
  type: string;
  duration: string;
  completed: boolean;
  progress: number;
  completedAt?: Date;
  expiresAt?: Date;
  quizScore?: number;
  quizAttempts: number;
  pdfViewed: boolean;
  certificationStatus: CertificationStatus;
  requiredForPayment: boolean;
}

interface TrainingSectionProps {
  employeeId: string;
}

type ViewMode = "list" | "pdf" | "quiz";

export function TrainingSection({ employeeId }: TrainingSectionProps) {
  const [modules, setModules] = useState<TrainingModuleProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [certificationStatus, setCertificationStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | undefined>(undefined);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(false);

  const loadCertificationStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/employee/certification-status?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        if (isMountedRef.current) {
          setCertificationStatus(data);
        }
      }
    } catch (error) {
      console.error("Error loading certification status:", error);
    }
  }, [employeeId]);

  const loadTrainingModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const requiredModules = getRequiredModules();
      
      // Load progress for each module
      const modulesWithProgress = await Promise.all(
        requiredModules.map(async (module) => {
          try {
            const response = await fetch(
              `/api/employee/training?employeeId=${employeeId}&moduleId=${module.id}`
            );
            if (response.ok) {
              const data = await response.json();
              return {
                id: module.id,
                name: module.name,
                description: module.description,
                type: module.type,
                duration: module.duration,
                completed: data.completed || false,
                progress: data.progress || 0,
                completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
                expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
                quizScore: data.quizScore,
                quizAttempts: data.quizAttempts || 0,
                pdfViewed: data.pdfViewed || false,
                certificationStatus: data.certificationStatus || "not_started",
                requiredForPayment: module.requiredForPayment || false,
              };
            } else {
              // API returned an error, but we'll still show the module with default values
              console.warn(`API error for module ${module.id}:`, response.status, response.statusText);
            }
          } catch (error) {
            // Network or other error - still show module with defaults
            console.error(`Error loading module ${module.id}:`, error);
          }
          
          // Return default module data even if API call failed
          return {
            id: module.id,
            name: module.name,
            description: module.description,
            type: module.type,
            duration: module.duration,
            completed: false,
            progress: 0,
            quizAttempts: 0,
            pdfViewed: false,
            certificationStatus: "not_started" as CertificationStatus,
            requiredForPayment: module.requiredForPayment || false,
          };
        })
      );

      if (isMountedRef.current) {
        setModules(modulesWithProgress);
      }
    } catch (error) {
      console.error("Error loading training modules:", error);
      if (isMountedRef.current) {
        setError("Failed to load training modules. Please try refreshing the page.");
        // Still show modules with default values so user can interact
        const requiredModules = getRequiredModules();
        setModules(requiredModules.map(module => ({
          id: module.id,
          name: module.name,
          description: module.description,
          type: module.type,
          duration: module.duration,
          completed: false,
          progress: 0,
          quizAttempts: 0,
          pdfViewed: false,
          certificationStatus: "not_started" as CertificationStatus,
          requiredForPayment: module.requiredForPayment || false,
        })));
      }
    } finally {
      isLoadingRef.current = false;
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [employeeId]);

  useEffect(() => {
    isMountedRef.current = true;
    loadTrainingModules();
    loadCertificationStatus();
    
    return () => {
      isMountedRef.current = false;
    };
  }, [employeeId, loadTrainingModules, loadCertificationStatus]);

  // Fetch PDF URL when PDF viewer is opened - MUST be before early returns
  useEffect(() => {
    if (viewMode === "pdf" && selectedModuleId && isMountedRef.current) {
      setLoadingPdf(true);
      const fetchPdfUrl = async () => {
        try {
          const response = await fetch(`/api/employee/training/${selectedModuleId}/pdf?employeeId=${employeeId}`);
          if (response.ok && isMountedRef.current) {
            const data = await response.json();
            setPdfUrl(data.pdfUrl);
          }
        } catch (error) {
          console.error("Error fetching PDF URL:", error);
        } finally {
          if (isMountedRef.current) {
            setLoadingPdf(false);
          }
        }
      };
      fetchPdfUrl();
    } else {
      setPdfUrl(undefined);
    }
  }, [viewMode, selectedModuleId, employeeId]);

  const handlePdfViewed = async (moduleId: string) => {
    try {
      await fetch(`/api/employee/training/${moduleId}/pdf?employeeId=${employeeId}&markViewed=true`);
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, pdfViewed: true } : m
        )
      );
    } catch (error) {
      console.error("Error marking PDF as viewed:", error);
    }
  };

  const handleQuizComplete = async (moduleId: string, passed: boolean, score: number) => {
    if (passed) {
      await loadTrainingModules();
      await loadCertificationStatus();
      // Return to list view after successful completion
      setViewMode("list");
      setSelectedModuleId(null);
    }
  };

  const handleStartTraining = async (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setViewMode("pdf");
  };

  const handleStartQuiz = async (moduleId: string) => {
    setSelectedModuleId(moduleId);
    setViewMode("quiz");
  };

  const handleBackToList = () => {
    setViewMode("list");
    setSelectedModuleId(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "safety":
        return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
      case "guide":
      case "welcome":
        return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
      case "best-practices":
      case "photo":
        return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
      case "cleaning":
        return { bg: "#fef3c7", text: "#d97706", border: "#fde68a" };
      case "route":
        return { bg: "#e0e7ff", text: "#6366f1", border: "#c7d2fe" };
      default:
        return { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
    }
  };

  const getCertificationBadge = (status: CertificationStatus) => {
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
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "2rem",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Loading training materials...
      </div>
    );
  }

  // Show PDF viewer or quiz if module selected
  if (viewMode === "pdf" && selectedModuleId) {
    const module = modules.find((m) => m.id === selectedModuleId);
    const moduleConfig = getModuleById(selectedModuleId);
    if (!module || !moduleConfig) return null;

    return (
      <div>
        <button
          onClick={handleBackToList}
          style={{
            marginBottom: "1rem",
            padding: "0.5rem 1rem",
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Training List
        </button>
        {loadingPdf ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
            Loading PDF...
          </div>
        ) : (
          <TrainingModuleViewer
            moduleId={selectedModuleId}
            moduleName={module.name}
            pdfUrl={pdfUrl}
            pdfFileName={moduleConfig.pdfFileName}
            onPdfViewed={() => handlePdfViewed(selectedModuleId)}
            onStartQuiz={() => handleStartQuiz(selectedModuleId)}
            pdfViewed={module.pdfViewed}
          />
        )}
      </div>
    );
  }

  if (viewMode === "quiz" && selectedModuleId) {
    const moduleConfig = getModuleById(selectedModuleId);
    if (!moduleConfig) return null;

    return (
      <div>
        <button
          onClick={handleBackToList}
          style={{
            marginBottom: "1rem",
            padding: "0.5rem 1rem",
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back to Training List
        </button>
        <TrainingQuiz
          moduleId={selectedModuleId}
          moduleName={moduleConfig.name}
          employeeId={employeeId}
          questions={moduleConfig.quiz.questions}
          passingScore={moduleConfig.quiz.passingScore}
          onQuizComplete={(passed, score) => {
            handleQuizComplete(selectedModuleId, passed, score);
            // If passed, go back to list. If failed, stay on quiz for retry.
            if (passed) {
              handleBackToList();
            }
          }}
          onRetake={() => {
            // Reset quiz state - allows unlimited retries
            // The TrainingQuiz component handles the reset internally
          }}
        />
      </div>
    );
  }

  // Show certification status banner
  const showCertificationBanner = certificationStatus && !certificationStatus.isCertified;

  return (
    <div>
      {/* Certification Status Banner */}
      {showCertificationBanner && (
        <div
          style={{
            padding: "1rem",
            background: certificationStatus.status === "expired" ? "#fee2e2" : "#fef3c7",
            border: `1px solid ${certificationStatus.status === "expired" ? "#fecaca" : "#fde68a"}`,
            borderRadius: "8px",
            marginBottom: "1.5rem",
            color: certificationStatus.status === "expired" ? "#991b1b" : "#92400e",
          }}
        >
          <div style={{ fontWeight: "700", marginBottom: "0.5rem", fontSize: "1rem" }}>
            {certificationStatus.status === "expired" ? "⚠️ Certification Expired" : "🔄 Certification In Progress"}
          </div>
          <div style={{ fontSize: "0.875rem" }}>
            {certificationStatus.status === "expired"
              ? `Your certification has expired. Please complete re-certification training. ${certificationStatus.expiredModules.length} module(s) need to be retaken.`
              : `Complete all ${certificationStatus.totalModules} required modules to become certified. ${certificationStatus.completedModules}/${certificationStatus.totalModules} completed.`}
          </div>
          {certificationStatus.status === "expired" && (
            <div style={{ fontSize: "0.75rem", marginTop: "0.5rem", fontWeight: "600" }}>
              You cannot clock in or receive route assignments until re-certified.
            </div>
          )}
        </div>
      )}

      {/* Overall Progress */}
      {certificationStatus && (
        <div
          style={{
            background: "#ffffff",
            borderRadius: "12px",
            padding: "1.5rem",
            marginBottom: "1.5rem",
            border: "1px solid #e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
            <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
              Overall Certification Progress
            </div>
            <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {certificationStatus.completedModules} / {certificationStatus.totalModules} modules
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
                width: `${(certificationStatus.completedModules / certificationStatus.totalModules) * 100}%`,
                height: "100%",
                background: certificationStatus.isCertified ? "#16a34a" : "#f59e0b",
                transition: "width 0.3s",
              }}
            />
          </div>
          {certificationStatus.expiresAt && (
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.5rem" }}>
              Certification expires: {new Date(certificationStatus.expiresAt).toLocaleDateString()}
              {certificationStatus.daysUntilExpiration !== undefined && (
                <span> ({certificationStatus.daysUntilExpiration} days remaining)</span>
              )}
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: "1.5rem" }}>
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            marginBottom: "0.5rem",
            color: "#111827",
          }}
        >
          Training Materials
        </h2>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Complete all modules and pass quizzes (80%+) to become certified. Re-certification required every 6 months.
        </p>
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

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {modules.map((module) => {
          const typeColors = getTypeColor(module.type);
          const badge = getCertificationBadge(module.certificationStatus);
          const moduleConfig = getModuleById(module.id);

          return (
            <div
              key={module.id}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: `2px solid ${typeColors.border}`,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.06)",
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
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      marginBottom: "0.5rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#111827",
                      }}
                    >
                      {module.name}
                    </h3>
                    {module.requiredForPayment && (
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          background: "#fef3c7",
                          color: "#92400e",
                        }}
                      >
                        REQUIRED FOR PAYMENT
                      </span>
                    )}
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "999px",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        background: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {badge.icon} {badge.text}
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "0.875rem",
                      color: "#6b7280",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {module.description}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      fontSize: "0.75rem",
                      color: "#9ca3af",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        background: typeColors.bg,
                        color: typeColors.text,
                        fontWeight: "600",
                        textTransform: "capitalize",
                      }}
                    >
                      {module.type.replace("-", " ")}
                    </span>
                    {module.duration && <span>Duration: {module.duration}</span>}
                    {module.quizScore !== undefined && (
                      <span style={{ fontWeight: "600", color: "#111827" }}>
                        Quiz Score: {module.quizScore}%
                      </span>
                    )}
                    {module.quizAttempts > 0 && (
                      <span>Attempts: {module.quizAttempts}</span>
                    )}
                    {module.expiresAt && module.completed && (
                      <span>
                        Expires: {new Date(module.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {module.progress > 0 && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <div
                    style={{
                      width: "100%",
                      height: "8px",
                      background: "#e5e7eb",
                      borderRadius: "4px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${module.progress}%`,
                        height: "100%",
                        background: module.completed ? "#16a34a" : "#f59e0b",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginTop: "0.25rem",
                    }}
                  >
                    {module.progress}% complete
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                {!module.pdfViewed && (
                  <button
                    onClick={() => handleStartTraining(module.id)}
                    style={{
                      flex: 1,
                      minWidth: "150px",
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
                    📄 View PDF
                  </button>
                )}
                {module.pdfViewed && !module.completed && (
                  <button
                    onClick={() => handleStartQuiz(module.id)}
                    style={{
                      flex: 1,
                      minWidth: "150px",
                      padding: "0.75rem 1rem",
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    📝 Take Quiz
                  </button>
                )}
                {module.completed && (
                  <button
                    onClick={() => handleStartTraining(module.id)}
                    style={{
                      flex: 1,
                      minWidth: "150px",
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
                    📄 Review PDF
                  </button>
                )}
                {module.certificationStatus === "expired" && (
                  <button
                    onClick={() => handleStartTraining(module.id)}
                    style={{
                      flex: 1,
                      minWidth: "150px",
                      padding: "0.75rem 1rem",
                      background: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    🔄 Re-certify
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

