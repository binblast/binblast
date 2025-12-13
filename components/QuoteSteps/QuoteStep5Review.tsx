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
    // Residential pricing
    if (formData.propertyType === "residential") {
      const basePrice = 55; // Updated base monthly price
      const binPrice = (formData.residentialBins || 1) * 10; // $10 per bin
      
      let frequencyMultiplier = 1;
      if (formData.residentialFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.residentialFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      }
      
      const total = (basePrice + binPrice) * frequencyMultiplier;
      let lowEstimate = Math.floor(total * 0.85);
      let highEstimate = Math.ceil(total * 1.15);
      
      // Cap residential range to $55-$85/month
      lowEstimate = Math.max(lowEstimate, 55);
      highEstimate = Math.min(highEstimate, 85);
      
      // Ensure low <= high
      if (lowEstimate > highEstimate) {
        const temp = lowEstimate;
        lowEstimate = highEstimate;
        highEstimate = temp;
      }
      
      return { 
        low: lowEstimate, 
        high: highEstimate, 
        base: total,
        recommendedBundle: null,
        padPackageTier: null
      };
    }
    
    // Commercial pricing
    if (formData.propertyType === "commercial") {
      const isRestaurant = formData.commercialType === "Restaurant";
      const hasDumpsterPad = formData.dumpsterPadCleaning === true;
      const frequency = formData.commercialFrequency;
      const dumpsterCount = formData.commercialBins || 1;
      
      // Base dumpster cleaning price
      // First dumpster included in base price, additional dumpsters cost extra
      const dumpsterBasePrice = isRestaurant ? 120 : 95;
      const additionalDumpsterFee = isRestaurant ? 20 : 15;
      const additionalDumpsters = Math.max(0, dumpsterCount - 1); // Number of dumpsters beyond the first
      const dumpsterPrice = dumpsterBasePrice + (additionalDumpsters * additionalDumpsterFee);
      
      // Apply frequency multiplier to dumpster cleaning
      let dumpsterMonthlyPrice = dumpsterPrice;
      if (frequency === "Bi-weekly") {
        dumpsterMonthlyPrice *= 2;
      } else if (frequency === "Weekly") {
        dumpsterMonthlyPrice *= 4;
      }
      
      // Dumpster pad package pricing (tiered)
      let padPackagePrice = 0;
      let padPackageTier: "A" | "B" | "C" | null = null;
      
      if (hasDumpsterPad) {
        if (frequency === "Monthly") {
          padPackagePrice = 150; // Package A
          padPackageTier = "A";
        } else if (frequency === "Bi-weekly") {
          padPackagePrice = 250; // Package B
          padPackageTier = "B";
        } else if (frequency === "Weekly") {
          padPackagePrice = 400; // Package C
          padPackageTier = "C";
        }
      }
      
      // Calculate total
      let totalPrice = dumpsterMonthlyPrice + padPackagePrice;
      
      // Bundle detection
      let recommendedBundle: string | null = null;
      if (hasDumpsterPad) {
        if (isRestaurant && frequency === "Weekly") {
          recommendedBundle = "Premium Property Protection";
        } else if (isRestaurant && frequency === "Bi-weekly") {
          recommendedBundle = "Restaurant Compliance Bundle";
        } else if (frequency === "Bi-weekly") {
          recommendedBundle = "Commercial Clean Site Bundle";
        } else if (frequency === "Monthly") {
          recommendedBundle = "Commercial Clean Site Bundle";
        }
      }
      
      // Minimum price enforcement
      let minimumPriceEnforced = false;
      if (isRestaurant && hasDumpsterPad && frequency === "Weekly") {
        if (totalPrice < 350) {
          totalPrice = 350;
          minimumPriceEnforced = true;
        }
      } else if (isRestaurant && hasDumpsterPad && frequency === "Bi-weekly") {
        if (totalPrice < 250) {
          totalPrice = 250;
          minimumPriceEnforced = true;
        }
      } else if (isRestaurant && hasDumpsterPad && frequency === "Monthly") {
        if (totalPrice < 150) {
          totalPrice = 150;
          minimumPriceEnforced = true;
        }
      }
      
      // Calculate range (±15-20%)
      let lowEstimate = Math.floor(totalPrice * 0.85);
      let highEstimate = Math.ceil(totalPrice * 1.15);
      
      // Cap ranges based on package tiers and frequency
      if (hasDumpsterPad) {
        if (frequency === "Monthly") {
          lowEstimate = Math.max(lowEstimate, 150);
          highEstimate = Math.min(highEstimate, 195);
        } else if (frequency === "Bi-weekly") {
          lowEstimate = Math.max(lowEstimate, 250);
          highEstimate = Math.min(highEstimate, 350);
        } else if (frequency === "Weekly") {
          lowEstimate = Math.max(lowEstimate, 400);
          highEstimate = Math.min(highEstimate, 600);
        }
      } else {
        // Commercial without pad - cap by frequency
        if (frequency === "Monthly") {
          lowEstimate = Math.max(lowEstimate, 95);
          highEstimate = Math.min(highEstimate, 160);
        } else if (frequency === "Bi-weekly") {
          lowEstimate = Math.max(lowEstimate, 160);
          highEstimate = Math.min(highEstimate, 240);
        } else if (frequency === "Weekly") {
          lowEstimate = Math.max(lowEstimate, 280);
          highEstimate = Math.min(highEstimate, 400);
        }
      }
      
      // Ensure low <= high (fix any inversion from capping)
      if (lowEstimate > highEstimate) {
        const temp = lowEstimate;
        lowEstimate = highEstimate;
        highEstimate = temp;
      }
      
      return {
        low: lowEstimate,
        high: highEstimate,
        base: totalPrice,
        dumpsterPrice: dumpsterMonthlyPrice,
        padPrice: padPackagePrice,
        padPackageTier,
        recommendedBundle,
        minimumPriceEnforced
      };
    }
    
    // HOA pricing (keep existing logic)
    if (formData.propertyType === "hoa") {
      const units = formData.hoaUnits || 1;
      const bins = formData.hoaBins || 1;
      
      const basePrice = units * 25;
      const binPrice = bins * 8;
      
      let frequencyMultiplier = 1;
      if (formData.hoaFrequency === "Weekly") {
        frequencyMultiplier = 4;
      } else if (formData.hoaFrequency === "Bi-weekly") {
        frequencyMultiplier = 2;
      }
      
      const total = (basePrice + binPrice) * frequencyMultiplier;
      const lowEstimate = Math.floor(total * 0.85);
      const highEstimate = Math.ceil(total * 1.15);
      
      return { 
        low: lowEstimate, 
        high: highEstimate, 
        base: total,
        recommendedBundle: null,
        padPackageTier: null
      };
    }
    
    return { low: 0, high: 0, base: 0, recommendedBundle: null, padPackageTier: null };
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

