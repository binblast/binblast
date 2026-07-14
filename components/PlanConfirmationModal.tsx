// components/PlanConfirmationModal.tsx
// Modal that shows plan details, referral credit option, and price breakdown before redirecting to Stripe

"use client";

import React, { useState, useEffect } from "react";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";
import { usePlatformPricing } from "@/hooks/usePlatformPricing";
import { ReferralCodeDisplay } from "@/components/ReferralCodeDisplay";
import { normalizeReferralCode } from "@/lib/referral-code-format";

interface PlanConfirmationModalProps {
  planId: PlanId;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applyCredit: boolean, referralCode?: string, partnerCode?: string) => void;
  userId: string | null;
  availableCredit: number;
  loading?: boolean;
  initialReferralCode?: string; // Referral code from URL (?ref=)
  initialPartnerCode?: string; // Partner code from URL (?partner=)
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
  initialPartnerCode = "",
}: PlanConfirmationModalProps) {
  const [applyCredit, setApplyCredit] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCodeValid, setReferralCodeValid] = useState<boolean | null>(null);
  const [referralDiscount, setReferralDiscount] = useState(0);
  const [validatingCode, setValidatingCode] = useState(false);
  const [referralError, setReferralError] = useState<string | null>(null);
  const [appliedReferralCode, setAppliedReferralCode] = useState("");
  const [isPartnerCode, setIsPartnerCode] = useState(false);
  const [partnerBusinessName, setPartnerBusinessName] = useState("");
  const [partnerSuccessMessage, setPartnerSuccessMessage] = useState("");

  const { plans: platformPlans } = usePlatformPricing();

  console.log("[PlanConfirmationModal] Render:", { planId, isOpen, planExists: !!platformPlans[planId] });

  const plan = platformPlans[planId] || PLAN_CONFIGS[planId];
  if (!plan) {
    console.warn("[PlanConfirmationModal] Plan not found in PLAN_CONFIGS:", planId);
    return null;
  }

  // Reset state when modal opens/closes and auto-validate code from URL
  useEffect(() => {
    if (isOpen) {
      setApplyCredit(availableCredit > 0);

      const autoPartnerCode = initialPartnerCode.trim()
        ? normalizeReferralCode(initialPartnerCode)
        : "";
      const autoReferralCode =
        !autoPartnerCode && initialReferralCode.trim()
          ? normalizeReferralCode(initialReferralCode)
          : "";

      const codeToApply = autoPartnerCode || autoReferralCode;

      if (codeToApply) {
        setReferralCode(codeToApply);
        setAppliedReferralCode("");
        setIsPartnerCode(Boolean(autoPartnerCode));

        (async () => {
          setValidatingCode(true);
          setReferralError(null);

          try {
            if (autoPartnerCode) {
              const response = await fetch("/api/partners/validate-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ partnerCode: autoPartnerCode }),
              });
              const data = await response.json();

              if (data.valid) {
                const matchedCode = normalizeReferralCode(data.matchedCode || autoPartnerCode);
                setReferralCodeValid(true);
                setReferralDiscount(0);
                setReferralError(null);
                setAppliedReferralCode(matchedCode);
                setReferralCode(matchedCode);
                setPartnerBusinessName(data.businessName || "Partner");
                setPartnerSuccessMessage(
                  data.message ||
                    `Partner code applied! Your booking supports ${data.businessName || "this partner"}.`
                );
              } else {
                setReferralCodeValid(false);
                setReferralDiscount(0);
                setReferralError(data.error || "Invalid partner code");
                setAppliedReferralCode("");
                setIsPartnerCode(false);
                setPartnerBusinessName("");
                setPartnerSuccessMessage("");
              }
            } else {
              const response = await fetch("/api/referral/validate-code", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ referralCode: autoReferralCode }),
              });
              const data = await response.json();

              if (data.valid) {
                const matchedCode = normalizeReferralCode(data.matchedCode || autoReferralCode);
                setReferralCodeValid(true);
                setReferralDiscount(data.discountAmount || 10.0);
                setReferralError(null);
                setAppliedReferralCode(matchedCode);
                setReferralCode(matchedCode);
                setIsPartnerCode(false);
                setPartnerBusinessName("");
                setPartnerSuccessMessage("");
              } else {
                setReferralCodeValid(false);
                setReferralDiscount(0);
                setReferralError(data.error || "Invalid referral code");
                setAppliedReferralCode("");
              }
            }
          } catch {
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
        setAppliedReferralCode("");
        setIsPartnerCode(false);
        setPartnerBusinessName("");
        setPartnerSuccessMessage("");
      }
    } else {
      setApplyCredit(false);
      setReferralCode("");
      setReferralCodeValid(null);
      setReferralDiscount(0);
      setReferralError(null);
      setAppliedReferralCode("");
      setIsPartnerCode(false);
      setPartnerBusinessName("");
      setPartnerSuccessMessage("");
    }
  }, [isOpen, availableCredit, initialReferralCode, initialPartnerCode]);

  const handleValidateReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralCodeValid(null);
      setReferralDiscount(0);
      setReferralError(null);
      setIsPartnerCode(false);
      setPartnerBusinessName("");
      setPartnerSuccessMessage("");
      return;
    }

    setValidatingCode(true);
    setReferralError(null);

    const normalizedCode = normalizeReferralCode(referralCode);

    try {
      const referralResponse = await fetch("/api/referral/validate-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ referralCode: normalizedCode }),
      });

      const referralData = await referralResponse.json();

      if (referralData.valid) {
        const matchedCode = normalizeReferralCode(referralData.matchedCode || normalizedCode);
        setReferralCodeValid(true);
        setReferralDiscount(referralData.discountAmount || 10.0);
        setReferralError(null);
        setAppliedReferralCode(matchedCode);
        setReferralCode(matchedCode);
        setIsPartnerCode(false);
        setPartnerBusinessName("");
        setPartnerSuccessMessage("");
        return;
      }

      const partnerResponse = await fetch("/api/partners/validate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerCode: normalizedCode }),
      });
      const partnerData = await partnerResponse.json();

      if (partnerData.valid) {
        const matchedCode = normalizeReferralCode(partnerData.matchedCode || normalizedCode);
        setReferralCodeValid(true);
        setReferralDiscount(0);
        setReferralError(null);
        setAppliedReferralCode(matchedCode);
        setReferralCode(matchedCode);
        setIsPartnerCode(true);
        setPartnerBusinessName(partnerData.businessName || "Partner");
        setPartnerSuccessMessage(
          partnerData.message ||
            `Partner code applied! Your booking supports ${partnerData.businessName || "this partner"}.`
        );
      } else {
        setReferralCodeValid(false);
        setReferralDiscount(0);
        setReferralError(referralData.error || partnerData.error || "Invalid code");
        setAppliedReferralCode("");
        setIsPartnerCode(false);
        setPartnerBusinessName("");
        setPartnerSuccessMessage("");
      }
    } catch {
      setReferralCodeValid(false);
      setReferralDiscount(0);
      setReferralError("Failed to validate code. Please try again.");
      setIsPartnerCode(false);
      setPartnerBusinessName("");
      setPartnerSuccessMessage("");
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

        {/* Referral Code Input - Always show for all users */}
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
                  setIsPartnerCode(false);
                  setPartnerBusinessName("");
                  setPartnerSuccessMessage("");
                }}
                placeholder="Enter referral code (dashes optional)"
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  fontSize: "0.875rem",
                  border: `1px solid ${referralCodeValid === false ? "#ef4444" : referralCodeValid === true ? "#16a34a" : "#bae6fd"}`,
                  borderRadius: "8px",
                  outline: "none",
                  textTransform: "uppercase",
                minHeight: "44px", // Touch-friendly
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
                minHeight: "44px", // Touch-friendly
                whiteSpace: "nowrap",
                }}
              >
                {validatingCode ? "Checking..." : "Apply"}
              </button>
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              Numbers and letters look similar in some codes. Green = number, blue = letter when shown below.
            </p>
            {referralCodeValid === true && appliedReferralCode && (
              <div
                style={{
                  marginTop: "0.75rem",
                  padding: "0.75rem",
                  background: "#ffffff",
                  borderRadius: "8px",
                  border: "1px solid #86efac",
                }}
              >
                <div
                  style={{
                    fontSize: "0.8125rem",
                    color: "#16a34a",
                    fontWeight: "600",
                    marginBottom: "0.35rem",
                  }}
                >
                  ✓ {isPartnerCode
                    ? partnerSuccessMessage || `Partner code applied! Your booking supports ${partnerBusinessName}.`
                    : `Referral code applied! You'll get $${referralDiscount.toFixed(2)} off.`}
                </div>
                <ReferralCodeDisplay code={appliedReferralCode} size="md" showLegend grouped />
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
            onClick={() =>
              onConfirm(
                applyCredit,
                referralCodeValid && appliedReferralCode && !isPartnerCode
                  ? appliedReferralCode
                  : undefined,
                isPartnerCode && appliedReferralCode ? appliedReferralCode : undefined
              )
            }
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

