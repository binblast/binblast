// components/QuoteSteps/QuoteStep3Contact.tsx
"use client";

import { useState } from "react";
import { QuoteFormData } from "../CustomQuoteWizard";

interface QuoteStep3ContactProps {
  formData: QuoteFormData;
  updateFormData: (data: Partial<QuoteFormData>) => void;
  onNext: () => void;
  onBack: () => void;
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
          Contact information
        </h3>
        <p style={{
          fontSize: "0.875rem",
          color: "#6b7280"
        }}>
          We'll use this to send your custom quote
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {/* Name */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => updateFormData({ name: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.name ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="Enter your full name"
          />
          {errors.name && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Email Address *
          </label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) => updateFormData({ email: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.email ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="your.email@example.com"
          />
          {errors.email && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Phone Number *
          </label>
          <input
            type="tel"
            value={formData.phone || ""}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: `2px solid ${errors.phone ? "#dc2626" : "#e5e7eb"}`,
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
            placeholder="(555) 123-4567"
          />
          {errors.phone && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.phone}
            </p>
          )}
        </div>

        {/* Preferred Contact Method */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Preferred Contact Method *
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: "0.75rem"
          }}>
            {["Email", "Phone", "Text"].map((method) => (
              <button
                key={method}
                onClick={() => updateFormData({ preferredContact: method })}
                style={{
                  padding: "clamp(0.875rem, 2vw, 1rem)",
                  background: formData.preferredContact === method
                    ? "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)"
                    : "#f9fafb",
                  border: `2px solid ${formData.preferredContact === method ? "#16a34a" : "#e5e7eb"}`,
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "clamp(0.875rem, 2vw, 0.95rem)",
                  fontWeight: formData.preferredContact === method ? "600" : "500",
                  color: formData.preferredContact === method ? "#16a34a" : "var(--text-dark)",
                  transition: "all 0.2s ease",
                  minHeight: "44px"
                }}
              >
                {method}
              </button>
            ))}
          </div>
          {errors.preferredContact && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", marginTop: "0.25rem" }}>
              {errors.preferredContact}
            </p>
          )}
        </div>

        {/* Best Time to Contact */}
        <div>
          <label style={{
            display: "block",
            fontSize: "0.875rem",
            fontWeight: "600",
            color: "var(--text-dark)",
            marginBottom: "0.5rem"
          }}>
            Best Time to Contact (Optional)
          </label>
          <select
            value={formData.bestTimeToContact || ""}
            onChange={(e) => updateFormData({ bestTimeToContact: e.target.value })}
            style={{
              width: "100%",
              padding: "clamp(0.75rem, 2vw, 0.875rem) clamp(1rem, 3vw, 1.25rem)",
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              fontSize: "clamp(0.95rem, 2vw, 1rem)",
              minHeight: "44px",
              boxSizing: "border-box"
            }}
          >
            <option value="">Select best time</option>
            <option value="Morning (8am-12pm)">Morning (8am-12pm)</option>
            <option value="Afternoon (12pm-5pm)">Afternoon (12pm-5pm)</option>
            <option value="Evening (5pm-8pm)">Evening (5pm-8pm)</option>
            <option value="Anytime">Anytime</option>
          </select>
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
          style={{
            flex: 1,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: "#f9fafb",
            border: "2px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "600",
            color: "var(--text-dark)",
            cursor: "pointer",
            minHeight: "44px"
          }}
        >
          Back
        </button>
        <button
          onClick={handleNext}
          style={{
            flex: 2,
            padding: "clamp(0.875rem, 2vw, 1rem)",
            background: "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
            border: "none",
            borderRadius: "8px",
            fontSize: "clamp(0.95rem, 2vw, 1rem)",
            fontWeight: "700",
            color: "#ffffff",
            cursor: "pointer",
            minHeight: "44px",
            boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)"
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

