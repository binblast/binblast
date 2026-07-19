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
import { QuoteStepSuccess } from "./QuoteSteps/QuoteStepSuccess";

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
  initialPropertyType?: QuoteFormData["propertyType"];
}

export function CustomQuoteWizard({ isOpen, onClose, initialPropertyType }: CustomQuoteWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<QuoteFormData>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    quoteId: string;
    requiresManualReview: boolean;
  } | null>(null);

  // Load saved progress or apply a deep-link preset when the wizard opens
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setSubmissionResult(null);

    if (initialPropertyType) {
      setFormData({ propertyType: initialPropertyType });
      setCurrentStep(2);
      return;
    }

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
  }, [isOpen, initialPropertyType]);

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

  const handleNavigateToStep = (step: number) => {
    if (step >= 1 && step <= getTotalSteps()) {
      setCurrentStep(step);
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

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit quote");
      }

      localStorage.removeItem("customQuoteProgress");
      setSubmissionResult({
        quoteId: result.quoteId,
        requiresManualReview: Boolean(result.requiresManualReview),
      });
      setIsSubmitting(false);
    } catch (error: any) {
      console.error("Error submitting quote:", error);
      alert(error.message || "Failed to submit quote. Please try again.");
      setIsSubmitting(false);
    }
  };

  const getTotalSteps = () => 5;

  const handleSuccessClose = () => {
    setSubmissionResult(null);
    setFormData({});
    setCurrentStep(1);
    onClose();
  };

  const getStepTitle = () => {
    if (submissionResult) {
      return "You're all set";
    }

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

  const progress = submissionResult ? 100 : (currentStep / getTotalSteps()) * 100;

  return (
    <div
      className="quote-wizard__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="quote-wizard" onClick={(e) => e.stopPropagation()}>
        <div className="quote-wizard__header">
          <div className="quote-wizard__header-top">
            <div className="quote-wizard__badge-wrap">
              <span className="quote-wizard__badge">Custom Quote</span>
              <span className="quote-wizard__step-count">
                {submissionResult ? "Complete" : `Step ${currentStep} of ${getTotalSteps()}`}
              </span>
            </div>
            <button
              type="button"
              className="quote-wizard__close"
              onClick={onClose}
              disabled={isSubmitting}
              aria-label="Close quote request"
            >
              ×
            </button>
          </div>

          <h2 className="quote-wizard__title">Custom Quote Request</h2>

          <div className="quote-wizard__progress-track">
            <div className="quote-wizard__progress-fill" style={{ width: `${progress}%` }} />
          </div>

          <p className="quote-wizard__step-label">{getStepTitle()}</p>
        </div>

        <div className="quote-wizard__body">
          {submissionResult ? (
            <QuoteStepSuccess
              formData={formData}
              quoteId={submissionResult.quoteId}
              requiresManualReview={submissionResult.requiresManualReview}
              onClose={handleSuccessClose}
            />
          ) : null}

          {!submissionResult && currentStep === 1 && (
            <QuoteStep1PropertyType
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
            />
          )}

          {!submissionResult && currentStep === 2 && formData.propertyType === "residential" && (
            <QuoteStep2Residential
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {!submissionResult && currentStep === 2 && formData.propertyType === "commercial" && (
            <QuoteStep2Commercial
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {!submissionResult && currentStep === 2 && formData.propertyType === "hoa" && (
            <QuoteStep2HOA
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {!submissionResult && currentStep === 3 && (
            <QuoteStep3Contact
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {!submissionResult && currentStep === 4 && (
            <QuoteStep4Details
              formData={formData}
              updateFormData={updateFormData}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}

          {!submissionResult && currentStep === 5 && (
            <QuoteStep5Review
              formData={formData}
              updateFormData={updateFormData}
              onSubmit={handleSubmit}
              onBack={handleBack}
              onNavigateToStep={handleNavigateToStep}
              isSubmitting={isSubmitting}
            />
          )}
        </div>
      </div>
    </div>
  );
}
