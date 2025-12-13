// components/QuoteSteps/QuoteStep5Review.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { calculatePricingWithSafeguards, PricingInput } from "@/lib/pricing-safeguards";

interface QuoteStep5ReviewProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onSubmit: () => void;
  onBack: () => void;
  onNavigateToStep: (step: number) => void;
  isSubmitting: boolean;
}

interface FixSuggestion {
  label: string;
  action: () => void;
  step?: number;
  description?: string;
}

export function QuoteStep5Review({
  formData,
  updateFormData,
  onSubmit,
  onBack,
  onNavigateToStep,
  isSubmitting,
}: QuoteStep5ReviewProps) {
  const [fixApplied, setFixApplied] = useState<string | null>(null);
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

  // Auto-recheck when formData changes
  useEffect(() => {
    if (fixApplied && !pricingResult.requiresManualReview) {
      // Clear fix applied message after showing success
      setTimeout(() => setFixApplied(null), 3000);
    }
  }, [pricingResult.requiresManualReview, fixApplied]);

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

  // Helper function to get fix suggestions for each review reason
  const getFixSuggestions = (reason: string): FixSuggestion[] => {
    const suggestions: FixSuggestion[] = [];
    const currentFrequency = formData.commercialFrequency || formData.residentialFrequency || formData.hoaFrequency || "Monthly";
    const isCommercial = formData.propertyType === "commercial";
    const isRestaurant = formData.commercialType === "Restaurant";

    // Handle price threshold flags (both $500 and $600 thresholds)
    if (reason.includes("Total monthly price exceeds $500") || reason.includes("Total monthly price exceeds $600")) {
      // Don't suggest frequency changes for weekly services - let them keep weekly
      // Instead, offer alternatives that maintain weekly frequency
      if (currentFrequency !== "Weekly") {
        // Only suggest frequency change if NOT already weekly
        if (currentFrequency === "Monthly") {
          suggestions.push({
            label: "Change to Bi-weekly",
            action: () => {
              if (isCommercial) {
                updateFormData({ commercialFrequency: "Bi-weekly" });
              } else if (formData.propertyType === "residential") {
                updateFormData({ residentialFrequency: "Bi-weekly" });
              } else {
                updateFormData({ hoaFrequency: "Bi-weekly" });
              }
              setFixApplied("frequency");
            },
            step: 2,
            description: "Reduces monthly cost while maintaining service"
          });
        }
      }
      
      // Always offer these alternatives regardless of frequency
      if (formData.dumpsterPadCleaning) {
        suggestions.push({
          label: "Remove Dumpster Pad Cleaning",
          action: () => {
            updateFormData({ dumpsterPadCleaning: false });
            setFixApplied("dumpsterPad");
          },
          step: 2,
          description: currentFrequency === "Weekly" 
            ? "Saves $75/month (keeps weekly service)" 
            : "Saves $75/month"
        });
      }
      
      if (formData.commercialBins && formData.commercialBins > 1) {
        const reduction = formData.commercialBins - 1;
        suggestions.push({
          label: `Reduce to ${reduction} Dumpster${reduction > 1 ? 's' : ''}`,
          action: () => {
            updateFormData({ commercialBins: reduction });
            setFixApplied("dumpsterCount");
          },
          step: 2,
          description: currentFrequency === "Weekly"
            ? `Saves $${(isRestaurant ? 20 : 15) * (formData.commercialBins || 1)}/month (keeps weekly service)`
            : `Saves $${(isRestaurant ? 20 : 15) * (formData.commercialBins || 1)}/month`
        });
      }
      
      // For residential, offer bin reduction
      if (formData.propertyType === "residential" && formData.residentialBins && formData.residentialBins > 1) {
        const reduction = formData.residentialBins - 1;
        suggestions.push({
          label: `Reduce to ${reduction} Bin${reduction > 1 ? 's' : ''}`,
          action: () => {
            updateFormData({ residentialBins: reduction });
            setFixApplied("binCount");
          },
          step: 2,
          description: currentFrequency === "Weekly"
            ? `Saves $${10 * (formData.residentialBins || 1)}/month (keeps weekly service)`
            : `Saves $${10 * (formData.residentialBins || 1)}/month`
        });
      }
    }

    if (reason.includes("Dumpster count")) {
      const match = reason.match(/\((\d+)\)/);
      const count = match ? parseInt(match[1]) : 0;
      if (count >= 4) {
        suggestions.push({
          label: "Reduce to 3 Dumpsters",
          action: () => {
            updateFormData({ commercialBins: 3 });
            setFixApplied("dumpsterCount");
          },
          step: 2,
          description: "Meets auto-approval threshold"
        });
      }
    }

    // Removed weekly-specific flags - these reasons should no longer appear
    // But keeping this code as fallback in case old data exists
    if (reason.includes("Weekly restaurant service")) {
      // Don't suggest frequency change - offer alternatives instead
      if (formData.dumpsterPadCleaning) {
        suggestions.push({
          label: "Remove Dumpster Pad Cleaning",
          action: () => {
            updateFormData({ dumpsterPadCleaning: false });
            setFixApplied("dumpsterPad");
          },
          step: 2,
          description: "Saves $75/month (keeps weekly service)"
        });
      }
      if (formData.commercialBins && formData.commercialBins > 1) {
        suggestions.push({
          label: `Reduce to ${formData.commercialBins - 1} Dumpster${formData.commercialBins - 1 > 1 ? 's' : ''}`,
          action: () => {
            updateFormData({ commercialBins: (formData.commercialBins || 1) - 1 });
            setFixApplied("dumpsterCount");
          },
          step: 2,
          description: `Saves $${isRestaurant ? 20 : 15}/month (keeps weekly service)`
        });
      }
    }

    if (reason.includes("Weekly dumpster pad")) {
      // Don't suggest frequency change - offer alternatives instead
      suggestions.push({
        label: "Remove Dumpster Pad Cleaning",
        action: () => {
          updateFormData({ dumpsterPadCleaning: false });
          setFixApplied("dumpsterPad");
        },
        step: 2,
        description: "Saves $75/month (keeps weekly service)"
      });
      if (formData.commercialBins && formData.commercialBins > 1) {
        suggestions.push({
          label: `Reduce to ${formData.commercialBins - 1} Dumpster${formData.commercialBins - 1 > 1 ? 's' : ''}`,
          action: () => {
            updateFormData({ commercialBins: (formData.commercialBins || 1) - 1 });
            setFixApplied("dumpsterCount");
          },
          step: 2,
          description: `Saves $${isRestaurant ? 20 : 15}/month (keeps weekly service)`
        });
      }
    }

    if (reason.includes("Special requirements")) {
      suggestions.push({
        label: "Remove Special Requirements",
        action: () => {
          if (isCommercial) {
            updateFormData({ commercialSpecialRequirements: "" });
          } else if (formData.propertyType === "residential") {
            updateFormData({ residentialSpecialRequirements: "" });
          } else {
            updateFormData({ communityAccessRequirements: "" });
          }
          setFixApplied("specialRequirements");
        },
        step: isCommercial ? 2 : formData.propertyType === "residential" ? 2 : 2,
        description: "Allows auto-approval"
      });
      suggestions.push({
        label: "Edit Requirements",
        action: () => {
          onNavigateToStep(isCommercial ? 2 : formData.propertyType === "residential" ? 2 : 2);
        },
        step: isCommercial ? 2 : formData.propertyType === "residential" ? 2 : 2,
        description: "Modify your special requirements"
      });
    }

    return suggestions;
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

        {/* Success Message When Issues Resolved */}
        {fixApplied && !estimatedPrice.requiresManualReview && (
          <div style={{
            marginTop: "1rem",
            padding: "1rem",
            background: "#dcfce7",
            borderRadius: "8px",
            border: "2px solid #16a34a",
            animation: "fadeInUp 0.3s ease-out"
          }}>
            <div style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#166534",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              ✓ Great! Your quote no longer requires manual review.
            </div>
          </div>
        )}

        {/* Manual Review Required - Actionable Version */}
        {estimatedPrice.requiresManualReview && (
          <div style={{
            marginTop: "1rem",
            padding: "1.25rem",
            background: "#fef3c7",
            borderRadius: "12px",
            border: "2px solid #fbbf24",
            animation: "fadeInUp 0.3s ease-out"
          }}>
            <div style={{
              fontSize: "0.875rem",
              fontWeight: "700",
              color: "#92400e",
              marginBottom: "0.75rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              ⚠️ Manual Review Required
            </div>
            <div style={{
              fontSize: "0.875rem",
              color: "#92400e",
              marginBottom: "1rem",
              lineHeight: "1.5"
            }}>
              Your quote requires a custom review. You can fix the issues below to enable instant approval, or submit as-is for manual review.
            </div>

            {/* Review Reasons with Fix Suggestions */}
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              marginBottom: "1rem"
            }}>
              {estimatedPrice.reviewReasons.map((reason, index) => {
                const suggestions = getFixSuggestions(reason);
                return (
                  <div key={index} style={{
                    padding: "0.75rem",
                    background: "#ffffff",
                    borderRadius: "8px",
                    border: "1px solid #fbbf24"
                  }}>
                    <div style={{
                      fontSize: "0.8125rem",
                      fontWeight: "600",
                      color: "#92400e",
                      marginBottom: "0.5rem"
                    }}>
                      {reason}
                    </div>
                    {suggestions.length > 0 && (
                      <div style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.5rem",
                        marginTop: "0.5rem"
                      }}>
                        <div style={{
                          fontSize: "0.75rem",
                          color: "#78350f",
                          fontWeight: "600",
                          marginBottom: "0.25rem"
                        }}>
                          Quick Fixes:
                        </div>
                        <div style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem"
                        }}>
                          {suggestions.map((suggestion, sugIndex) => (
                            <div key={sugIndex} style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.25rem"
                            }}>
                              <button
                                onClick={suggestion.action}
                                style={{
                                  padding: "0.5rem 0.75rem",
                                  background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
                                  border: "none",
                                  borderRadius: "6px",
                                  fontSize: "0.75rem",
                                  fontWeight: "600",
                                  color: "#ffffff",
                                  cursor: "pointer",
                                  transition: "all 0.2s ease",
                                  boxShadow: "0 2px 4px rgba(22, 163, 74, 0.2)"
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = "translateY(-1px)";
                                  e.currentTarget.style.boxShadow = "0 4px 8px rgba(22, 163, 74, 0.3)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = "translateY(0)";
                                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(22, 163, 74, 0.2)";
                                }}
                              >
                                {suggestion.label}
                              </button>
                              {suggestion.description && (
                                <div style={{
                                  fontSize: "0.7rem",
                                  color: "#78350f",
                                  fontStyle: "italic"
                                }}>
                                  {suggestion.description}
                                </div>
                              )}
                            </div>
                          ))}
                          {suggestions.some(s => s.step) && (
                            <button
                              onClick={() => {
                                const step = suggestions.find(s => s.step)?.step || 2;
                                onNavigateToStep(step);
                              }}
                              style={{
                                padding: "0.5rem 0.75rem",
                                background: "#ffffff",
                                border: "2px solid #fbbf24",
                                borderRadius: "6px",
                                fontSize: "0.75rem",
                                fontWeight: "600",
                                color: "#92400e",
                                cursor: "pointer",
                                transition: "all 0.2s ease"
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fef3c7";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#ffffff";
                              }}
                            >
                              Go to Step {suggestions.find(s => s.step)?.step || 2}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Inline Editing for Simple Fixes */}
            {estimatedPrice.reviewReasons.some(r => 
              r.includes("frequency") || 
              r.includes("Frequency") ||
              r.includes("dumpster count") || 
              r.includes("Dumpster count") ||
              r.includes("dumpster pad") ||
              r.includes("Dumpster pad") ||
              r.includes("Special requirements")
            ) && (
              <div style={{
                padding: "0.75rem",
                background: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #fbbf24",
                marginBottom: "1rem"
              }}>
                <div style={{
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  color: "#92400e",
                  marginBottom: "0.75rem"
                }}>
                  Or Edit Here:
                </div>
                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem"
                }}>
                  {formData.propertyType === "commercial" && (
                    <>
                      {estimatedPrice.reviewReasons.some(r => r.includes("frequency")) && (
                        <div>
                          <label style={{
                            display: "block",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#92400e",
                            marginBottom: "0.25rem"
                          }}>
                            Frequency:
                          </label>
                          <select
                            value={formData.commercialFrequency || "Monthly"}
                            onChange={(e) => {
                              updateFormData({ commercialFrequency: e.target.value });
                              setFixApplied("frequency");
                            }}
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "2px solid #fbbf24",
                              borderRadius: "6px",
                              fontSize: "0.875rem",
                              background: "#ffffff",
                              cursor: "pointer"
                            }}
                          >
                            <option value="Monthly">Monthly</option>
                            <option value="Bi-weekly">Bi-weekly</option>
                            <option value="Weekly">Weekly</option>
                          </select>
                        </div>
                      )}
                      {estimatedPrice.reviewReasons.some(r => r.includes("dumpster count")) && (
                        <div>
                          <label style={{
                            display: "block",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#92400e",
                            marginBottom: "0.25rem"
                          }}>
                            Number of Dumpsters:
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="3"
                            value={formData.commercialBins || 1}
                            onChange={(e) => {
                              const value = Math.min(3, Math.max(1, parseInt(e.target.value) || 1));
                              updateFormData({ commercialBins: value });
                              setFixApplied("dumpsterCount");
                            }}
                            style={{
                              width: "100%",
                              padding: "0.5rem",
                              border: "2px solid #fbbf24",
                              borderRadius: "6px",
                              fontSize: "0.875rem",
                              background: "#ffffff"
                            }}
                          />
                          <div style={{
                            fontSize: "0.7rem",
                            color: "#78350f",
                            marginTop: "0.25rem"
                          }}>
                            Maximum 3 for auto-approval
                          </div>
                        </div>
                      )}
                      {estimatedPrice.reviewReasons.some(r => r.includes("dumpster pad")) && (
                        <div>
                          <label style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: "600",
                            color: "#92400e",
                            cursor: "pointer"
                          }}>
                            <input
                              type="checkbox"
                              checked={formData.dumpsterPadCleaning || false}
                              onChange={(e) => {
                                updateFormData({ dumpsterPadCleaning: e.target.checked });
                                setFixApplied("dumpsterPad");
                              }}
                              style={{
                                width: "18px",
                                height: "18px",
                                cursor: "pointer"
                              }}
                            />
                            Dumpster Pad Cleaning (+$75/month)
                          </label>
                        </div>
                      )}
                    </>
                  )}
                  {formData.propertyType === "residential" && estimatedPrice.reviewReasons.some(r => r.includes("frequency")) && (
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#92400e",
                        marginBottom: "0.25rem"
                      }}>
                        Frequency:
                      </label>
                      <select
                        value={formData.residentialFrequency || "Monthly"}
                        onChange={(e) => {
                          updateFormData({ residentialFrequency: e.target.value });
                          setFixApplied("frequency");
                        }}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #fbbf24",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          background: "#ffffff",
                          cursor: "pointer"
                        }}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>
                  )}
                  {formData.propertyType === "hoa" && estimatedPrice.reviewReasons.some(r => r.includes("frequency")) && (
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#92400e",
                        marginBottom: "0.25rem"
                      }}>
                        Frequency:
                      </label>
                      <select
                        value={formData.hoaFrequency || "Monthly"}
                        onChange={(e) => {
                          updateFormData({ hoaFrequency: e.target.value });
                          setFixApplied("frequency");
                        }}
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #fbbf24",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          background: "#ffffff",
                          cursor: "pointer"
                        }}
                      >
                        <option value="Monthly">Monthly</option>
                        <option value="Bi-weekly">Bi-weekly</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>
                  )}
                  {estimatedPrice.reviewReasons.some(r => r.includes("Special requirements")) && (
                    <div>
                      <label style={{
                        display: "block",
                        fontSize: "0.75rem",
                        fontWeight: "600",
                        color: "#92400e",
                        marginBottom: "0.25rem"
                      }}>
                        Special Requirements:
                      </label>
                      <textarea
                        value={
                          formData.commercialSpecialRequirements ||
                          formData.residentialSpecialRequirements ||
                          formData.communityAccessRequirements ||
                          ""
                        }
                        onChange={(e) => {
                          if (formData.propertyType === "commercial") {
                            updateFormData({ commercialSpecialRequirements: e.target.value });
                          } else if (formData.propertyType === "residential") {
                            updateFormData({ residentialSpecialRequirements: e.target.value });
                          } else {
                            updateFormData({ communityAccessRequirements: e.target.value });
                          }
                          setFixApplied("specialRequirements");
                        }}
                        placeholder="Leave empty for auto-approval"
                        style={{
                          width: "100%",
                          padding: "0.5rem",
                          border: "2px solid #fbbf24",
                          borderRadius: "6px",
                          fontSize: "0.875rem",
                          background: "#ffffff",
                          minHeight: "60px",
                          resize: "vertical"
                        }}
                      />
                      <div style={{
                        fontSize: "0.7rem",
                        color: "#78350f",
                        marginTop: "0.25rem"
                      }}>
                        Leave empty to enable auto-approval
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation to Previous Steps */}
            <div style={{
              padding: "0.75rem",
              background: "#ffffff",
              borderRadius: "8px",
              border: "1px solid #fbbf24"
            }}>
              <div style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "#92400e",
                marginBottom: "0.5rem"
              }}>
                Or Modify Quote Details:
              </div>
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem"
              }}>
                <button
                  onClick={() => onNavigateToStep(1)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "#ffffff",
                    border: "2px solid #fbbf24",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#92400e",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fef3c7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  Step 1: Property Type
                </button>
                <button
                  onClick={() => onNavigateToStep(2)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "#ffffff",
                    border: "2px solid #fbbf24",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#92400e",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fef3c7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  Step 2: Property Details
                </button>
                <button
                  onClick={() => onNavigateToStep(3)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "#ffffff",
                    border: "2px solid #fbbf24",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#92400e",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fef3c7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  Step 3: Contact Info
                </button>
                <button
                  onClick={() => onNavigateToStep(4)}
                  style={{
                    padding: "0.5rem 0.75rem",
                    background: "#ffffff",
                    border: "2px solid #fbbf24",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    color: "#92400e",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#fef3c7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#ffffff";
                  }}
                >
                  Step 4: Additional Details
                </button>
              </div>
            </div>

            <div style={{
              fontSize: "0.75rem",
              color: "#78350f",
              marginTop: "1rem",
              padding: "0.75rem",
              background: "#ffffff",
              borderRadius: "6px",
              border: "1px dashed #fbbf24"
            }}>
              <strong>Note:</strong> If you prefer, you can submit as-is and our team will review your quote within 24 hours.
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

