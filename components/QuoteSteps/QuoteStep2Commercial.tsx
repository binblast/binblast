"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { QuoteStepNav } from "./QuoteStepNav";

interface QuoteStep2CommercialProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function chipClass(selected: boolean, accent: "green" | "blue" | "danger" = "blue") {
  return `quote-step__chip${selected ? ` quote-step__chip--selected quote-step__chip--${accent}` : ""}`;
}

export function QuoteStep2Commercial({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep2CommercialProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const commercialTypes = [
    "Restaurant",
    "Office Building",
    "Retail Store",
    "Warehouse",
    "Other",
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.commercialType) {
      newErrors.type = "Please select a property type";
    }
    if (!formData.commercialBins || formData.commercialBins < 1) {
      newErrors.bins = "Please enter the number of bins/dumpsters";
    }
    if (!formData.commercialFrequency) {
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
        <h3 className="quote-step__title">Commercial property details</h3>
        <p className="quote-step__subtitle">Help us understand your commercial cleaning needs</p>
      </div>

      <div className="quote-step__fields">
        <div className="quote-step__field">
          <label className="quote-step__label">What type of commercial property?</label>
          <div className="quote-step__chip-grid">
            {commercialTypes.map((type) => (
              <button
                key={type}
                type="button"
                className={chipClass(formData.commercialType === type, "blue")}
                onClick={() => updateFormData({ commercialType: type })}
              >
                {type}
              </button>
            ))}
          </div>
          {errors.type && <p className="quote-step__error">{errors.type}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">How many bins or dumpsters need cleaning?</label>
          <input
            type="number"
            min="1"
            className={`quote-step__input${errors.bins ? " quote-step__input--error" : ""}`}
            value={formData.commercialBins || ""}
            onChange={(e) => updateFormData({ commercialBins: parseInt(e.target.value) || undefined })}
            placeholder="Enter number of bins/dumpsters"
          />
          {errors.bins && <p className="quote-step__error">{errors.bins}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Do you need dumpster pad cleaning?</label>
          <p className="quote-step__hint">
            Dumpster pad cleaning is a high-value sanitation service that includes hot water wash,
            degreasing, and odor control. Helps ensure health department compliance. Additional
            $75/month minimum.
          </p>
          <div className="quote-step__chip-row">
            <button
              type="button"
              className={chipClass(formData.dumpsterPadCleaning === true, "green")}
              style={{ flex: 1 }}
              onClick={() => updateFormData({ dumpsterPadCleaning: true })}
            >
              Yes
            </button>
            <button
              type="button"
              className={chipClass(formData.dumpsterPadCleaning === false, "danger")}
              style={{ flex: 1 }}
              onClick={() => updateFormData({ dumpsterPadCleaning: false })}
            >
              No
            </button>
          </div>
          {formData.dumpsterPadCleaning && (
            <div className="quote-step__callout">
              <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>
                Dumpster Pad Cleaning: +$75/month
              </div>
              <div style={{ fontSize: "0.7rem", marginTop: "0.25rem" }}>
                Includes hot water wash, degreasing, odor control, and compliance protection.
                Minimum total service price: $150/month.
              </div>
            </div>
          )}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">How often do you need cleaning?</label>
          <div className="quote-step__chip-grid">
            {["Weekly", "Bi-weekly", "Monthly", "Custom"].map((freq) => (
              <button
                key={freq}
                type="button"
                className={chipClass(formData.commercialFrequency === freq, "blue")}
                onClick={() => updateFormData({ commercialFrequency: freq })}
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
            value={formData.commercialSpecialRequirements || ""}
            onChange={(e) => updateFormData({ commercialSpecialRequirements: e.target.value })}
            placeholder="Any special instructions or requirements..."
          />
        </div>
      </div>

      <QuoteStepNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
