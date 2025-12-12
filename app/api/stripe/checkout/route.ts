// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { PLAN_CONFIGS, PlanId, isCustomQuote } from "@/lib/stripe-config";
import { stripe } from "@/lib/stripe";
import { getReferralCouponId } from "@/lib/stripe-coupons";
import type Stripe from "stripe";

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, userId, applyCredit, referralCode } = body; // applyCredit: boolean flag from user, referralCode: string code

    if (!planId) {
      return NextResponse.json(
        { error: "Plan ID is required" },
        { status: 400 }
      );
    }

    const plan = PLAN_CONFIGS[planId as PlanId];
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

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/register?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`;
    const cancelUrl = `${origin}/#pricing`;

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

    // Handle referral code discount (for non-logged-in users)
    let referralCodeDiscount = 0;
    let referralCodeToProcess: string | null = null;
    
    if (referralCode && !userId) {
      // Validate referral code for non-logged-in users
      try {
        const { getDbInstance } = await import("@/lib/firebase");
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        
        const db = await getDbInstance();
        if (db) {
          const usersQuery = query(
            collection(db, "users"),
            where("referralCode", "==", referralCode.trim().toUpperCase())
          );
          const usersSnapshot = await getDocs(usersQuery);
          
          if (!usersSnapshot.empty) {
            referralCodeDiscount = 10.00; // $10 discount
            referralCodeToProcess = referralCode.trim().toUpperCase();
            console.log("[Checkout] Valid referral code provided:", referralCodeToProcess);
          } else {
            console.warn("[Checkout] Invalid referral code:", referralCode);
            return NextResponse.json(
              { error: "Invalid referral code" },
              { status: 400 }
            );
          }
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
        // Dynamically import Firebase to avoid build-time initialization
        const { getDbInstance } = await import("@/lib/firebase");
        const { collection, query, where, getDocs } = await import("firebase/firestore");
        
        const db = await getDbInstance();
        if (db) {
          // Get unused credits for this user
          const creditsQuery = query(
            collection(db, "credits"),
            where("userId", "==", userId),
            where("used", "==", false)
          );
          const creditsSnapshot = await getDocs(creditsQuery);

          if (!creditsSnapshot.empty) {
            const planPriceInCents = plan.price * 100;
            const maxCreditToApply = Math.min(1000, planPriceInCents); // Max $10 off (1000 cents), capped at plan price

            // Sort credits by creation date (oldest first) in memory
            const creditsArray = creditsSnapshot.docs.map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                amount: data.amount || 0,
                createdAt: data.createdAt,
              };
            }).sort((a, b) => {
              const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
              const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
              return aTime - bTime;
            });

            let remainingAmount = planPriceInCents;

            // Apply credits up to $10 maximum, but never more than the plan price
            for (const creditData of creditsArray) {
              if (remainingAmount <= 0 || discountAmount >= maxCreditToApply) break;

              const creditAmount = Math.min((creditData.amount || 0) * 100, remainingAmount); // Convert to cents

              if (creditAmount > 0 && discountAmount + creditAmount <= maxCreditToApply) {
                // Reserve credit (don't mark as used yet - will be marked when payment succeeds)
                creditsToUse.push(creditData.id);
                discountAmount += creditAmount;
                remainingAmount -= creditAmount;
              }
            }
          }
        }
      } catch (creditError) {
        console.error("[Checkout] Error checking credits:", creditError);
        // Continue with checkout even if credit check fails
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

    // Store credit information and referral code in metadata (will be used after payment)
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

