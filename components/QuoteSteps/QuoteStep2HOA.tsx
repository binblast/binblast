"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { QuoteStepNav } from "./QuoteStepNav";

interface QuoteStep2HOAProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function chipClass(selected: boolean, accent: "green" | "purple" | "danger" = "purple") {
  return `quote-step__chip${selected ? ` quote-step__chip--selected quote-step__chip--${accent}` : ""}`;
}

export function QuoteStep2HOA({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep2HOAProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.hoaUnits || formData.hoaUnits < 1) {
      newErrors.units = "Please enter the number of units/homes";
    }
    if (!formData.hoaBins || formData.hoaBins < 1) {
      newErrors.bins = "Please enter the total number of bins";
    }
    if (!formData.hoaFrequency) {
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
        <h3 className="quote-step__title">HOA &amp; Neighborhood details</h3>
        <p className="quote-step__subtitle">Help us understand your community cleaning needs</p>
      </div>

      <div className="quote-step__fields">
        <div className="quote-step__field">
          <label className="quote-step__label">How many units or homes in the community?</label>
          <input
            type="number"
            min="1"
            className={`quote-step__input${errors.units ? " quote-step__input--error" : ""}`}
            value={formData.hoaUnits || ""}
            onChange={(e) => updateFormData({ hoaUnits: parseInt(e.target.value) || undefined })}
            placeholder="Enter number of units/homes"
          />
          {errors.units && <p className="quote-step__error">{errors.units}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Total number of bins in the community?</label>
          <input
            type="number"
            min="1"
            className={`quote-step__input${errors.bins ? " quote-step__input--error" : ""}`}
            value={formData.hoaBins || ""}
            onChange={(e) => updateFormData({ hoaBins: parseInt(e.target.value) || undefined })}
            placeholder="Enter total number of bins"
          />
          {errors.bins && <p className="quote-step__error">{errors.bins}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">How often do you need cleaning?</label>
          <div className="quote-step__chip-grid">
            {["Weekly", "Bi-weekly", "Monthly", "Custom"].map((freq) => (
              <button
                key={freq}
                type="button"
                className={chipClass(formData.hoaFrequency === freq, "purple")}
                onClick={() => updateFormData({ hoaFrequency: freq })}
              >
                {freq}
              </button>
            ))}
          </div>
          {errors.frequency && <p className="quote-step__error">{errors.frequency}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Are you interested in bulk pricing?</label>
          <div className="quote-step__chip-row">
            <button
              type="button"
              className={chipClass(formData.bulkPricing === true, "green")}
              style={{ flex: 1 }}
              onClick={() => updateFormData({ bulkPricing: true })}
            >
              Yes
            </button>
            <button
              type="button"
              className={chipClass(formData.bulkPricing === false, "danger")}
              style={{ flex: 1 }}
              onClick={() => updateFormData({ bulkPricing: false })}
            >
              No
            </button>
          </div>
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Community access requirements (Optional)</label>
          <textarea
            className="quote-step__textarea"
            value={formData.communityAccessRequirements || ""}
            onChange={(e) => updateFormData({ communityAccessRequirements: e.target.value })}
            placeholder="Gate codes, access instructions, or special requirements..."
          />
        </div>
      </div>

      <QuoteStepNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
