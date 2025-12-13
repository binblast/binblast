// components/CustomQuoteWizard.tsx
"use client";

import { useState, useEffect } from "react";
import { QuoteStep1PropertyType } from "./QuoteSteps/QuoteStep1PropertyType";
import { QuoteStep2Residential } from "./QuoteSteps/QuoteStep2Residential";
import { QuoteStep2Commercial } from "./QuoteSteps/QuoteStep2Commercial";
import { QuoteStep2HOA } from "./QuoteSteps/QuoteStep2HOA";
import { QuoteStep3Contact } from "./QuoteSteps/QuoteStep3Contact";
import { QuoteStep4Details } from "./QuoteSteps/QuoteStep4Details";
import { QuoteStep5Review } from "./QuoteSteps/QuoteStep5Review";

export interface QuoteFormData {
  propertyType?: "residential" | "commercial" | "hoa";
  // Residential fields
  residentialBins?: number;
  residentialFrequency?: string;
  residentialSpecialRequirements?: string;
  // Commercial fields
  commercialType?: string;
  commercialBins?: number;
  dumpsterPadCleaning?: boolean;
  commercialFrequency?: string;
  commercialSpecialRequirements?: string;
  // HOA fields
  hoaUnits?: number;
  hoaBins?: number;
  hoaFrequency?: string;
  bulkPricing?: boolean;
  communityAccessRequirements?: string;
  // Contact info
  name?: string;
  email?: string;
  phone?: string;
  preferredContact?: string;
  bestTimeToContact?: string;
  // Additional
  address?: string;
  specialInstructions?: string;
  timeline?: string;
}

interface CustomQuoteWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomQuoteWizard({ isOpen, onClose }: CustomQuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<QuoteFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load saved progress from localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("customQuoteProgress");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setFormData(parsed.data || {});
          setCurrentStep(parsed.step || 1);
        } catch (e) {
          console.error("Error loading saved progress:", e);
        }
      }
    }
  }, [isOpen]);

  // Save progress to localStorage
  useEffect(() => {
    if (isOpen && Object.keys(formData).length > 0) {
      localStorage.setItem("customQuoteProgress", JSON.stringify({
        data: formData,
        step: currentStep
      }));
    }
  }, [formData, currentStep, isOpen]);

  const updateFormData = (data: Partial<QuoteFormData>) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < getTotalSteps()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/quotes/custom-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit quote");
      }

      // Clear saved progress
      localStorage.removeItem("customQuoteProgress");
      
      // Show success and close after a moment
      setTimeout(() => {
        setIsSubmitting(false);
        onClose();
        // Reset form
        setFormData({});
        setCurrentStep(1);
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting quote:", error);
      alert(error.message || "Failed to submit quote. Please try again.");
      setIsSubmitting(false);
    }
  };

  const getTotalSteps = () => {
    // Step 1: Property Type
    // Step 2: Property-specific questions
    // Step 3: Contact
    // Step 4: Details
    // Step 5: Review
    return 5;
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "What type of property?";
      case 2:
        if (formData.propertyType === "residential") return "Tell us about your bins";
        if (formData.propertyType === "commercial") return "Commercial property details";
        if (formData.propertyType === "hoa") return "HOA & Neighborhood details";
        return "Property details";
      case 3:
        return "Contact information";
      case 4:
        return "Additional details";
      case 5:
        return "Review & submit";
      default:
        return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "clamp(1rem, 4vw, 2rem)",
        overflowY: "auto",
        animation: "fadeIn 0.3s ease-out"
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          position: "relative",
          animation: "slideUp 0.3s ease-out"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: "clamp(1.5rem, 4vw, 2rem)",
          borderBottom: "1px solid #e5e7eb",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 10,
          borderRadius: "20px 20px 0 0"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem"
          }}>
            <h2 style={{
              fontSize: "clamp(1.25rem, 4vw, 1.5rem)",
              fontWeight: "700",
              color: "var(--text-dark)",
              margin: 0
            }}>
              Custom Quote Request
            </h2>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                background: "transparent",
                border: "none",
                fontSize: "1.5rem",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                color: "#6b7280",
                padding: "0.5rem",
                lineHeight: 1,
                opacity: isSubmitting ? 0.5 : 1
              }}
            >
              ×
            </button>
          </div>

          {/* Progress Bar */}
          <div style={{
            width: "100%",
            height: "6px",
            background: "#e5e7eb",
            borderRadius: "3px",
            overflow: "hidden",
            marginBottom: "0.75rem"
          }}>
            <div style={{
              width: `${(currentStep / getTotalSteps()) * 100}%`,
              height: "100%",
              background: "linear-gradient(90deg, #16a34a 0%, #15803d 100%)",
              transition: "width 0.3s ease",
              borderRadius: "3px"
            }} />
          </div>

          {/* Step Indicator */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "0.875rem",
            color: "#6b7280"
          }}>
            <span>Step {currentStep} of {getTotalSteps()}</span>
            <span style={{ fontWeight: "600", color: "var(--text-dark)" }}>
              {getStepTitle()}
            </span>
          </div>
        </div>

        {/* Content */}
        <div style={{
          padding: "clamp(1.5rem, 4vw, 2rem)",
          minHeight: "300px"
        }}>
          {currentStep === 1 && (
            <QuoteStep1PropertyType
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && formData.propertyType === "residential" && (
            <QuoteStep2Residential
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 2 && formData.propertyType === "commercial" && (
            <QuoteStep2Commercial
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 2 && formData.propertyType === "hoa" && (
            <QuoteStep2HOA
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <QuoteStep3Contact
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <QuoteStep4Details
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {currentStep === 5 && (
            <QuoteStep5Review
              formData={formData}
              onSubmit={handleSubmit}
              onBack={handleBack}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}

