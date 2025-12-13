// components/QuoteSteps/QuoteStep2HOA.tsx
"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep2HOAProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuoteStep2HOA({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep2HOAProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.hoaUnits || formData.hoaUnits < 1) {
      newErrors.units = "Please enter the number of units/homes";
    }
    if (!formData.hoaBins || formData.hoaBins < 1) {
      newErrors.bins = "Please enter the total number of bins";
    }
    if (!formData.hoaFrequency) {
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
          HOA & Neighborhood details
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280"
        }}>
          Help us understand your community cleaning needs
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Number of Units/Homes */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            How many units or homes in the community?
          </label>
          <input
            type="number"
            min="1"
            value={formData.hoaUnits || ""}
            onChange={(e) => updateFormData({ hoaUnits: parseInt(e.target.value) || undefined })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.units ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="Enter number of units/homes"
          />
          {errors.units && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.units}
            </p>
          )}
        </div>

        {/* Number of Bins */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Total number of bins in the community?
          </label>
          <input
            type="number"
            min="1"
            value={formData.hoaBins || ""}
            onChange={(e) => updateFormData({ hoaBins: parseInt(e.target.value) || undefined })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.bins ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="Enter total number of bins"
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
            {["Weekly", "Bi-weekly", "Monthly", "Custom"].map((freq) => (
              <button
                key={freq}
                onClick={() => updateFormData({ hoaFrequency: freq })}
                style={{
                  padding: "clamp(0.875rem, 2vw, 1rem)",
                  background: formData.hoaFrequency === freq
                    ? "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)"
                    : "#f9fafb",
                  border: `2px solid ${formData.hoaFrequency === freq ? "#9333ea" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                  fontWeight: formData.hoaFrequency === freq ? "600" : "500",
                  color: formData.hoaFrequency === freq ? "#9333ea" : "var(--text-dark)",
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

        {/* Bulk Pricing */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Are you interested in bulk pricing?
          </label>
          <div style={{
            display: "flex",
            gap: "1rem"
          }}>
            <button
              onClick={() => updateFormData({ bulkPricing: true })}
              style={{
                flex: 1,
                padding: "clamp(0.875rem, 2vw, 1rem)",
                background: formData.bulkPricing === true
                  ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                  : "#f9fafb",
                border: `2px solid ${formData.bulkPricing === true ? "#16a34a" : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                fontWeight: formData.bulkPricing === true ? "600" : "500",
                color: formData.bulkPricing === true ? "#16a34a" : "var(--text-dark)",
                transition: "all 0.2s ease",
                minHeight: "44px"
              }}
            >
              Yes
            </button>
            <button
              onClick={() => updateFormData({ bulkPricing: false })}
              style={{
                flex: 1,
                padding: "clamp(0.875rem, 2vw, 1rem)",
                background: formData.bulkPricing === false
                  ? "#fee2e2"
                  : "#f9fafb",
                border: `2px solid ${formData.bulkPricing === false ? "#dc2626" : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                fontWeight: formData.bulkPricing === false ? "600" : "500",
                color: formData.bulkPricing === false ? "#dc2626" : "var(--text-dark)",
                transition: "all 0.2s ease",
                minHeight: "44px"
              }}
            >
              No
            </button>
          </div>
        </div>

        {/* Community Access Requirements */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Community access requirements (Optional)
          </label>
          <textarea
            value={formData.communityAccessRequirements || ""}
            onChange={(e) => updateFormData({ communityAccessRequirements: e.target.value })}
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
            placeholder="Gate codes, access instructions, or special requirements..."
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

