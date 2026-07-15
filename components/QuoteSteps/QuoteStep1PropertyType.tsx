// components/QuoteSteps/QuoteStep1PropertyType.tsx
"use client";

import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep1PropertyTypeProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
}

type PropertyType = NonNullable<QuoteFormData["propertyType"]>;

const PROPERTY_TYPE_OPTIONS: Array<{
  value: PropertyType;
  label: string;
  description: string;
  icon: string;
  accent: "residential" | "commercial" | "hoa";
}> = [
  {
    value: "residential",
    label: "Residential",
    description: "Single-family homes, apartments, or residential properties",
    icon: "🏠",
    accent: "residential",
  },
  {
    value: "commercial",
    label: "Commercial",
    description: "Restaurants, offices, retail stores, and commercial properties",
    icon: "🏢",
    accent: "commercial",
  },
  {
    value: "hoa",
    label: "HOA / Neighborhood",
    description: "Homeowners associations, neighborhoods, and community partnerships",
    icon: "🏘️",
    accent: "hoa",
  },
];

export function QuoteStep1PropertyType({
  formData,
  updateFormData,
  onNext,
}: QuoteStep1PropertyTypeProps) {
  const selectedOption = PROPERTY_TYPE_OPTIONS.find(
    (option) => option.value === formData.propertyType
  );

  const handleSelect = (type: PropertyType) => {
    updateFormData({ propertyType: type });
    setTimeout(() => onNext(), 300);
  };

  const handleDropdownChange = (value: string) => {
    if (!value) return;
    updateFormData({ propertyType: value as PropertyType });
  };

  const handleContinue = () => {
    if (formData.propertyType) {
      onNext();
    }
  };

  return (
    <div className="quote-step1">
      <div className="quote-step1__intro">
        <h3 className="quote-step1__title">What type of property needs cleaning?</h3>
        <p className="quote-step1__subtitle">
          Select the option that best describes your property type
        </p>
      </div>

      {/* Mobile: compact native dropdown */}
      <div className="quote-step1__mobile">
        <label className="quote-step1__label" htmlFor="quote-property-type">
          Property type
        </label>
        <select
          id="quote-property-type"
          className="quote-step1__select"
          value={formData.propertyType || ""}
          onChange={(e) => handleDropdownChange(e.target.value)}
        >
          <option value="" disabled>
            Select property type
          </option>
          {PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {selectedOption && (
          <p className="quote-step1__hint">{selectedOption.description}</p>
        )}

        <button
          type="button"
          className="btn btn-primary quote-step1__continue"
          onClick={handleContinue}
          disabled={!formData.propertyType}
        >
          Continue
        </button>
      </div>

      {/* Desktop: visual cards */}
      <div className="quote-step1__cards" role="group" aria-label="Property type">
        {PROPERTY_TYPE_OPTIONS.map((option) => {
          const isSelected = formData.propertyType === option.value;

          return (
            <button
              key={option.value}
              type="button"
              className={`quote-step1__card quote-step1__card--${option.accent}${
                isSelected ? " quote-step1__card--selected" : ""
              }`}
              onClick={() => handleSelect(option.value)}
            >
              <span className="quote-step1__card-icon" aria-hidden="true">
                {isSelected ? "✓" : option.icon}
              </span>
              <span className="quote-step1__card-copy">
                <span className="quote-step1__card-label">{option.label}</span>
                <span className="quote-step1__card-description">{option.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
