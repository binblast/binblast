"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { QuoteStepNav } from "./QuoteStepNav";

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
    <div className="quote-step">
      <div className="quote-step__intro">
        <h3 className="quote-step__title">Additional details</h3>
        <p className="quote-step__subtitle">Help us prepare your custom quote</p>
      </div>

      <div className="quote-step__fields">
        <div className="quote-step__field">
          <label className="quote-step__label">Service Address *</label>
          <input
            type="text"
            className={`quote-step__input${errors.address ? " quote-step__input--error" : ""}`}
            value={formData.address || ""}
            onChange={(e) => updateFormData({ address: e.target.value })}
            placeholder="Enter full address"
          />
          {errors.address && <p className="quote-step__error">{errors.address}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">When do you need service to start? (Optional)</label>
          <select
            className="quote-step__select"
            value={formData.timeline || ""}
            onChange={(e) => updateFormData({ timeline: e.target.value })}
          >
            <option value="">Select timeline</option>
            <option value="ASAP">ASAP</option>
            <option value="Within 1 week">Within 1 week</option>
            <option value="Within 2 weeks">Within 2 weeks</option>
            <option value="Within 1 month">Within 1 month</option>
            <option value="Just exploring options">Just exploring options</option>
          </select>
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Special Instructions (Optional)</label>
          <textarea
            className="quote-step__textarea"
            value={formData.specialInstructions || ""}
            onChange={(e) => updateFormData({ specialInstructions: e.target.value })}
            placeholder="Any additional information, special requirements, or questions..."
          />
        </div>
      </div>

      <QuoteStepNav onBack={onBack} onNext={handleNext} nextLabel="Review & Submit" />
    </div>
  );
}
