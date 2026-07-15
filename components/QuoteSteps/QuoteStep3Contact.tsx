"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";
import { QuoteStepNav } from "./QuoteStepNav";

interface QuoteStep3ContactProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
}

function chipClass(selected: boolean) {
  return `quote-step__chip${selected ? " quote-step__chip--selected quote-step__chip--green" : ""}`;
}

export function QuoteStep3Contact({
  formData,
  updateFormData,
  onNext,
  onBack,
}: QuoteStep3ContactProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = "Please enter your full name";
    }
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }
    if (!formData.phone || formData.phone.replace(/\D/g, "").length < 10) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.preferredContact) {
      newErrors.preferredContact = "Please select a preferred contact method";
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
        <h3 className="quote-step__title">Contact information</h3>
        <p className="quote-step__subtitle">We&apos;ll use this to send your custom quote</p>
      </div>

      <div className="quote-step__fields">
        <div className="quote-step__field">
          <label className="quote-step__label">Full Name *</label>
          <input
            type="text"
            className={`quote-step__input${errors.name ? " quote-step__input--error" : ""}`}
            value={formData.name || ""}
            onChange={(e) => updateFormData({ name: e.target.value })}
            placeholder="Enter your full name"
          />
          {errors.name && <p className="quote-step__error">{errors.name}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Email Address *</label>
          <input
            type="email"
            className={`quote-step__input${errors.email ? " quote-step__input--error" : ""}`}
            value={formData.email || ""}
            onChange={(e) => updateFormData({ email: e.target.value })}
            placeholder="your.email@example.com"
          />
          {errors.email && <p className="quote-step__error">{errors.email}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Phone Number *</label>
          <input
            type="tel"
            className={`quote-step__input${errors.phone ? " quote-step__input--error" : ""}`}
            value={formData.phone || ""}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            placeholder="(470) 305-0823"
          />
          {errors.phone && <p className="quote-step__error">{errors.phone}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Preferred Contact Method *</label>
          <div className="quote-step__chip-grid">
            {["Email", "Phone", "Text"].map((method) => (
              <button
                key={method}
                type="button"
                className={chipClass(formData.preferredContact === method)}
                onClick={() => updateFormData({ preferredContact: method })}
              >
                {method}
              </button>
            ))}
          </div>
          {errors.preferredContact && <p className="quote-step__error">{errors.preferredContact}</p>}
        </div>

        <div className="quote-step__field">
          <label className="quote-step__label">Best Time to Contact (Optional)</label>
          <select
            className="quote-step__select"
            value={formData.bestTimeToContact || ""}
            onChange={(e) => updateFormData({ bestTimeToContact: e.target.value })}
          >
            <option value="">Select best time</option>
            <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
            <option value="Afternoon (12pm-5pm)">Afternoon (12pm-5pm)</option>
            <option value="Evening (5pm-8pm)">Evening (5pm-8pm)</option>
            <option value="Anytime">Anytime</option>
          </select>
        </div>
      </div>

      <QuoteStepNav onBack={onBack} onNext={handleNext} />
    </div>
  );
}
