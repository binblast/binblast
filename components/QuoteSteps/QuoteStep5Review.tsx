// components/QuoteSteps/QuoteStep5Review.tsx
"use client";

import { useMemo } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep5ReviewProps {
  formData: QuoteFormData;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function QuoteStep5Review({
  formData,
  onSubmit,
  onBack,
  isSubmitting,
}: QuoteStep5ReviewProps) {
  const estimatedPrice = useMemo(() => {
    let basePrice = 0;
    let binPrice = 0;
    let frequencyMultiplier = 1;
    let dumpsterPadFee = 0;

    if (formData.propertyType === "residential") {
      basePrice = 35; // Base monthly price
      binPrice = (formData.residentialBins || 1) * 10; // $10 per bin
      
      if (formData.residentialFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.residentialFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      } else {
        frequencyMultiplier = 1; // Monthly
      }
    } else if (formData.propertyType === "commercial") {
      basePrice = 50; // Base commercial price
      binPrice = (formData.commercialBins || 1) * 15; // $15 per bin/dumpster
      
      if (formData.commercialFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.commercialFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      } else {
        frequencyMultiplier = 1; // Monthly
      }

      if (formData.dumpsterPadCleaning) {
        dumpsterPadFee = 25; // Additional fee for dumpster pad cleaning
      }
    } else if (formData.propertyType === "hoa") {
      // Bulk pricing calculation
      const units = formData.hoaUnits || 1;
      const bins = formData.hoaBins || 1;
      
      // Base price per unit (discounted for bulk)
      basePrice = units * 25; // $25 per unit
      binPrice = bins * 8; // $8 per bin (bulk discount)
      
      if (formData.hoaFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.hoaFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      } else {
        frequencyMultiplier = 1; // Monthly
      }
    }

    const total = (basePrice + binPrice + dumpsterPadFee) * frequencyMultiplier;
    const lowEstimate = Math.floor(total * 0.85);
    const highEstimate = Math.ceil(total * 1.15);

    return { low: lowEstimate, high: highEstimate, base: total };
  }, [formData]);

  const getPropertyTypeLabel = () => {
    switch (formData.propertyType) {
      case "residential":
        return "Residential";
      case "commercial":
        return "Commercial";
      case "hoa":
        return "HOA / Neighborhood";
      default:
        return "";
    }
  };

  const getPropertyDetails = () => {
    if (formData.propertyType === "residential") {
      return [
        { label: "Number of bins", value: formData.residentialBins?.toString() || "N/A" },
        { label: "Frequency", value: formData.residentialFrequency || "N/A" },
        { label: "Special requirements", value: formData.residentialSpecialRequirements || "None" },
      ];
    } else if (formData.propertyType === "commercial") {
      return [
        { label: "Property type", value: formData.commercialType || "N/A" },
        { label: "Number of bins/dumpsters", value: formData.commercialBins?.toString() || "N/A" },
        { label: "Dumpster pad cleaning", value: formData.dumpsterPadCleaning ? "Yes" : "No" },
        { label: "Frequency", value: formData.commercialFrequency || "N/A" },
        { label: "Special requirements", value: formData.commercialSpecialRequirements || "None" },
      ];
    } else if (formData.propertyType === "hoa") {
      return [
        { label: "Number of units/homes", value: formData.hoaUnits?.toString() || "N/A" },
        { label: "Total bins", value: formData.hoaBins?.toString() || "N/A" },
        { label: "Frequency", value: formData.hoaFrequency || "N/A" },
        { label: "Bulk pricing", value: formData.bulkPricing ? "Yes" : "No" },
        { label: "Access requirements", value: formData.communityAccessRequirements || "None" },
      ];
    }
    return [];
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
          Review your information
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280"
        }}>
          Please review all details before submitting
        </p>
      </div>

      {/* Estimated Quote */}
      <div style={{
        padding: "1.5rem",
        background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)",
        borderRadius: "12px",
        border: "2px solid #86efac",
        marginBottom: "1rem"
      }}>
        <div style={{
          fontSize: "0.875rem",
          fontWeight: "600",
          color: "#166534",
          marginBottom: "0.5rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Estimated Monthly Price Range
        </div>
        <div style={{
          fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
          fontWeight: "800",
          color: "#16a34a"
        }}>
          ${estimatedPrice.low.toLocaleString()} - ${estimatedPrice.high.toLocaleString()}/month
        </div>
        <div style={{
          fontSize: "0.75rem",
          color: "#166534",
          marginTop: "0.5rem"
        }}>
          * Final pricing will be confirmed after review
        </div>
      </div>

      {/* Property Details */}
      <div style={{
        padding: "1.25rem",
        background: "#f9fafb",
        borderRadius: "12px",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{
          fontSize: "0.875rem",
          fontWeight: "700",
          color: "var(--text-dark)",
          marginBottom: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Property Information
        </div>
        <div style={{
          fontSize: "1rem",
          fontWeight: "600",
          color: "var(--text-dark)",
          marginBottom: "0.75rem"
        }}>
          {getPropertyTypeLabel()}
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          {getPropertyDetails().map((detail, index) => (
            <div key={index} style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.875rem",
              paddingBottom: index < getPropertyDetails().length - 1 ? "0.5rem" : "0",
              borderBottom: index < getPropertyDetails().length - 1 ? "1px solid #e5e7eb" : "none"
            }}>
              <span style={{ color: "#6b7280" }}>{detail.label}:</span>
              <span style={{ fontWeight: "600", color: "var(--text-dark)", textAlign: "right", maxWidth: "60%" }}>
                {detail.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Information */}
      <div style={{
        padding: "1.25rem",
        background: "#f9fafb",
        borderRadius: "12px",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{
          fontSize: "0.875rem",
          fontWeight: "700",
          color: "var(--text-dark)",
          marginBottom: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Contact Information
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.875rem"
          }}>
            <span style={{ color: "#6b7280" }}>Name:</span>
            <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>{formData.name || "N/A"}</span>
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.875rem"
          }}>
            <span style={{ color: "#6b7280" }}>Email:</span>
            <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>{formData.email || "N/A"}</span>
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.875rem"
          }}>
            <span style={{ color: "#6b7280" }}>Phone:</span>
            <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>{formData.phone || "N/A"}</span>
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.875rem"
          }}>
            <span style={{ color: "#6b7280" }}>Preferred contact:</span>
            <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>{formData.preferredContact || "N/A"}</span>
          </div>
          {formData.bestTimeToContact && (
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.875rem"
            }}>
              <span style={{ color: "#6b7280" }}>Best time:</span>
              <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>{formData.bestTimeToContact}</span>
            </div>
          )}
        </div>
      </div>

      {/* Additional Details */}
      <div style={{
        padding: "1.25rem",
        background: "#f9fafb",
        borderRadius: "12px",
        border: "1px solid #e5e7eb"
      }}>
        <div style={{
          fontSize: "0.875rem",
          fontWeight: "700",
          color: "var(--text-dark)",
          marginBottom: "1rem",
          textTransform: "uppercase",
          letterSpacing: "0.05em"
        }}>
          Additional Details
        </div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem"
        }}>
          <div>
            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Address:</div>
            <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
              {formData.address || "N/A"}
            </div>
          </div>
          {formData.timeline && (
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Timeline:</div>
              <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "var(--text-dark)" }}>
                {formData.timeline}
              </div>
            </div>
          )}
          {(formData.specialInstructions || 
            formData.residentialSpecialRequirements || 
            formData.commercialSpecialRequirements || 
            formData.communityAccessRequirements) && (
            <div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280", marginBottom: "0.25rem" }}>Special Instructions:</div>
              <div style={{ fontSize: "0.875rem", color: "var(--text-dark)" }}>
                {formData.specialInstructions || 
                 formData.residentialSpecialRequirements || 
                 formData.commercialSpecialRequirements || 
                 formData.communityAccessRequirements}
              </div>
            </div>
          )}
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
          disabled={isSubmitting}
          style={{
            flex: 1,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: "#f9fafb",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "600",
            color: "var(--text-dark)",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            minHeight: "44px",
            opacity: isSubmitting ? 0.5 : 1
          }}
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          style={{
            flex: 2,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: isSubmitting
              ? "#9ca3af"
              : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            border: "none",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "700",
            color: "#ffffff",
            cursor: isSubmitting ? "not-allowed" : "pointer",
            minHeight: "44px",
            boxShadow: isSubmitting ? "none" : "0 4px 12px rgba(22, 163, 74, 0.3)",
            transition: "all 0.2s ease"
          }}
        >
          {isSubmitting ? "Submitting..." : "Submit Quote Request"}
        </button>
      </div>

      {isSubmitting && (
        <div style={{
          padding: "1rem",
          background: "#f0fdf4",
          borderRadius: "8px",
          border: "1px solid #bbf7d0",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "#166534"
        }}>
          Submitting your quote request...
        </div>
      )}
    </div>
  );
}

