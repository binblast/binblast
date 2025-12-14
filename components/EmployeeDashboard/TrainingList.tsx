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

    // Check if expired
    if (moduleProgress?.completedAt && progress.nextRecertDueAt) {
      const recertDate = new Date(progress.nextRecertDueAt);
      if (new Date() > recertDate) {
        return "expired";
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
    ? Object.values(progress.modules).filter((m) => m.completedAt).length
    : 0;
  const totalCount = modules.length;

  return (
    <div>
      {/* Training Status Header */}
      <TrainingStatusHeader employeeId={employeeId} />

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
