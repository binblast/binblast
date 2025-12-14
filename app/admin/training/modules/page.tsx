// app/admin/training/modules/page.tsx
// Admin page for managing training modules

"use client";

import { useState, useEffect } from "react";
import { PDFUploader } from "@/components/Admin/PDFUploader";
import { useRouter } from "next/navigation";

export default function AdminTrainingModulesPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/training/modules?active=true");
      if (!response.ok) {
        throw new Error("Failed to load modules");
      }
      const data = await response.json();
      setModules(data.modules || []);
    } catch (err: any) {
      setError(err.message || "Failed to load modules");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = async (moduleId: string, pdfUrl: string) => {
    // Update module with new PDF URL
    try {
      const response = await fetch(`/api/training/modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfUrl }),
      });

      if (response.ok) {
        await loadModules(); // Reload modules
      }
    } catch (err) {
      console.error("Error updating module:", err);
    }
  };

  const handleVerifyAll = async () => {
    try {
      const response = await fetch("/api/admin/training/verify-pdfs");
      if (response.ok) {
        const results = await response.json();
        // Display verification results
        alert(`Verification complete:\n${results.results.map((r: any) => 
          `${r.title}: ${r.isValid ? '✓ Valid' : '✗ Invalid - ' + r.error}`
        ).join('\n')}`);
      }
    } catch (err) {
      console.error("Error verifying PDFs:", err);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading modules...
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Training Modules Management
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>
          Manage training modules and verify PDF availability
        </p>
      </div>

      <div style={{ marginBottom: "1rem" }}>
        <button
          onClick={handleVerifyAll}
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
          Verify All PDFs
        </button>
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
          const hasPDF = module.pdfUrl && module.pdfUrl.trim() !== "";
          const isSelected = selectedModule === module.id;

          return (
            <div
              key={module.id}
              style={{
                background: "#ffffff",
                borderRadius: "12px",
                padding: "1.5rem",
                border: "1px solid #e5e7eb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "start",
                  marginBottom: "1rem",
                }}
              >
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                    {module.title}
                  </h3>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.5rem" }}>
                    {module.description}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        background: "#f3f4f6",
                        color: "#6b7280",
                      }}
                    >
                      Order: {module.order}
                    </span>
                    <span
                      style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        fontSize: "0.75rem",
                        background: module.active ? "#d1fae5" : "#fee2e2",
                        color: module.active ? "#065f46" : "#991b1b",
                      }}
                    >
                      {module.active ? "Active" : "Inactive"}
                    </span>
                    {!hasPDF && (
                      <span
                        style={{
                          padding: "0.25rem 0.5rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          background: "#fee2e2",
                          color: "#991b1b",
                          fontWeight: "600",
                        }}
                      >
                        Missing PDF
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedModule(isSelected ? null : module.id)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: isSelected ? "#f3f4f6" : "#2563eb",
                    color: isSelected ? "#111827" : "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {isSelected ? "Hide Upload" : "Upload PDF"}
                </button>
              </div>

              {isSelected && (
                <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #e5e7eb" }}>
                  <PDFUploader
                    moduleId={module.id}
                    moduleName={module.title}
                    currentPdfUrl={module.pdfUrl}
                    onUploadComplete={(url) => handleUploadComplete(module.id, url)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
