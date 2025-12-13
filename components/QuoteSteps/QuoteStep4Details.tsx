// components/QuoteSteps/QuoteStep4Details.tsx
"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep4DetailsProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function QuoteStep4Details({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep4DetailsProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.address || formData.address.trim().length < 5) {
      newErrors.address = "Please enter a valid address";
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
          Additional details
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280"
        }}>
          Help us prepare your custom quote
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Address */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Service Address *
          </label>
          <input
            type="text"
            value={formData.address || ""}
            onChange={(e) => updateFormData({ address: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.address ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="Enter full address"
          />
          {errors.address && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.address}
            </p>
          )}
        </div>

        {/* Timeline */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            When do you need service to start? (Optional)
          </label>
          <select
            value={formData.timeline || ""}
            onChange={(e) => updateFormData({ timeline: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
          >
            <option value="">Select timeline</option>
            <option value="ASAP">ASAP</option>
            <option value="Within 1 week">Within 1 week</option>
            <option value="Within 2 weeks">Within 2 weeks</option>
            <option value="Within 1 month">Within 1 month</option>
            <option value="Just exploring options">Just exploring options</option>
          </select>
        </div>

        {/* Special Instructions */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Special Instructions (Optional)
          </label>
          <textarea
            value={formData.specialInstructions || ""}
            onChange={(e) => updateFormData({ specialInstructions: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "120px",
              resize: "vertical",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
            placeholder="Any additional information, special requirements, or questions..."
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
          Review & Submit
        </button>
      </div>
    </div>
  );
}

