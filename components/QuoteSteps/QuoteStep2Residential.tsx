// components/QuoteSteps/QuoteStep2Residential.tsx
"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep2ResidentialProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuoteStep2Residential({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep2ResidentialProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.residentialBins || formData.residentialBins < 1) {
      newErrors.bins = "Please enter the number of bins";
    }
    if (!formData.residentialFrequency) {
      newErrors.frequency = "Please select a frequency";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
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
          Tell us about your bins
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280"
        }}>
          Help us understand your cleaning needs
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Number of Bins */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            How many bins need cleaning?
          </label>
          <input
            type="number"
            min="1"
            value={formData.residentialBins || ""}
            onChange={(e) => updateFormData({ residentialBins: parseInt(e.target.value) || undefined })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.bins ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="Enter number of bins"
          />
          {errors.bins && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.bins}
            </p>
          )}
        </div>

        {/* Frequency */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            How often do you need cleaning?
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem"
          }}>
            {["Monthly", "Bi-weekly", "Weekly"].map((freq) => (
              <button
                key={freq}
                onClick={() => updateFormData({ residentialFrequency: freq })}
                style={{
                  padding: "clamp(0.875rem, 2vw, 1rem)",
                  background: formData.residentialFrequency === freq
                    ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                    : "#f9fafb",
                  border: `2px solid ${formData.residentialFrequency === freq ? "#16a34a" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                  fontWeight: formData.residentialFrequency === freq ? "600" : "500",
                  color: formData.residentialFrequency === freq ? "#16a34a" : "var(--text-dark)",
                  transition: "all 0.2s ease",
                  minHeight: "44px"
                }}
              >
                {freq}
              </button>
            ))}
          </div>
          {errors.frequency && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.frequency}
            </p>
          )}
        </div>

        {/* Special Requirements */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Any special requirements? (Optional)
          </label>
          <textarea
            value={formData.residentialSpecialRequirements || ""}
            onChange={(e) => updateFormData({ residentialSpecialRequirements: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "100px",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
            placeholder="Any special instructions or requirements..."
          />
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: "flex",
        gap: "1rem",
        marginTop: "1rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid #e5e7eb"
      }}>
        <button
          onClick={onBack}
          style={{
            flex: 1,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: "#f9fafb",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "600",
            color: "var(--text-dark)",
            cursor: "pointer",
            minHeight: "44px"
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 2,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            border: "none",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "700",
            color: "#ffffff",
            cursor: "pointer",
            minHeight: "44px",
            boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)"
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

