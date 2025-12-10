// lib/stripe-coupons.ts
// Utility for managing reusable Stripe coupons for referral credits

import { stripe } from "./stripe-config";

const REFERRAL_COUPON_ID = "REFERRAL_10_OFF";

let couponCache: string | null = null;

/**
 * Get or create the reusable referral credit coupon
 * This coupon is $10 off, one-time use, fixed amount
 */
export async function getReferralCouponId(): Promise<string | null> {
  // Return cached coupon ID if available
  if (couponCache) {
    return couponCache;
  }

  try {
    // Try to retrieve existing coupon
    try {
      const coupon = await stripe.coupons.retrieve(REFERRAL_COUPON_ID);
      if (coupon && !coupon.deleted) {
        couponCache = coupon.id;
        return coupon.id;
      }
    } catch (retrieveError: any) {
      // Coupon doesn't exist, create it
      if (retrieveError.code === "resource_missing") {
        console.log("[Stripe Coupons] Creating reusable referral coupon...");
      } else {
        throw retrieveError;
      }
    }

    // Create the coupon if it doesn't exist
    const coupon = await stripe.coupons.create({
      id: REFERRAL_COUPON_ID, // Use fixed ID for reusability
      amount_off: 1000, // $10.00 in cents
      currency: "usd",
      duration: "once", // One-time discount (applies to first invoice for subscriptions)
      name: "Referral Credit",
      metadata: {
        type: "referral_credit",
        reusable: "true",
      },
    });

    couponCache = coupon.id;
    console.log("[Stripe Coupons] Created reusable referral coupon:", coupon.id);
    return coupon.id;
  } catch (error: any) {
    console.error("[Stripe Coupons] Error getting referral coupon:", error);
    // Return null if coupon creation fails - checkout can proceed without discount
    return null;
  }
}

/**
 * Clear the coupon cache (useful for testing or if coupon is deleted)
 */
export function clearCouponCache(): void {
  couponCache = null;
}

