// app/api/stripe/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe, PLAN_CONFIGS, PlanId, isCustomQuote } from "@/lib/stripe-config";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId } = body;

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

    // Add line item based on plan type
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
                  description: `Bin Blast Co. ${plan.name}`,
                },
                unit_amount: plan.price * 100, // Convert to cents
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
                  description: `Bin Blast Co. ${plan.name}`,
                },
                unit_amount: plan.price * 100, // Convert to cents
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
              description: `Bin Blast Co. ${plan.name}`,
            },
            unit_amount: plan.price * 100, // Convert to cents
          },
          quantity: 1,
        },
      ];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: any) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

