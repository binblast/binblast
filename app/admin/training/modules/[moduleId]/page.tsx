// app/admin/training/modules/[moduleId]/page.tsx
// Admin page for editing individual training modules

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { PDFUploader } from "@/components/Admin/PDFUploader";

export default function AdminModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const moduleId = params.moduleId as string;

  const [module, setModule] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    categoryTag: "Guide" as "Guide" | "Safety" | "Best Practices",
    durationMinutes: 5,
    order: 1,
    pdfUrl: "",
    active: true,
    required: false,
    requiredForPayment: false,
    quiz: [] as Array<{
      question: string;
      options: string[];
      correctIndex: number;
      explanation: string;
    }>,
  });

  useEffect(() => {
    if (moduleId) {
      loadModule();
    }
  }, [moduleId]);

  const loadModule = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/training/modules/${moduleId}`);
      if (!response.ok) {
        throw new Error("Failed to load module");
      }
      const data = await response.json();
      setModule(data);
      setFormData({
        title: data.title || "",
        description: data.description || "",
        categoryTag: data.categoryTag || "Guide",
        durationMinutes: data.durationMinutes || 5,
        order: data.order || 1,
        pdfUrl: data.pdfUrl || "",
        active: data.active !== undefined ? data.active : true,
        required: data.required !== undefined ? data.required : false,
        requiredForPayment: data.requiredForPayment !== undefined ? data.requiredForPayment : false,
        quiz: data.quiz || [],
      });
    } catch (err: any) {
      setError(err.message || "Failed to load module");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/training/modules/${moduleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update module");
      }

      setSuccess("Module updated successfully!");
      await loadModule();
    } catch (err: any) {
      setError(err.message || "Failed to save module");
    } finally {
      setSaving(false);
    }
  };

  const handlePDFUploadComplete = async (url: string) => {
    setFormData((prev) => ({ ...prev, pdfUrl: url }));
    setSuccess("PDF uploaded successfully!");
  };

  const handleAddQuestion = () => {
    setFormData((prev) => ({
      ...prev,
      quiz: [
        ...prev.quiz,
        {
          question: "",
          options: ["", "", "", ""],
          correctIndex: 0,
          explanation: "",
        },
      ],
    }));
  };

  const handleUpdateQuestion = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const newQuiz = [...prev.quiz];
      newQuiz[index] = { ...newQuiz[index], [field]: value };
      return { ...prev, quiz: newQuiz };
    });
  };

  const handleDeleteQuestion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      quiz: prev.quiz.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading module...
      </div>
    );
  }

  if (!module) {
    return (
      <div style={{ padding: "2rem" }}>
        <div style={{ color: "#dc2626", marginBottom: "1rem" }}>
          Module not found
        </div>
        <button
          onClick={() => router.push("/admin/training/modules")}
          style={{
            padding: "0.5rem 1rem",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Back to Modules
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <button
          onClick={() => router.push("/admin/training/modules")}
          style={{
            marginBottom: "1rem",
            padding: "0.5rem 1rem",
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          ← Back to Modules
        </button>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "600", marginBottom: "0.5rem" }}>
          Edit Module: {module.title}
        </h1>
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

      {success && (
        <div
          style={{
            padding: "1rem",
            background: "#d1fae5",
            border: "1px solid #86efac",
            borderRadius: "8px",
            color: "#065f46",
            marginBottom: "1rem",
          }}
        >
          {success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
        {/* Left Column */}
        <div>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              Basic Information
            </h2>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Category
                </label>
                <select
                  value={formData.categoryTag}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, categoryTag: e.target.value as any }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                  }}
                >
                  <option value="Guide">Guide</option>
                  <option value="Safety">Safety</option>
                  <option value="Best Practices">Best Practices</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={formData.durationMinutes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, durationMinutes: parseInt(e.target.value) || 5 }))
                  }
                  style={{
                    width: "100%",
                    padding: "0.5rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", fontSize: "0.875rem", fontWeight: "600", marginBottom: "0.5rem" }}>
                Order
              </label>
              <input
                type="number"
                value={formData.order}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, order: parseInt(e.target.value) || 1 }))
                }
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  border: "1px solid #e5e7eb",
                  borderRadius: "6px",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, active: e.target.checked }))}
                />
                <span style={{ fontSize: "0.875rem" }}>Active</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData((prev) => ({ ...prev, required: e.target.checked }))}
                />
                <span style={{ fontSize: "0.875rem" }}>Required</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  checked={formData.requiredForPayment}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, requiredForPayment: e.target.checked }))
                  }
                />
                <span style={{ fontSize: "0.875rem" }}>Required for Payment</span>
              </label>
            </div>
          </div>

          {/* PDF Upload */}
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e5e7eb",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1rem" }}>
              PDF Upload
            </h2>
            <PDFUploader
              moduleId={moduleId}
              moduleName={formData.title || moduleId}
              currentPdfUrl={formData.pdfUrl}
              onUploadComplete={handlePDFUploadComplete}
            />
          </div>
        </div>

        {/* Right Column - Quiz Questions */}
        <div>
          <div
            style={{
              background: "#ffffff",
              borderRadius: "12px",
              padding: "1.5rem",
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: "600" }}>Quiz Questions</h2>
              <button
                onClick={handleAddQuestion}
                style={{
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
                + Add Question
              </button>
            </div>

            {formData.quiz.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                No questions yet. Click "Add Question" to get started.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {formData.quiz.map((question, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      background: "#f9fafb",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontSize: "0.875rem", fontWeight: "600" }}>Question {index + 1}</span>
                      <button
                        onClick={() => handleDeleteQuestion(index)}
                        style={{
                          padding: "0.25rem 0.5rem",
                          background: "#fee2e2",
                          color: "#991b1b",
                          border: "none",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        Question Text
                      </label>
                      <input
                        type="text"
                        value={question.question}
                        onChange={(e) => handleUpdateQuestion(index, "question", e.target.value)}
                        placeholder="Enter question..."
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: "0.75rem" }}>
                      <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        Options (mark correct answer)
                      </label>
                      {question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <input
                            type="radio"
                            name={`correct-${index}`}
                            checked={question.correctIndex === optIndex}
                            onChange={() => handleUpdateQuestion(index, "correctIndex", optIndex)}
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...question.options];
                              newOptions[optIndex] = e.target.value;
                              handleUpdateQuestion(index, "options", newOptions);
                            }}
                            placeholder={`Option ${optIndex + 1}`}
                            style={{
                              flex: 1,
                              padding: "0.5rem",
                              border: "1px solid #e5e7eb",
                              borderRadius: "4px",
                              fontSize: "0.875rem",
                            }}
                          />
                        </label>
                      ))}
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", marginBottom: "0.25rem" }}>
                        Explanation (shown after answer)
                      </label>
                      <textarea
                        value={question.explanation}
                        onChange={(e) => handleUpdateQuestion(index, "explanation", e.target.value)}
                        placeholder="Explain why this is the correct answer..."
                        rows={2}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "1px solid #e5e7eb",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          onClick={() => router.push("/admin/training/modules")}
          style={{
            padding: "0.75rem 1.5rem",
            background: "#f3f4f6",
            color: "#111827",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !formData.title || !formData.description}
          style={{
            padding: "0.75rem 1.5rem",
            background: saving ? "#9ca3af" : "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            fontSize: "0.875rem",
            fontWeight: "600",
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
