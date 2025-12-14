// components/EmployeeDashboard/LessonReader.tsx
// Enhanced lesson reader with PDF viewer and sidebar

"use client";

import { useState, useEffect } from "react";
import { PDFViewer } from "./PDFViewer";
import { useRouter } from "next/navigation";

interface LessonReaderProps {
  moduleId: string;
  employeeId: string;
}

export function LessonReader({ moduleId, employeeId }: LessonReaderProps) {
  const [module, setModule] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    loadModule();
    loadProgress();
  }, [moduleId, employeeId]);

  const loadModule = async () => {
    try {
      const response = await fetch(`/api/training/modules/${moduleId}`);
      if (!response.ok) {
        throw new Error("Failed to load module");
      }
      const data = await response.json();
      setModule(data);
    } catch (err: any) {
      console.error("Error loading module:", err);
      setError(err.message || "Failed to load module");
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const response = await fetch(
        `/api/employee/training/progress?employeeId=${employeeId}`
      );
      if (response.ok) {
        const data = await response.json();
        setProgress(data.modules?.[moduleId]);
      }
    } catch (err) {
      console.error("Error loading progress:", err);
    }
  };

  const handleStartQuiz = () => {
    router.push(`/employee/training/${moduleId}/quiz`);
  };

  const handleBack = () => {
    router.push("/employee/dashboard");
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "#6b7280",
        }}
      >
        Loading lesson...
      </div>
    );
  }

  if (error || !module) {
    return (
      <div
        style={{
          padding: "2rem",
          background: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          color: "#dc2626",
        }}
      >
        {error || "Module not found"}
      </div>
    );
  }

  const hasPDF = module.pdfUrl && module.pdfUrl.trim() !== "";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <button
          onClick={handleBack}
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
          ← Back to Training
        </button>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: "600",
            color: "#111827",
            marginBottom: "0.5rem",
          }}
        >
          {module.title}
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          {module.description}
        </p>
      </div>

      {/* Two-column layout (desktop) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 300px",
          gap: "1.5rem",
        }}
        className="lesson-reader-layout"
      >
        {/* Left: PDF Viewer */}
        <div>
          {hasPDF ? (
            <PDFViewer
              pdfUrl={module.pdfUrl}
              moduleId={moduleId}
              employeeId={employeeId}
              initialPage={progress?.lastPagePosition || 1}
              onPageChange={setCurrentPage}
            />
          ) : (
            <div
              style={{
                padding: "2rem",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: "8px",
                color: "#dc2626",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                PDF Not Available
              </div>
              <div style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
                The PDF for this module is not yet available. Please contact an administrator.
              </div>
              <button
                onClick={() => {
                  window.location.href = `mailto:binblastcompany@gmail.com?subject=PDF Missing: ${moduleId}&body=The PDF for module ${moduleId} is not available.`;
                }}
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
                Notify Admin
              </button>
            </div>
          )}
        </div>

        {/* Right: Sidebar */}
        <div
          style={{
            position: "sticky",
            top: "1rem",
            alignSelf: "start",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "1.5rem",
            height: "fit-content",
          }}
        >
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              color: "#111827",
              marginBottom: "1rem",
            }}
          >
            Lesson Checklist
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              marginBottom: "1.5rem",
            }}
          >
            <li
              style={{
                padding: "0.5rem 0",
                fontSize: "0.875rem",
                color: "#6b7280",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              ✓ Read through the entire lesson
            </li>
            <li
              style={{
                padding: "0.5rem 0",
                fontSize: "0.875rem",
                color: "#6b7280",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              ✓ Understand key concepts
            </li>
            <li
              style={{
                padding: "0.5rem 0",
                fontSize: "0.875rem",
                color: "#6b7280",
                borderBottom: "1px solid #f3f4f6",
              }}
            >
              ✓ Review important sections
            </li>
          </ul>

          {/* Start Quiz Button (sticky at bottom) */}
          {hasPDF && (
            <button
              onClick={handleStartQuiz}
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                background: "#16a34a",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                fontSize: "0.875rem",
                fontWeight: "600",
                cursor: "pointer",
                marginTop: "auto",
              }}
            >
              Start Quiz
            </button>
          )}
        </div>
      </div>

      {/* Mobile: Stacked layout */}
      <style jsx>{`
        @media (max-width: 768px) {
          .lesson-reader-layout {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
