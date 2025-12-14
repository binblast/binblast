// components/EmployeeDashboard/TrainingList.tsx
// Enhanced training list component with progress bar and module cards

"use client";

import { useState, useEffect, useCallback } from "react";
import { TrainingModuleCard } from "./TrainingModuleCard";
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
  score?: number;
  attempts: number;
  pdfViewed: boolean;
  lastPagePosition?: number;
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

  const getModuleStatus = (
    module: TrainingModule,
    moduleProgress?: ModuleProgress
  ): "locked" | "in_progress" | "passed" | "expired" => {
    if (!progress) return "locked";

    // Check if module is locked (previous modules not completed)
    const previousModules = modules.filter((m) => m.order < module.order);
    const allPreviousCompleted = previousModules.every((m) => {
      const prevProgress = progress.modules[m.id];
      return prevProgress?.completedAt;
    });

    if (!allPreviousCompleted && module.order > 1) {
      return "locked";
    }

    // Check if expired
    if (moduleProgress?.completedAt && progress.nextRecertDueAt) {
      const recertDate = new Date(progress.nextRecertDueAt);
      if (new Date() > recertDate) {
        return "expired";
      }
    }

    // Check status
    if (moduleProgress?.completedAt) {
      return "passed";
    }
    if (moduleProgress?.startedAt || moduleProgress?.pdfViewed) {
      return "in_progress";
    }

    return allPreviousCompleted ? "in_progress" : "locked";
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
    ? Object.values(progress.modules).filter((m) => m.completedAt).length
    : 0;
  const totalCount = modules.length;

  return (
    <div>
      {/* Progress Bar */}
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          padding: "1.5rem",
          marginBottom: "1.5rem",
          border: "1px solid #e5e7eb",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "0.75rem",
          }}
        >
          <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#111827" }}>
            Training Progress
          </div>
          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
            {completedCount} / {totalCount} completed
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
              width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
              height: "100%",
              background:
                progress?.overallStatus === "completed" ? "#16a34a" : "#f59e0b",
              transition: "width 0.3s",
            }}
          />
        </div>
        {progress?.nextRecertDueAt && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#6b7280",
              marginTop: "0.5rem",
            }}
          >
            Recertification due: {new Date(progress.nextRecertDueAt).toLocaleDateString()}
          </div>
        )}
      </div>

      {/* Module Cards Grid */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {modules.map((module) => {
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
