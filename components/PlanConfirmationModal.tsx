// components/PlanConfirmationModal.tsx
// Modal that shows plan details, referral credit option, and price breakdown before redirecting to Stripe

"use client";

import React, { useState, useEffect } from "react";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";

interface PlanConfirmationModalProps {
  planId: PlanId;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (applyCredit: boolean) => void;
  userId: string | null;
  availableCredit: number;
  loading?: boolean;
}

export function PlanConfirmationModal({
  planId,
  isOpen,
  onClose,
  onConfirm,
  userId,
  availableCredit,
  loading = false,
}: PlanConfirmationModalProps) {
  const [applyCredit, setApplyCredit] = useState(false);

  const plan = PLAN_CONFIGS[planId];
  if (!plan) return null;

  // Reset applyCredit when modal opens/closes or credit changes
  useEffect(() => {
    if (isOpen) {
      // Default to applying credit if user has credit available
      setApplyCredit(availableCredit > 0);
    } else {
      setApplyCredit(false);
    }
  }, [isOpen, availableCredit]);

  if (!isOpen) return null;

  const planPrice = plan.price;
  const discountAmount = applyCredit && availableCredit > 0 
    ? Math.min(availableCredit, planPrice) // Cap discount at plan price
    : 0;
  const finalPrice = Math.max(0, planPrice - discountAmount);

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

        {/* Referral Credit Option */}
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
                  Apply ${discountAmount > 0 ? `$${discountAmount.toFixed(2)}` : "up to $10"} off this checkout.
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

          {applyCredit && discountAmount > 0 && (
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
                -${discountAmount.toFixed(2)}
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
            onClick={() => onConfirm(applyCredit)}
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

