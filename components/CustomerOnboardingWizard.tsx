// components/CustomerOnboardingWizard.tsx
"use client";

import React, { useState } from "react";

interface OnboardingData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  preferredServiceDate: string; // Date they want first cleaning
  preferredTimeWindow: string; // Morning, Afternoon, Evening
  notes: string;
}

interface CustomerOnboardingWizardProps {
  planId: string;
  planName: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: OnboardingData) => void;
}

export function CustomerOnboardingWizard({
  planId,
  planName,
  isOpen,
  onClose,
  onComplete,
}: CustomerOnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zipCode: "",
    preferredServiceDate: "",
    preferredTimeWindow: "Morning",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof OnboardingData, string>>>({});

  if (!isOpen) return null;

  const validateStep = (currentStep: number): boolean => {
    const newErrors: Partial<Record<keyof OnboardingData, string>> = {};

    if (currentStep === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
      if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = "Invalid email address";
      }
      if (!formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!/^[\d\s\-\(\)]+$/.test(formData.phone.replace(/\s/g, ""))) {
        newErrors.phone = "Invalid phone number";
      }
    }

    if (currentStep === 2) {
      if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Address is required";
      if (!formData.city.trim()) newErrors.city = "City is required";
      if (!formData.state.trim()) newErrors.state = "State is required";
      if (!formData.zipCode.trim()) {
        newErrors.zipCode = "ZIP code is required";
      } else if (!/^\d{5}(-\d{4})?$/.test(formData.zipCode)) {
        newErrors.zipCode = "Invalid ZIP code";
      }
    }

    if (currentStep === 3) {
      if (!formData.preferredServiceDate) {
        newErrors.preferredServiceDate = "Please select a preferred service date";
      } else {
        const selectedDate = new Date(formData.preferredServiceDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) {
          newErrors.preferredServiceDate = "Service date must be today or in the future";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      if (step < 4) {
        setStep(step + 1);
      } else {
        onComplete(formData);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "20px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "12px",
          maxWidth: "600px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "24px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>
            Complete Your Order
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              fontSize: "24px",
              color: "#6b7280",
              cursor: "pointer",
              padding: "0",
              width: "32px",
              height: "32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>
        </div>

        {/* Progress Steps */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {["Personal Info", "Address", "Schedule", "Review"].map((label, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === step;
              const isCompleted = stepNum < step;
              return (
                <div key={label} style={{ flex: 1, display: "flex", alignItems: "center" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <div
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: isCompleted
                          ? "#16a34a"
                          : isActive
                          ? "#2563eb"
                          : "#e5e7eb",
                        color: isCompleted || isActive ? "#ffffff" : "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "600",
                        fontSize: "14px",
                      }}
                    >
                      {isCompleted ? "✓" : stepNum}
                    </div>
                    <span
                      style={{
                        marginTop: "8px",
                        fontSize: "12px",
                        color: isActive ? "#2563eb" : "#6b7280",
                        fontWeight: isActive ? "600" : "400",
                        textAlign: "center",
                      }}
                    >
                      {label}
                    </span>
                  </div>
                  {index < 3 && (
                    <div
                      style={{
                        flex: 1,
                        height: "2px",
                        background: isCompleted ? "#16a34a" : "#e5e7eb",
                        margin: "0 8px",
                        marginTop: "-20px",
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "24px" }}>
          {/* Step 1: Personal Information */}
          {step === 1 && (
            <div>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
                Personal Information
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      First Name *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: `1px solid ${errors.firstName ? "#dc2626" : "#d1d5db"}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      Last Name *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: `1px solid ${errors.lastName ? "#dc2626" : "#d1d5db"}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.lastName}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: `1px solid ${errors.email ? "#dc2626" : "#d1d5db"}`,
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="john.doe@example.com"
                  />
                  {errors.email && (
                    <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.email}</p>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: `1px solid ${errors.phone ? "#dc2626" : "#d1d5db"}`,
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="(555) 123-4567"
                  />
                  {errors.phone && (
                    <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.phone}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Address */}
          {step === 2 && (
            <div>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
                Service Address
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: `1px solid ${errors.addressLine1 ? "#dc2626" : "#d1d5db"}`,
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="123 Main Street"
                  />
                  {errors.addressLine1 && (
                    <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.addressLine1}</p>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                    placeholder="Apt, Suite, Unit, etc."
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: `1px solid ${errors.city ? "#dc2626" : "#d1d5db"}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="Atlanta"
                    />
                    {errors.city && (
                      <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      State *
                    </label>
                    <input
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange("state", e.target.value.toUpperCase())}
                      maxLength={2}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: `1px solid ${errors.state ? "#dc2626" : "#d1d5db"}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                        textTransform: "uppercase",
                      }}
                      placeholder="GA"
                    />
                    {errors.state && (
                      <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.state}</p>
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                      ZIP Code *
                    </label>
                    <input
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange("zipCode", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px",
                        border: `1px solid ${errors.zipCode ? "#dc2626" : "#d1d5db"}`,
                        borderRadius: "6px",
                        fontSize: "14px",
                      }}
                      placeholder="30309"
                    />
                    {errors.zipCode && (
                      <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.zipCode}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Schedule Preference */}
          {step === 3 && (
            <div>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
                When would you like your first cleaning?
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Preferred Service Date *
                  </label>
                  <input
                    type="date"
                    value={formData.preferredServiceDate}
                    onChange={(e) => handleInputChange("preferredServiceDate", e.target.value)}
                    min={getMinDate()}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: `1px solid ${errors.preferredServiceDate ? "#dc2626" : "#d1d5db"}`,
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  />
                  {errors.preferredServiceDate && (
                    <p style={{ margin: "4px 0 0 0", color: "#dc2626", fontSize: "12px" }}>{errors.preferredServiceDate}</p>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Preferred Time Window
                  </label>
                  <select
                    value={formData.preferredTimeWindow}
                    onChange={(e) => handleInputChange("preferredTimeWindow", e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                    }}
                  >
                    <option value="Morning">Morning (8 AM - 12 PM)</option>
                    <option value="Afternoon">Afternoon (12 PM - 4 PM)</option>
                    <option value="Evening">Evening (4 PM - 7 PM)</option>
                    <option value="Any">Any Time</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    rows={4}
                    style={{
                      width: "100%",
                      padding: "10px",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      resize: "vertical",
                    }}
                    placeholder="Gate code, bin location, special requests, etc."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div>
              <h3 style={{ margin: "0 0 20px 0", fontSize: "20px", fontWeight: "600", color: "#111827" }}>
                Review Your Information
              </h3>
              <div style={{ background: "#f9fafb", padding: "20px", borderRadius: "8px", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                  Plan Selected
                </h4>
                <p style={{ margin: "0 0 16px 0", fontSize: "14px", color: "#374151" }}>{planName}</p>

                <h4 style={{ margin: "16px 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                  Personal Information
                </h4>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                  {formData.firstName} {formData.lastName}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>{formData.email}</p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>{formData.phone}</p>

                <h4 style={{ margin: "16px 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                  Service Address
                </h4>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                  {formData.addressLine1}
                  {formData.addressLine2 && <>, {formData.addressLine2}</>}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                  {formData.city}, {formData.state} {formData.zipCode}
                </p>

                <h4 style={{ margin: "16px 0 8px 0", fontSize: "16px", fontWeight: "600", color: "#111827" }}>
                  Service Schedule
                </h4>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                  First Cleaning: {formData.preferredServiceDate ? new Date(formData.preferredServiceDate).toLocaleDateString() : "Not selected"}
                </p>
                <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                  Preferred Time: {formData.preferredTimeWindow}
                </p>
                {formData.notes && (
                  <p style={{ margin: "4px 0", fontSize: "14px", color: "#374151" }}>
                    Notes: {formData.notes}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: "24px",
              paddingTop: "24px",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <button
              onClick={step > 1 ? handleBack : onClose}
              style={{
                padding: "10px 20px",
                background: step > 1 ? "#f3f4f6" : "transparent",
                color: "#374151",
                border: step > 1 ? "1px solid #d1d5db" : "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {step > 1 ? "Back" : "Cancel"}
            </button>
            <button
              onClick={handleNext}
              style={{
                padding: "10px 24px",
                background: "#2563eb",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {step < 4 ? "Next" : "Proceed to Payment"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
