// components/QuoteSteps/QuoteStep1PropertyType.tsx
"use client";

import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep1PropertyTypeProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
}

export function QuoteStep1PropertyType({
  formData,
  updateFormData,
  onNext,
}: QuoteStep1PropertyTypeProps) {
  const handleSelect = (type: "residential" | "commercial" | "hoa") => {
    updateFormData({ propertyType: type });
    setTimeout(() => onNext(), 300); // Small delay for smooth transition
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "1.5rem",
      animation: "fadeInUp 0.4s ease-out"
    }}>
      <div>
        <h3 style={{
          fontSize: "clamp(1.125rem, 3vw, 1.25rem)",
          fontWeight: "600",
          color: "var(--text-dark)",
          marginBottom: "0.5rem"
        }}>
          What type of property needs cleaning?
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280",
          marginBottom: "1.5rem"
        }}>
          Select the option that best describes your property type
        </p>
      </div>

      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem"
      }}>
        <button
          onClick={() => handleSelect("residential")}
          style={{
            padding: "clamp(1.25rem, 3vw, 1.5rem)",
            background: formData.propertyType === "residential" 
              ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
              : "#f9fafb",
            border: `2px solid ${formData.propertyType === "residential" ? "#16a34a" : "#e5e7eb"}`,
            borderRadius: "12px",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
            minHeight: "80px",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}
          onMouseEnter={(e) => {
            if (formData.propertyType !== "residential") {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.borderColor = "#d1d5db";
            }
          }}
          onMouseLeave={(e) => {
            if (formData.propertyType !== "residential") {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }
          }}
        >
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: formData.propertyType === "residential" ? "#16a34a" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            flexShrink: 0
          }}>
            {formData.propertyType === "residential" ? "✓" : "🏠"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "clamp(1rem, 3vw, 1.125rem)",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.25rem"
            }}>
              Residential
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280"
            }}>
              Single-family homes, apartments, or residential properties
            </div>
          </div>
        </button>

        <button
          onClick={() => handleSelect("commercial")}
          style={{
            padding: "clamp(1.25rem, 3vw, 1.5rem)",
            background: formData.propertyType === "commercial"
              ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
              : "#f9fafb",
            border: `2px solid ${formData.propertyType === "commercial" ? "#2563eb" : "#e5e7eb"}`,
            borderRadius: "12px",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
            minHeight: "80px",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}
          onMouseEnter={(e) => {
            if (formData.propertyType !== "commercial") {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.borderColor = "#d1d5db";
            }
          }}
          onMouseLeave={(e) => {
            if (formData.propertyType !== "commercial") {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }
          }}
        >
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: formData.propertyType === "commercial" ? "#2563eb" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            flexShrink: 0
          }}>
            {formData.propertyType === "commercial" ? "✓" : "🏢"}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "clamp(1rem, 3vw, 1.125rem)",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.25rem"
            }}>
              Commercial
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280"
            }}>
              Restaurants, offices, retail stores, and commercial properties
            </div>
          </div>
        </button>

        <button
          onClick={() => handleSelect("hoa")}
          style={{
            padding: "clamp(1.25rem, 3vw, 1.5rem)",
            background: formData.propertyType === "hoa"
              ? "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)"
              : "#f9fafb",
            border: `2px solid ${formData.propertyType === "hoa" ? "#9333ea" : "#e5e7eb"}`,
            borderRadius: "12px",
            cursor: "pointer",
            textAlign: "left",
            transition: "all 0.2s ease",
            minHeight: "80px",
            display: "flex",
            alignItems: "center",
            gap: "1rem"
          }}
          onMouseEnter={(e) => {
            if (formData.propertyType !== "hoa") {
              e.currentTarget.style.background = "#f3f4f6";
              e.currentTarget.style.borderColor = "#d1d5db";
            }
          }}
          onMouseLeave={(e) => {
            if (formData.propertyType !== "hoa") {
              e.currentTarget.style.background = "#f9fafb";
              e.currentTarget.style.borderColor = "#e5e7eb";
            }
          }}
        >
          <div style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: formData.propertyType === "hoa" ? "#9333ea" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            flexShrink: 0
          }}>
            {formData.propertyType === "hoa" ? "✓" : ""}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: "clamp(1rem, 3vw, 1.125rem)",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.25rem"
            }}>
              HOA / Neighborhood
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#6b7280"
            }}>
              Homeowners associations, neighborhoods, and community partnerships
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}

