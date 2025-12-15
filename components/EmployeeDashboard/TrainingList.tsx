// components/EmployeeDashboard/TrainingList.tsx
// Enhanced training list component with progress bar and module cards

"use client";

import { useState, useEffect, useCallback } from "react";
import { TrainingModuleCard } from "./TrainingModuleCard";
import { TrainingStatusHeader } from "./TrainingStatusHeader";
import { useRouter } from "next/navigation";

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  categoryTag: "Guide" | "Safety" | "Best Practices";
  durationMinutes: number;
  order: number;
  pdfUrl?: string;
  required: boolean;
  requiredForPayment: boolean;
}

interface ModuleProgress {
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  score?: number;
  attempts: number;
  pdfViewed: boolean;
  materialReviewed?: boolean;
  lastPagePosition?: number;
  failed?: boolean;
  lastFailedAt?: string;
  status?: "not_started" | "in_progress" | "passed" | "failed" | "locked";
}

interface TrainingProgress {
  employeeId: string;
  currentModuleOrder: number;
  modules: Record<string, ModuleProgress>;
  certificates: any[];
  nextRecertDueAt?: string;
  overallStatus: "not_started" | "in_progress" | "completed" | "expired";
}

interface TrainingListProps {
  employeeId: string;
}

export function TrainingList({ employeeId }: TrainingListProps) {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const loadModules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load modules from Firestore
      const modulesResponse = await fetch("/api/training/modules?active=true");
      if (!modulesResponse.ok) {
        throw new Error("Failed to load training modules");
      }
      const modulesData = await modulesResponse.json();
      setModules(modulesData.modules || []);

      // Load progress
      const progressResponse = await fetch(
        `/api/employee/training/progress?employeeId=${employeeId}`
      );
      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        setProgress(progressData);
      }
    } catch (err: any) {
      console.error("Error loading training:", err);
      setError(err.message || "Failed to load training materials");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // Listen for training progress updates
  useEffect(() => {
    const handleProgressUpdate = () => {
      loadModules();
    };

    window.addEventListener('trainingProgressUpdated', handleProgressUpdate);
    return () => {
      window.removeEventListener('trainingProgressUpdated', handleProgressUpdate);
    };
  }, [loadModules]);

  const getModuleStatus = (
    module: TrainingModule,
    moduleProgress?: ModuleProgress
  ): "locked" | "in_progress" | "passed" | "failed" | "not_started" | "expired" => {
    if (!progress) return "not_started";

    // Check if module is locked (previous modules not completed)
    const previousModules = modules.filter((m) => m.order < module.order);
    const allPreviousCompleted = previousModules.every((m) => {
      const prevProgress = progress.modules[m.id];
      return prevProgress?.completedAt;
    });

    if (!allPreviousCompleted && module.order > 1) {
      return "locked";
    }

    // Check if expired (6 months from completion)
    if (moduleProgress?.completedAt) {
      if (moduleProgress.expiresAt) {
        const expirationDate = new Date(moduleProgress.expiresAt);
        if (new Date() > expirationDate) {
          return "expired";
        }
      } else if (progress.nextRecertDueAt) {
        // Fallback to overall recert date
        const recertDate = new Date(progress.nextRecertDueAt);
        if (new Date() > recertDate) {
          return "expired";
        }
      }
    }

    // Check if failed (quiz failed)
    if (moduleProgress?.failed || (moduleProgress?.completedAt && moduleProgress?.score !== undefined && moduleProgress.score < 80)) {
      return "failed";
    }

    // Check if passed
    if (moduleProgress?.completedAt && moduleProgress?.score !== undefined && moduleProgress.score >= 80) {
      return "passed";
    }

    // Check if in progress
    if (moduleProgress?.startedAt || moduleProgress?.pdfViewed || moduleProgress?.materialReviewed) {
      return "in_progress";
    }

    // Not started
    return "not_started";
  };

  const handleStart = (moduleId: string) => {
    router.push(`/employee/training/${moduleId}`);
  };

  const handleContinue = (moduleId: string) => {
    router.push(`/employee/training/${moduleId}/quiz`);
  };

  const handleReview = (moduleId: string) => {
    router.push(`/employee/training/${moduleId}`);
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

  if (error) {
    return (
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
    );
  }

  const completedCount = progress
    ? Object.values(progress.modules).filter((m) => {
        if (!m.completedAt) return false;
        // Check if expired (6 months from completion)
        if (m.expiresAt) {
          const expirationDate = new Date(m.expiresAt);
          return new Date() <= expirationDate;
        }
        return true;
      }).length
    : 0;
  const totalCount = modules.length;
  const allCompleted = completedCount === totalCount && totalCount > 0;

  // Filter modules: if all completed and within 6-month window, hide them
  // If expired or not all completed, show them
  const visibleModules = modules.filter((module) => {
    if (!allCompleted) return true; // Show all if not all completed
    
    const moduleProgress = progress?.modules[module.id];
    if (!moduleProgress?.completedAt) return true; // Show incomplete modules
    
    // If all completed, check expiration
    if (moduleProgress.expiresAt) {
      const expirationDate = new Date(moduleProgress.expiresAt);
      const now = new Date();
      // Show if expired (past 6-month deadline)
      return now > expirationDate;
    }
    
    // If no expiration date but all completed, hide it
    return false;
  });

  // If all modules are completed and not expired, show only certificate view
  if (allCompleted && visibleModules.length === 0) {
    // Find the earliest expiration date from all completed modules
    let expirationDate: Date | null = null;
    let daysRemaining: number | null = null;
    
    if (progress) {
      const completedModules = Object.values(progress.modules).filter((m) => m.completedAt && m.expiresAt);
      if (completedModules.length > 0) {
        const expirationDates = completedModules
          .map((m) => m.expiresAt ? new Date(m.expiresAt) : null)
          .filter((d): d is Date => d !== null);
        
        if (expirationDates.length > 0) {
          expirationDate = new Date(Math.min(...expirationDates.map(d => d.getTime())));
          const now = new Date();
          const diffTime = expirationDate.getTime() - now.getTime();
          daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      
      // Fallback to nextRecertDueAt if no module expiration dates
      if (!expirationDate && progress.nextRecertDueAt) {
        expirationDate = new Date(progress.nextRecertDueAt);
        const now = new Date();
        const diffTime = expirationDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      }
    }

    return (
      <div>
        {/* Certificate View - Only show when all modules completed */}
        <div
          style={{
            background: "#ffffff",
            borderRadius: "16px",
            padding: "3rem 2rem",
            border: "2px solid #16a34a",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          {/* Certificate Icon/Header */}
          <div
            style={{
              fontSize: "3rem",
              marginBottom: "1rem",
            }}
          >
            ✓
          </div>
          
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#065f46",
              marginBottom: "0.5rem",
            }}
          >
            Certification Complete
          </h2>
          
          <p
            style={{
              fontSize: "1rem",
              color: "#047857",
              marginBottom: "2rem",
            }}
          >
            You have successfully completed all required training modules.
          </p>

          {/* Expiration Date */}
          {expirationDate && (
            <div
              style={{
                padding: "1.5rem",
                background: "#f0fdf4",
                borderRadius: "12px",
                border: "1px solid #bbf7d0",
                marginTop: "1.5rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  color: "#6b7280",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                }}
              >
                Certification Expires
              </div>
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  color: "#065f46",
                  marginBottom: "0.25rem",
                }}
              >
                {expirationDate.toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
              {daysRemaining !== null && daysRemaining > 0 && (
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#047857",
                    fontWeight: "600",
                  }}
                >
                  {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                </div>
              )}
              {daysRemaining !== null && daysRemaining <= 0 && (
                <div
                  style={{
                    fontSize: "0.875rem",
                    color: "#dc2626",
                    fontWeight: "600",
                  }}
                >
                  Certification has expired
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Training Status Header */}
      <TrainingStatusHeader employeeId={employeeId} />

      {/* Module Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {visibleModules.map((module) => {
          const moduleProgress = progress?.modules[module.id];
          const status = getModuleStatus(module, moduleProgress);

          return (
            <TrainingModuleCard
              key={module.id}
              module={module}
              progress={moduleProgress}
              status={status}
              onStart={() => handleStart(module.id)}
              onContinue={() => handleContinue(module.id)}
              onReview={() => handleReview(module.id)}
            />
          );
        })}
      </div>
    </div>
  );
}
