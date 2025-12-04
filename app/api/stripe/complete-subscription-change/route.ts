// app/api/stripe/complete-subscription-change/route.ts
// This endpoint completes the subscription change after payment is confirmed

import { NextRequest, NextResponse } from "next/server";
import { stripe, PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";
import { getDbInstance } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { checkoutSessionId, userId, newPlanId, subscriptionId } = body;

    if (!checkoutSessionId || !userId || !newPlanId || !subscriptionId) {
      return NextResponse.json(
        { error: "checkoutSessionId, userId, newPlanId, and subscriptionId are required" },
        { status: 400 }
      );
    }

    // Verify checkout session was successful
    const session = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: `Payment not completed. Status: ${session.status}, Payment Status: ${session.payment_status}` },
        { status: 400 }
      );
    }

    // Verify metadata matches
    if (session.metadata.userId !== userId ||
        session.metadata.newPlanId !== newPlanId ||
        session.metadata.subscriptionId !== subscriptionId) {
      return NextResponse.json(
        { error: "Checkout session metadata mismatch" },
        { status: 400 }
      );
    }

    const newPlan = PLAN_CONFIGS[newPlanId as PlanId];
    if (!newPlan) {
      return NextResponse.json(
        { error: "Invalid plan ID" },
        { status: 400 }
      );
    }

    // Get current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionItem = currentSubscription.items.data[0];
    
    if (!subscriptionItem) {
      return NextResponse.json(
        { error: "No subscription items found" },
        { status: 400 }
      );
    }

    // Create new price for the new plan
    let newPriceId: string;
    
    if (newPlan.stripePriceId) {
      newPriceId = newPlan.stripePriceId;
    } else {
      // Create price dynamically
      const priceParams: Stripe.PriceCreateParams = {
        currency: "usd",
        product_data: {
          name: newPlan.name,
        },
        unit_amount: newPlan.price * 100,
      };

      if (newPlan.isRecurring) {
        if (newPlan.priceSuffix === "/month") {
          priceParams.recurring = { interval: "month" };
        } else if (newPlan.priceSuffix === "/year") {
          priceParams.recurring = { interval: "year" };
        }
      }

      const newPrice = await stripe.prices.create(priceParams);
      newPriceId = newPrice.id;
    }

    // Update subscription (no proration since we already collected payment)
    const updatedSubscription = await stripe.subscriptions.update(
      subscriptionId,
      {
        items: [
          {
            id: subscriptionItem.id,
            price: newPriceId,
          },
        ],
        proration_behavior: "none", // No proration - payment already collected
        metadata: {
          planId: newPlanId,
        },
      }
    );

    // Update Firestore user document
    const db = await getDbInstance();
    if (db) {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        selectedPlan: newPlanId,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      checkoutSessionId,
    });
  } catch (err: any) {
    console.error("Complete subscription change error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to complete subscription change" },
      { status: 500 }
    );
  }
}

