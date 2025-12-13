// components/QuoteSteps/QuoteStep5Review.tsx
"use client";

import { useMemo } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { calculatePricingWithSafeguards, PricingInput } from "@/lib/pricing-safeguards";

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
  const pricingResult = useMemo(() => {
    const input: PricingInput = {
      propertyType: formData.propertyType!,
      commercialType: formData.commercialType,
      dumpsterCount: formData.commercialBins,
      hasDumpsterPad: formData.dumpsterPadCleaning,
      frequency: (formData.commercialFrequency || formData.residentialFrequency || formData.hoaFrequency || "Monthly") as "Monthly" | "Bi-weekly" | "Weekly",
      specialRequirements: formData.commercialSpecialRequirements || formData.residentialSpecialRequirements || formData.communityAccessRequirements || formData.specialInstructions,
      residentialBins: formData.residentialBins,
      hoaUnits: formData.hoaUnits,
      hoaBins: formData.hoaBins,
    };

    return calculatePricingWithSafeguards(input);
  }, [formData]);

  // Legacy compatibility - maintain existing structure for UI
  const estimatedPrice = {
    low: pricingResult.lowEstimate,
    high: pricingResult.highEstimate,
    base: pricingResult.finalPrice,
    recommendedBundle: pricingResult.requiresManualReview ? null : (
      formData.propertyType === "commercial" && formData.dumpsterPadCleaning ? (
        formData.commercialType === "Restaurant" && formData.commercialFrequency === "Weekly" ? "Premium Property Protection" :
        formData.commercialType === "Restaurant" && formData.commercialFrequency === "Bi-weekly" ? "Restaurant Compliance Bundle" :
        "Commercial Clean Site Bundle"
      ) : null
    ),
    padPackageTier: null as "A" | "B" | "C" | null,
    minimumPriceEnforced: pricingResult.minimumPriceEnforced,
    requiresManualReview: pricingResult.requiresManualReview,
    reviewReasons: pricingResult.reviewReasons,
    safeguardReasons: pricingResult.safeguardReasons,
  };

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
        
        {/* Bundle Recommendation */}
        {estimatedPrice.recommendedBundle && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#ffffff",
            borderRadius: "8px",
            border: "1px solid #86efac"
          }}>
            <div style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#166534",
              marginBottom: "0.25rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              ✨ Recommended: {estimatedPrice.recommendedBundle}
            </div>
            <div style={{
              fontSize: "0.75rem",
              color: "#166534",
              lineHeight: "1.4"
            }}>
              {estimatedPrice.recommendedBundle === "Premium Property Protection" && 
                "Includes weekly dumpster cleaning, dumpster pad sanitation, grease & odor control, and priority response."}
              {estimatedPrice.recommendedBundle === "Restaurant Compliance Bundle" && 
                "Includes bi-weekly dumpster cleaning, dumpster pad sanitation, heavy degreasing, and health-inspection readiness."}
              {estimatedPrice.recommendedBundle === "Commercial Clean Site Bundle" && 
                "Includes dumpster cleaning, dumpster pad sanitation, odor treatment, and inspection notes for management."}
            </div>
          </div>
        )}
        
        <div style={{
          fontSize: "0.75rem",
          color: "#166534",
          marginTop: "0.75rem",
          lineHeight: "1.4"
        }}>
          * Final pricing may adjust based on grease levels, access, water availability, and environmental requirements. This is an estimated operational price range for sanitation and compliance services, not a final quote.
        </div>

        {/* Safeguard Reasons */}
        {estimatedPrice.safeguardReasons && estimatedPrice.safeguardReasons.length > 0 && (
          <div style={{
            marginTop: "1rem",
            padding: "0.75rem",
            background: "#fef3c7",
            borderRadius: "8px",
            border: "1px solid #fbbf24"
          }}>
            <div style={{
              fontSize: "0.75rem",
              fontWeight: "600",
              color: "#92400e",
              marginBottom: "0.5rem"
            }}>
              Price Adjustment Applied:
            </div>
            <ul style={{
              fontSize: "0.75rem",
              color: "#92400e",
              margin: 0,
              paddingLeft: "1.25rem",
              lineHeight: "1.5"
            }}>
              {estimatedPrice.safeguardReasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Manual Review Required */}
        {estimatedPrice.requiresManualReview && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#fee2e2",
            borderRadius: "8px",
            border: "2px solid #dc2626"
          }}>
            <div style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#991b1b",
              marginBottom: "0.5rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              ⚠️ Manual Review Required
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#991b1b",
              marginBottom: "0.75rem",
              lineHeight: "1.5"
            }}>
              This service requires a custom review to ensure proper sanitation and scheduling.
            </div>
            <div style={{
              fontSize: "0.75rem",
              color: "#991b1b",
              fontWeight: "600",
              marginBottom: "0.5rem"
            }}>
              Review Reasons:
            </div>
            <ul style={{
              fontSize: "0.75rem",
              color: "#991b1b",
              margin: 0,
              paddingLeft: "1.25rem",
              lineHeight: "1.5"
            }}>
              {estimatedPrice.reviewReasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
            <div style={{
              fontSize: "0.75rem",
              color: "#991b1b",
              marginTop: "0.75rem",
              fontStyle: "italic"
            }}>
              Your quote request will be reviewed by our team. We'll contact you within 24 hours to discuss your needs and provide a final quote.
            </div>
          </div>
        )}
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
          disabled={isSubmitting || estimatedPrice.requiresManualReview}
          style={{
            flex: 2,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: isSubmitting || estimatedPrice.requiresManualReview
              ? "#9ca3af"
              : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            border: "none",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "700",
            color: "#ffffff",
            cursor: isSubmitting || estimatedPrice.requiresManualReview ? "not-allowed" : "pointer",
            minHeight: "44px",
            boxShadow: isSubmitting || estimatedPrice.requiresManualReview ? "none" : "0 4px 12px rgba(22, 163, 74, 0.3)",
            transition: "all 0.2s ease",
            opacity: estimatedPrice.requiresManualReview ? 0.6 : 1
          }}
        >
          {isSubmitting ? "Submitting..." : estimatedPrice.requiresManualReview ? "Manual Review Required" : "Submit Quote Request"}
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

