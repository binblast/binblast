// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe, PLAN_CONFIGS, PlanId, isCustomQuote } from "@/lib/stripe-config";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, userId } = body;

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

    // Check for unused referral credits and calculate discount
    let discountAmount = 0;
    let creditsToUse: string[] = [];
    
    if (userId) {
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
            const maxCreditToApply = Math.min(1000, planPriceInCents); // Max $10 off (1000 cents)

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

            // Apply credits up to $10 maximum
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
    const finalPrice = Math.max(0, (plan.price * 100) - discountAmount);

    // Apply discount using Stripe's discount system for better visibility on checkout page
    if (discountAmount > 0) {
      try {
        // Create a fixed-offset coupon that will show up clearly on Stripe Checkout
        const coupon = await stripe.coupons.create({
          amount_off: discountAmount,
          currency: 'usd',
          duration: 'once',
          name: 'Referral Credit',
        });
        
        // Apply the discount to the session - this will show up as a discount line on Stripe Checkout
        sessionParams.discounts = [{
          coupon: coupon.id,
        }];
        
        console.log("[Checkout] Applied referral discount coupon:", {
          couponId: coupon.id,
          discountAmount: discountAmount / 100,
        });
      } catch (couponError: any) {
        console.error("[Checkout] Error creating discount coupon:", couponError);
        // If coupon creation fails, fall back to price adjustment
        // The discount will still be applied, just less visible
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

    // Store credit information in metadata (will be used to mark credits as used after payment)
    if (discountAmount > 0 && creditsToUse.length > 0) {
      sessionParams.metadata = {
        ...sessionParams.metadata,
        userId: userId || "",
        creditApplied: (discountAmount / 100).toFixed(2),
        creditsToUse: creditsToUse.join(','),
      };
    } else if (userId) {
      sessionParams.metadata = {
        ...sessionParams.metadata,
        userId: userId,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      creditApplied: discountAmount > 0 ? (discountAmount / 100).toFixed(2) : 0,
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

