// components/EmployeeDashboard/TrainingSection.tsx
"use client";

import { useState, useEffect } from "react";

interface TrainingModule {
  id: string;
  name: string;
  description: string;
  type: "video" | "guide" | "safety" | "best-practices";
  content: string; // URL or text content
  duration?: string;
  completed: boolean;
  progress: number;
}

interface TrainingSectionProps {
  employeeId: string;
}

export function TrainingSection({ employeeId }: TrainingSectionProps) {
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  useEffect(() => {
    loadTrainingModules();
  }, [employeeId]);

  const loadTrainingModules = async () => {
    try {
      const response = await fetch(`/api/employee/training?employeeId=${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || getDefaultModules());
      } else {
        setModules(getDefaultModules());
      }
    } catch (error) {
      console.error("Error loading training modules:", error);
      setModules(getDefaultModules());
    } finally {
      setLoading(false);
    }
  };

  const getDefaultModules = (): TrainingModule[] => {
    return [
      {
        id: "welcome",
        name: "Welcome to Bin Blast Co.",
        description: "Introduction to Bin Blast Co. and your role",
        type: "guide",
        content: "Welcome! This guide will help you understand your role and responsibilities.",
        duration: "5 min",
        completed: false,
        progress: 0,
      },
      {
        id: "safety-basics",
        name: "Safety Basics",
        description: "Essential safety protocols and procedures",
        type: "safety",
        content: "Always wear protective gloves and follow safety guidelines when handling bins.",
        duration: "10 min",
        completed: false,
        progress: 0,
      },
      {
        id: "cleaning-process",
        name: "Cleaning Process",
        description: "Step-by-step guide to cleaning bins effectively",
        type: "guide",
        content: "1. Inspect bins for damage\n2. Apply cleaning solution\n3. Scrub thoroughly\n4. Rinse completely\n5. Apply Bin Blast sticker",
        duration: "15 min",
        completed: false,
        progress: 0,
      },
      {
        id: "sticker-placement",
        name: "Sticker Placement",
        description: "How to properly place Bin Blast stickers",
        type: "best-practices",
        content: "Place sticker on the front of the bin, ensuring it's visible and secure.",
        duration: "5 min",
        completed: false,
        progress: 0,
      },
      {
        id: "photo-documentation",
        name: "Photo Documentation",
        description: "How to take quality completion photos",
        type: "best-practices",
        content: "Take clear photos showing the cleaned bins and sticker placement.",
        duration: "5 min",
        completed: false,
        progress: 0,
      },
    ];
  };

  const markModuleComplete = async (moduleId: string) => {
    try {
      const response = await fetch(`/api/employee/training`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          moduleId,
          completed: true,
        }),
      });

      if (response.ok) {
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId ? { ...m, completed: true, progress: 100 } : m
          )
        );
      }
    } catch (error) {
      console.error("Error marking module complete:", error);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "safety":
        return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
      case "guide":
        return { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" };
      case "best-practices":
        return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
      default:
        return { bg: "#f9fafb", text: "#6b7280", border: "#e5e7eb" };
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

  return (
    <div>
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
          Complete training modules to improve your skills and knowledge
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {modules.map((module) => {
          const typeColors = getTypeColor(module.type);
          return (
            <div
              key={module.id}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: `1px solid ${typeColors.border}`,
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
                    {module.completed && (
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "999px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          background: "#d1fae5",
                          color: "#065f46",
                        }}
                      >
                        Completed
                      </span>
                    )}
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
                  </div>
                </div>
              </div>

              {module.progress > 0 && module.progress < 100 && (
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
                        background: "#16a34a",
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

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  onClick={() => setSelectedModule(module)}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1rem",
                    background: "#16a34a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "8px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "#15803d";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "#16a34a";
                  }}
                >
                  {module.completed ? "Review" : "Start Training"}
                </button>
                {!module.completed && (
                  <button
                    onClick={() => markModuleComplete(module.id)}
                    style={{
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
                    Mark Complete
                  </button>
                )}
              </div>

              {selectedModule?.id === module.id && (
                <div
                  style={{
                    marginTop: "1rem",
                    padding: "1rem",
                    background: "#f9fafb",
                    borderRadius: "8px",
                    whiteSpace: "pre-line",
                    fontSize: "0.875rem",
                    color: "#374151",
                  }}
                >
                  {module.content}
                  <button
                    onClick={() => markModuleComplete(module.id)}
                    style={{
                      marginTop: "1rem",
                      padding: "0.5rem 1rem",
                      background: "#16a34a",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    Mark as Complete
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

