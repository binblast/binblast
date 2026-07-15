"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { QuoteStepNav } from "./QuoteStepNav";

interface QuoteStep2ResidentialProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function chipClass(selected: boolean) {
  return `quote-step__chip${selected ? " quote-step__chip--selected quote-step__chip--green" : ""}`;
}

export function QuoteStep2Residential({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep2ResidentialProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.residentialBins || formData.residentialBins < 1) {
      newErrors.bins = "Please enter the number of bins";
    }
    if (!formData.residentialFrequency) {
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
    <div className="quote-step">
      <div className="quote-step__intro">
        <h3 className="quote-step__title">Tell us about your bins</h3>
        <p className="quote-step__subtitle">Help us understand your cleaning needs</p>
      </div>

      <div className="quote-step__fields">
        <div className="quote-step__field">
          <label className="quote-step__label">How many bins need cleaning?</label>
          <input
            type="number"
            min="1"
            className={`quote-step__input${errors.bins ? " quote-step__input--error" : ""}`}
            value={formData.residentialBins || ""}
            onChange={(e) => updateFormData({ residentialBins: parseInt(e.target.value) || undefined })}
            placeholder="Enter number of bins"
          />
          {errors.bins && <p className="quote-step__error">{errors.bins}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">How often do you need cleaning?</label>
          <div className="quote-step__chip-grid">
            {["Monthly", "Bi-weekly", "Weekly"].map((freq) => (
              <button
                key={freq}
                type="button"
                className={chipClass(formData.residentialFrequency === freq)}
                onClick={() => updateFormData({ residentialFrequency: freq })}
              >
                {freq}
              </button>
            ))}
          </div>
          {errors.frequency && <p className="quote-step__error">{errors.frequency}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Any special requirements? (Optional)</label>
          <textarea
            className="quote-step__textarea"
            value={formData.residentialSpecialRequirements || ""}
            onChange={(e) => updateFormData({ residentialSpecialRequirements: e.target.value })}
            placeholder="Any special instructions or requirements..."
          />
        </div>
      </div>

      <QuoteStepNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
