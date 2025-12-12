// components/PlanConfirmationModal.tsx
// Modal that shows plan details, referral credit option, and price breakdown before redirecting to Stripe

"use client";

import React, { useState, useEffect } from "react";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";

interface PlanConfirmationModalProps {
  planId: PlanId;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applyCredit: boolean, referralCode?: string) => void;
  userId: string | null;
  availableCredit: number;
  loading?: boolean;
  initialReferralCode?: string; // Referral code from URL
}

export function PlanConfirmationModal({
  planId,
  isOpen,
  onClose,
  onConfirm,
  userId,
  availableCredit,
  loading = false,
  initialReferralCode = "",
}: PlanConfirmationModalProps) {
  const [applyCredit, setApplyCredit] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [validatingCode, setValidatingCode] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);

  console.log("[PlanConfirmationModal] Render:", { planId, isOpen, planExists: !!PLAN_CONFIGS[planId] });

  const plan = PLAN_CONFIGS[planId];
  if (!plan) {
    console.warn("[PlanConfirmationModal] Plan not found in PLAN_CONFIGS:", planId);
    return null;
  }

  // Reset state when modal opens/closes and auto-validate referral code from URL
  useEffect(() => {
    if (isOpen) {
      // Default to applying credit if user has credit available
      setApplyCredit(availableCredit > 0);
      
      // If there's a referral code from URL, populate and validate it automatically
      if (initialReferralCode && initialReferralCode.trim()) {
        const normalizedCode = initialReferralCode.trim().toUpperCase();
        setReferralCode(normalizedCode);
        
        // Auto-validate the referral code
        (async () => {
          setValidatingCode(true);
          setReferralError(null);

          try {
            const response = await fetch("/api/referral/validate-code", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ referralCode: normalizedCode }),
            });

            const data = await response.json();

            if (data.valid) {
              setReferralCodeValid(true);
              setReferralDiscount(data.discountAmount || 10.00);
              setReferralError(null);
            } else {
              setReferralCodeValid(false);
              setReferralDiscount(0);
              setReferralError(data.error || "Invalid referral code");
            }
          } catch (err: any) {
            setReferralCodeValid(false);
            setReferralDiscount(0);
            setReferralError("Failed to validate code. Please try again.");
          } finally {
            setValidatingCode(false);
          }
        })();
      } else {
        setReferralCode("");
        setReferralCodeValid(null);
        setReferralDiscount(0);
        setReferralError(null);
      }
    } else {
      setApplyCredit(false);
      setReferralCode("");
      setReferralCodeValid(null);
      setReferralDiscount(0);
      setReferralError(null);
    }
  }, [isOpen, availableCredit, initialReferralCode]);

  // Validate referral code when user enters it
  const handleValidateReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralCodeValid(null);
      setReferralDiscount(0);
      setReferralError(null);
      return;
    }

    setValidatingCode(true);
    setReferralError(null);

    try {
      const response = await fetch("/api/referral/validate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ referralCode: referralCode.trim().toUpperCase() }),
      });

      const data = await response.json();

      if (data.valid) {
        setReferralCodeValid(true);
        setReferralDiscount(data.discountAmount || 10.00);
        setReferralError(null);
      } else {
        setReferralCodeValid(false);
        setReferralDiscount(0);
        setReferralError(data.error || "Invalid referral code");
      }
    } catch (err: any) {
      setReferralCodeValid(false);
      setReferralDiscount(0);
      setReferralError("Failed to validate code. Please try again.");
    } finally {
      setValidatingCode(false);
    }
  };

  if (!isOpen) {
    console.log("[PlanConfirmationModal] Modal not open, returning null");
    return null;
  }
  
  console.log("[PlanConfirmationModal] Modal is open, rendering");

  const planPrice = plan.price;
  const creditDiscount = applyCredit && availableCredit > 0 
    ? Math.min(availableCredit, planPrice) // Cap discount at plan price
    : 0;
  const totalDiscount = creditDiscount + referralDiscount;
  const finalPrice = Math.max(0, planPrice - totalDiscount);

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
        padding: "1rem",
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
          borderRadius: "20px",
          padding: "2rem",
          maxWidth: "500px",
          width: "100%",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{
            fontSize: "1.5rem",
            fontWeight: "700",
            color: "var(--text-dark)",
            marginBottom: "1rem",
          }}
        >
          Confirm Your Plan
        </h2>

        {/* Plan Details */}
        <div
          style={{
            padding: "1.5rem",
            background: "#f9fafb",
            borderRadius: "12px",
            marginBottom: "1.5rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.125rem",
              fontWeight: "600",
              color: "var(--text-dark)",
              marginBottom: "0.5rem",
            }}
          >
            {plan.name}
          </h3>
          <p
            style={{
              fontSize: "0.875rem",
              color: "#6b7280",
              margin: 0,
            }}
          >
            {plan.isRecurring
              ? `Billed ${plan.priceSuffix === "/month" ? "monthly" : "yearly"}`
              : "One-time payment"}
          </p>
        </div>

        {/* Referral Code Input */}
        {!userId && (
          <div
            style={{
              padding: "1rem",
              background: "#f0f9ff",
              borderRadius: "12px",
              marginBottom: "1.5rem",
              border: "1px solid #bae6fd",
            }}
          >
            <label
              htmlFor="referral-code"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "#0369a1",
                marginBottom: "0.5rem",
              }}
            >
              Have a Referral Code?
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                id="referral-code"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  setReferralCodeValid(null);
                  setReferralDiscount(0);
                  setReferralError(null);
                }}
                placeholder="Enter referral code"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  border: `1px solid ${referralCodeValid === false ? "#ef4444" : referralCodeValid === true ? "#16a34a" : "#bae6fd"}`,
                  borderRadius: "8px",
                  outline: "none",
                  textTransform: "uppercase",
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleValidateReferralCode();
                  }
                }}
              />
              <button
                onClick={handleValidateReferralCode}
                disabled={validatingCode || !referralCode.trim()}
                style={{
                  padding: "0.75rem 1.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#ffffff",
                  background: validatingCode || !referralCode.trim() ? "#9ca3af" : "#16a34a",
                  border: "none",
                  borderRadius: "8px",
                  cursor: validatingCode || !referralCode.trim() ? "not-allowed" : "pointer",
                }}
              >
                {validatingCode ? "Checking..." : "Apply"}
              </button>
            </div>
            {referralCodeValid === true && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.8125rem",
                  color: "#16a34a",
                  fontWeight: "600",
                }}
              >
                ✓ Referral code applied! You'll get ${referralDiscount.toFixed(2)} off.
              </div>
            )}
            {referralError && (
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "0.8125rem",
                  color: "#ef4444",
                }}
              >
                {referralError}
              </div>
            )}
          </div>
        )}

        {/* Referral Credit Option (for logged-in users) */}
        {userId && availableCredit > 0 && (
          <div
            style={{
              padding: "1rem",
              background: "#f0f9ff",
              borderRadius: "12px",
              marginBottom: "1.5rem",
              border: "1px solid #bae6fd",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <input
                type="checkbox"
                id="apply-credit"
                checked={applyCredit}
                onChange={(e) => setApplyCredit(e.target.checked)}
                style={{
                  marginTop: "0.125rem",
                  width: "1.25rem",
                  height: "1.25rem",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="apply-credit"
                style={{
                  flex: 1,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "#0369a1",
                    marginBottom: "0.25rem",
                  }}
                >
                  Apply Referral Credit?
                </div>
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#0c4a6e",
                  }}
                >
                  You have ${availableCredit.toFixed(2)} in referral credit available. 
                  Apply ${creditDiscount > 0 ? `$${creditDiscount.toFixed(2)}` : "up to $10"} off this checkout.
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Price Breakdown */}
        <div
          style={{
            padding: "1.5rem",
            background: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: "0.875rem",
                color: "#6b7280",
              }}
            >
              Plan Price
            </span>
            <span
              style={{
                fontSize: "0.875rem",
                fontWeight: "600",
                color: "var(--text-dark)",
              }}
            >
              ${planPrice.toFixed(2)}
              {plan.priceSuffix && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    fontWeight: "400",
                    color: "#6b7280",
                    marginLeft: "0.25rem",
                  }}
                >
                  {plan.priceSuffix}
                </span>
              )}
            </span>
          </div>

          {creditDiscount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid #e5e7eb",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "#16a34a",
                  fontWeight: "600",
                }}
              >
                Referral Credit
              </span>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#16a34a",
                }}
              >
                -${creditDiscount.toFixed(2)}
              </span>
            </div>
          )}
          {referralDiscount > 0 && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                paddingTop: creditDiscount > 0 ? "0" : "0.75rem",
                borderTop: creditDiscount > 0 ? "none" : "1px solid #e5e7eb",
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  color: "#16a34a",
                  fontWeight: "600",
                }}
              >
                Referral Code Discount
              </span>
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  color: "#16a34a",
                }}
              >
                -${referralDiscount.toFixed(2)}
              </span>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: "0.75rem",
              borderTop: "2px solid #e5e7eb",
              marginTop: "0.75rem",
            }}
          >
            <span
              style={{
                fontSize: "1rem",
                fontWeight: "700",
                color: "var(--text-dark)",
              }}
            >
              Total
            </span>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: "700",
                color: "var(--text-dark)",
              }}
            >
              ${finalPrice.toFixed(2)}
              {plan.priceSuffix && plan.isRecurring && (
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "400",
                    color: "#6b7280",
                    marginLeft: "0.25rem",
                  }}
                >
                  {plan.priceSuffix}
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: "1rem",
          }}
        >
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#6b7280",
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(applyCredit, referralCodeValid ? referralCode.trim().toUpperCase() : undefined)}
            disabled={loading}
            style={{
              flex: 1,
              padding: "0.75rem 1.5rem",
              fontSize: "0.875rem",
              fontWeight: "600",
              color: "#ffffff",
              background: loading ? "#9ca3af" : "#16a34a",
              border: "none",
              borderRadius: "8px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Processing..." : "Continue to Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}

