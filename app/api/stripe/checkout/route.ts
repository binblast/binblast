// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PlanId, isCustomQuote } from "@/lib/stripe-config";
import { getPlatformPlanConfigs } from "@/lib/platform-pricing";
import { stripe } from "@/lib/stripe";
import { getReferralCouponId } from "@/lib/stripe-coupons";
import {
  REFERRAL_DISCOUNT_AMOUNT,
  getUnusedCreditsForUser,
  hasUserUsedAnotherReferralCode,
  normalizeReferralCode,
  validateReferralCode,
} from "@/lib/referral-service";
import type Stripe from "stripe";

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, userId, applyCredit, referralCode, partnerCode, onboardingData } = body; // onboardingData: customer info collected before checkout

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    const planConfigs = await getPlatformPlanConfigs();
    const plan = planConfigs[planId as PlanId];
    if (!plan) {
      return NextResponse.json(
        { error: "Invalid plan ID" },
        { status: 400 }
      );
    }

    // Handle commercial/custom quote plans
    if (isCustomQuote(planId as PlanId)) {
      return NextResponse.json(
        { error: "Commercial plans require custom quote. Please contact us." },
        { status: 400 }
      );
    }

    if (onboardingData && !userId) {
      return NextResponse.json(
        { error: "Please create your account before checkout." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    // Preserve referral code in success URL if present
    // Note: {CHECKOUT_SESSION_ID} is a Stripe placeholder that gets replaced automatically
    // We need to construct the URL manually to avoid URL-encoding the placeholder
    const successUrlParams: string[] = [];
    successUrlParams.push(`session_id={CHECKOUT_SESSION_ID}`);
    successUrlParams.push(`plan=${encodeURIComponent(planId)}`);
    if (referralCode) {
      successUrlParams.push(`ref=${encodeURIComponent(referralCode)}`);
    }
    const successPath = userId ? "/dashboard" : "/register";
    if (userId) {
      successUrlParams.push("initial_checkout=1");
    }
    const successUrl = `${origin}${successPath}?${successUrlParams.join("&")}`;
    const cancelUrl = referralCode
      ? `${origin}/?ref=${encodeURIComponent(referralCode)}#pricing`
      : `${origin}/#pricing`;

    // Create Stripe Checkout Session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      mode: plan.isRecurring ? "subscription" : "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        planId: planId,
      },
      line_items: [],
    };

    // If onboarding data is provided, add customer info and store in metadata
    if (onboardingData) {
      // Pre-fill customer email in checkout
      sessionParams.customer_email = onboardingData.email;
      
      // customer_creation can only be used in "payment" mode, not "subscription" mode
      // For subscription mode, Stripe will create the customer automatically
      if (!plan.isRecurring) {
        sessionParams.customer_creation = "always";
      }
      
      // Store onboarding data in metadata (JSON stringified)
      sessionParams.metadata = {
        ...sessionParams.metadata,
        onboardingData: JSON.stringify(onboardingData),
        hasOnboardingData: "true",
      };
    }

    // Handle referral code discount (for both logged-in and non-logged-in users)
    let referralCodeDiscount = 0;
    let referralCodeToProcess: string | null = null;
    
    if (referralCode) {
      try {
        const normalizedCode = normalizeReferralCode(referralCode);

        if (userId) {
          const alreadyUsedDifferentCode = await hasUserUsedAnotherReferralCode(userId, normalizedCode);
          if (alreadyUsedDifferentCode) {
            return NextResponse.json(
              { error: "You have already used a referral code" },
              { status: 400 }
            );
          }
        }

        const validation = await validateReferralCode(normalizedCode);
        if (!validation.valid) {
          const partnerMatches =
            typeof partnerCode === "string" &&
            normalizeReferralCode(partnerCode) === normalizedCode;

          if (!partnerMatches) {
            return NextResponse.json(
              { error: validation.error || "Invalid referral code" },
              { status: 400 }
            );
          }

          console.log("[Checkout] Skipping referral discount for partner code:", normalizedCode);
        } else {
          referralCodeDiscount = REFERRAL_DISCOUNT_AMOUNT;
          referralCodeToProcess = validation.matchedCode || normalizedCode;
          console.log("[Checkout] Valid referral code provided:", referralCodeToProcess);
        }
      } catch (referralError) {
        console.error("[Checkout] Error validating referral code:", referralError);
        return NextResponse.json(
          { error: "Failed to validate referral code. Please try again." },
          { status: 500 }
        );
      }
    }

    // Check for unused referral credits and calculate discount (only if user wants to apply credit)
    let discountAmount = 0;
    let creditsToUse: string[] = [];
    
    if (userId && applyCredit === true) {
      try {
        const { credits } = await getUnusedCreditsForUser(userId);

        if (credits.length > 0) {
          const planPriceInCents = plan.price * 100;
          const maxCreditToApply = Math.min(1000, planPriceInCents);

          let remainingAmount = planPriceInCents;

          for (const creditData of credits) {
            if (remainingAmount <= 0 || discountAmount >= maxCreditToApply) break;

            const creditAmount = Math.min((creditData.amount || 0) * 100, remainingAmount);

            if (creditAmount > 0 && discountAmount + creditAmount <= maxCreditToApply) {
              creditsToUse.push(creditData.id);
              discountAmount += creditAmount;
              remainingAmount -= creditAmount;
            }
          }
        }
      } catch (creditError) {
        console.error("[Checkout] Error checking credits:", creditError);
      }
    }

    // Calculate final price after discount (for response, Stripe will calculate actual final price)
    // Combine both referral credit discount and referral code discount
    const totalDiscountAmount = discountAmount + (referralCodeDiscount * 100); // Convert referral code discount to cents
    const finalPrice = Math.max(0, (plan.price * 100) - totalDiscountAmount);

    // Apply discount using reusable Stripe coupon
    // Apply if user has referral credits OR if they provided a valid referral code
    if ((discountAmount > 0 && discountAmount >= 100 && applyCredit === true) || referralCodeDiscount > 0) {
      try {
        // Get or create the reusable referral coupon
        const couponId = await getReferralCouponId();
        
        if (!couponId) {
          console.error("[Checkout] Failed to get referral coupon ID");
          return NextResponse.json(
            { error: "Failed to apply referral discount. Please try again." },
            { status: 500 }
          );
        }
        
        // Apply the reusable coupon to the session
        // Stripe will display this as: "Referral Credit -$10.00" (or whatever the discount amount is)
        sessionParams.discounts = [{
          coupon: couponId,
        }];
        
        console.log("[Checkout] Applied reusable referral discount coupon:", {
          couponId,
          discountAmount: discountAmount / 100,
          planPrice: plan.price,
          finalPrice: (finalPrice / 100).toFixed(2),
        });
      } catch (couponError: any) {
        console.error("[Checkout] Error applying referral coupon:", couponError);
        // If coupon application fails, don't proceed with checkout
        return NextResponse.json(
          { error: "Failed to apply referral discount. Please try again." },
          { status: 500 }
        );
      }
    }

    // Add line item based on plan type (use original price, discount applied via coupon)
    if (plan.isRecurring) {
      // For recurring plans, create or use existing price
      if (plan.stripePriceId) {
        sessionParams.line_items = [
          {
            price: plan.stripePriceId,
            quantity: 1,
          },
        ];
      } else {
        // Create price dynamically if not set
        // For monthly plans
        if (plan.priceSuffix === "/month") {
          sessionParams.line_items = [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: plan.name,
                },
                unit_amount: plan.price * 100, // Original price (discount shown separately via coupon)
                recurring: {
                  interval: "month",
                },
              },
              quantity: 1,
            },
          ];
        }
        // For yearly plans
        else if (plan.priceSuffix === "/year") {
          sessionParams.line_items = [
            {
              price_data: {
                currency: "usd",
                product_data: {
                  name: plan.name,
                },
                unit_amount: plan.price * 100, // Original price (discount shown separately via coupon)
                recurring: {
                  interval: "year",
                },
              },
              quantity: 1,
            },
          ];
        }
      }
    } else {
      // One-time payment
      sessionParams.line_items = [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: plan.name,
            },
            unit_amount: plan.price * 100, // Original price (discount shown separately via coupon)
          },
          quantity: 1,
        },
      ];
    }

    // Handle partner code validation and metadata
    let partnerId: string | null = null;
    let partnerCodeToProcess: string | null = null;
    
    if (partnerCode) {
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        
        const db = await getDbInstance();
        if (db) {
          const normalizedPartnerCode = partnerCode.trim().toUpperCase();
          // Try referralCode first (new format), then partnerCode (legacy)
          const partnersQuery = query(
            collection(db, "partners"),
            where("referralCode", "==", normalizedPartnerCode),
            where("status", "==", "active")
          );
          const partnersSnapshot = await getDocs(partnersQuery);
          
          if (!partnersSnapshot.empty) {
            const partnerDoc = partnersSnapshot.docs[0];
            partnerId = partnerDoc.id;
            partnerCodeToProcess = normalizedPartnerCode;
            console.log("[Checkout] Valid partner code provided:", partnerCodeToProcess);
          } else {
            // Try legacy partnerCode field
            const legacyQuery = query(
              collection(db, "partners"),
              where("partnerCode", "==", normalizedPartnerCode),
              where("status", "==", "active")
            );
            const legacySnapshot = await getDocs(legacyQuery);
            
            if (!legacySnapshot.empty) {
              const partnerDoc = legacySnapshot.docs[0];
              partnerId = partnerDoc.id;
              partnerCodeToProcess = normalizedPartnerCode;
              console.log("[Checkout] Valid partner code provided (legacy):", partnerCodeToProcess);
            } else {
              console.warn("[Checkout] Invalid or inactive partner code:", partnerCode);
              // Don't block checkout if partner code is invalid, just log it
            }
          }
        }
      } catch (partnerError) {
        console.error("[Checkout] Error validating partner code:", partnerError);
        // Don't block checkout if partner validation fails
      }
    }

    // Store credit information, referral code, and partner info in metadata (will be used after payment)
    sessionParams.metadata = {
      ...sessionParams.metadata,
      userId: userId || "",
    };
    
    if (discountAmount > 0 && creditsToUse.length > 0) {
      sessionParams.metadata.creditApplied = (discountAmount / 100).toFixed(2);
      sessionParams.metadata.creditsToUse = creditsToUse.join(',');
    }
    
    if (referralCodeToProcess) {
      sessionParams.metadata.referralCode = referralCodeToProcess;
      sessionParams.metadata.referralCodeDiscount = referralCodeDiscount.toFixed(2);
    }
    
    if (partnerId && partnerCodeToProcess) {
      sessionParams.metadata.partnerId = partnerId;
      sessionParams.metadata.partnerCode = partnerCodeToProcess;
      sessionParams.metadata.source = "partner_link";
    } else {
      sessionParams.metadata.source = "direct";
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      creditApplied: discountAmount > 0 ? (discountAmount / 100).toFixed(2) : 0,
      referralCodeDiscount: referralCodeDiscount > 0 ? referralCodeDiscount.toFixed(2) : 0,
      finalPrice: (finalPrice / 100).toFixed(2),
    });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

