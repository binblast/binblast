// components/QuoteSteps/QuoteStep2Commercial.tsx
"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep2CommercialProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuoteStep2Commercial({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep2CommercialProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const commercialTypes = [
    "Restaurant",
    "Office Building",
    "Retail Store",
    "Warehouse",
    "Other"
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.commercialType) {
      newErrors.type = "Please select a property type";
    }
    if (!formData.commercialBins || formData.commercialBins < 1) {
      newErrors.bins = "Please enter the number of bins/dumpsters";
    }
    if (!formData.commercialFrequency) {
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
          Commercial property details
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280"
        }}>
          Help us understand your commercial cleaning needs
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Property Type */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            What type of commercial property?
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem"
          }}>
            {commercialTypes.map((type) => (
              <button
                key={type}
                onClick={() => updateFormData({ commercialType: type })}
                style={{
                  padding: "clamp(0.875rem, 2vw, 1rem)",
                  background: formData.commercialType === type
                    ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                    : "#f9fafb",
                  border: `2px solid ${formData.commercialType === type ? "#2563eb" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                  fontWeight: formData.commercialType === type ? "600" : "500",
                  color: formData.commercialType === type ? "#2563eb" : "var(--text-dark)",
                  transition: "all 0.2s ease",
                  minHeight: "44px"
                }}
              >
                {type}
              </button>
            ))}
          </div>
          {errors.type && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.type}
            </p>
          )}
        </div>

        {/* Number of Bins/Dumpsters */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            How many bins or dumpsters need cleaning?
          </label>
          <input
            type="number"
            min="1"
            value={formData.commercialBins || ""}
            onChange={(e) => updateFormData({ commercialBins: parseInt(e.target.value) || undefined })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.bins ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="Enter number of bins/dumpsters"
          />
          {errors.bins && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.bins}
            </p>
          )}
        </div>

        {/* Dumpster Pad Cleaning */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Do you need dumpster pad cleaning?
          </label>
          <p style={{
            fontSize: "0.75rem",
            color: "#6b7280",
            marginBottom: "0.75rem",
            lineHeight: "1.5"
          }}>
            Dumpster pad cleaning is a high-value sanitation service that includes hot water wash, degreasing, and odor control. Helps ensure health department compliance. Additional $75/month minimum.
          </p>
          <div style={{
            display: "flex",
            gap: "1rem"
          }}>
            <button
              onClick={() => updateFormData({ dumpsterPadCleaning: true })}
              style={{
                flex: 1,
                padding: "clamp(0.875rem, 2vw, 1rem)",
                background: formData.dumpsterPadCleaning === true
                  ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                  : "#f9fafb",
                border: `2px solid ${formData.dumpsterPadCleaning === true ? "#16a34a" : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                fontWeight: formData.dumpsterPadCleaning === true ? "600" : "500",
                color: formData.dumpsterPadCleaning === true ? "#16a34a" : "var(--text-dark)",
                transition: "all 0.2s ease",
                minHeight: "44px"
              }}
            >
              Yes
            </button>
            <button
              onClick={() => updateFormData({ dumpsterPadCleaning: false })}
              style={{
                flex: 1,
                padding: "clamp(0.875rem, 2vw, 1rem)",
                background: formData.dumpsterPadCleaning === false
                  ? "#fee2e2"
                  : "#f9fafb",
                border: `2px solid ${formData.dumpsterPadCleaning === false ? "#dc2626" : "#e5e7eb"}`,
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                fontWeight: formData.dumpsterPadCleaning === false ? "600" : "500",
                color: formData.dumpsterPadCleaning === false ? "#dc2626" : "var(--text-dark)",
                transition: "all 0.2s ease",
                minHeight: "44px"
              }}
            >
              No
            </button>
          </div>
          {formData.dumpsterPadCleaning && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              background: "#f0fdf4",
              borderRadius: "8px",
              border: "1px solid #bbf7d0",
              fontSize: "0.75rem",
              color: "#166534"
            }}>
              <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                Dumpster Pad Cleaning: +$75/month
              </div>
              <div style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                Includes hot water wash, degreasing, odor control, and compliance protection. Minimum total service price: $150/month.
              </div>
            </div>
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
                onClick={() => updateFormData({ commercialFrequency: freq })}
                style={{
                  padding: "clamp(0.875rem, 2vw, 1rem)",
                  background: formData.commercialFrequency === freq
                    ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                    : "#f9fafb",
                  border: `2px solid ${formData.commercialFrequency === freq ? "#2563eb" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                  fontWeight: formData.commercialFrequency === freq ? "600" : "500",
                  color: formData.commercialFrequency === freq ? "#2563eb" : "var(--text-dark)",
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
            value={formData.commercialSpecialRequirements || ""}
            onChange={(e) => updateFormData({ commercialSpecialRequirements: e.target.value })}
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

