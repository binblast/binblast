// lib/stripe-coupons.ts
// Utility for managing reusable Stripe coupons for referral credits
// Server-side only - imports Stripe instance directly

import { stripe } from "./stripe";

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
 * Apply referral discount to an upcoming invoice based on referrals in billing period
 * This gives $10 off per referral per month
 * Uses invoice items so discount is recalculated each billing cycle
 */
export async function applyReferralDiscountToUpcomingInvoice(
  invoiceId: string,
  subscriptionId: string,
  referralCount: number
): Promise<void> {
  try {
    const discountAmount = referralCount * 1000; // $10 per referral in cents
    
    if (discountAmount > 0) {
      // Get invoice to add discount line item
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const customerId = typeof invoice.customer === 'string' 
        ? invoice.customer 
        : invoice.customer?.id;
      
      if (!customerId) {
        throw new Error("Customer ID not found on invoice");
      }
      
      // Check if discount invoice item already exists
      const existingDiscountItem = invoice.lines.data.find(
        (item) => item.metadata?.type === "referral_period_discount"
      );
      
      if (existingDiscountItem) {
        // Update existing discount item
        await stripe.invoiceItems.update(existingDiscountItem.id, {
          amount: -discountAmount,
          description: `Referral Discount (${referralCount} referral${referralCount > 1 ? 's' : ''})`,
          metadata: {
            type: "referral_period_discount",
            referralCount: referralCount.toString(),
          },
        });
        
        console.log("[Stripe Coupons] Updated referral discount on invoice:", {
          invoiceId,
          subscriptionId,
          referralCount,
          discountAmount: discountAmount / 100,
        });
      } else {
        // Create new discount invoice item
        await stripe.invoiceItems.create({
          customer: customerId,
          invoice: invoiceId,
          amount: -discountAmount, // Negative amount = discount
          currency: "usd",
          description: `Referral Discount (${referralCount} referral${referralCount > 1 ? 's' : ''})`,
          metadata: {
            type: "referral_period_discount",
            referralCount: referralCount.toString(),
            subscriptionId,
          },
        });
        
        console.log("[Stripe Coupons] Added referral discount to invoice:", {
          invoiceId,
          subscriptionId,
          referralCount,
          discountAmount: discountAmount / 100,
        });
      }
    } else {
      // No referrals - remove any existing discount items from invoice
      const invoice = await stripe.invoices.retrieve(invoiceId);
      const discountItems = invoice.lines.data.filter(
        (item) => item.metadata?.type === "referral_period_discount"
      );
      
      for (const item of discountItems) {
        await stripe.invoiceItems.del(item.id);
      }
      
      if (discountItems.length > 0) {
        console.log("[Stripe Coupons] Removed referral discount items (no referrals this period):", {
          invoiceId,
          subscriptionId,
          removedItems: discountItems.length,
        });
      }
    }
  } catch (error: any) {
    console.error("[Stripe Coupons] Error applying referral discount to invoice:", error);
    throw error;
  }
}

/**
 * Clear the coupon cache (useful for testing or if coupon is deleted)
 */
export function clearCouponCache(): void {
  couponCache = null;
}

