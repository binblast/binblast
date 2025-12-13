// app/api/stripe/complete-subscription-change/route.ts
// This endpoint completes the subscription change after payment is confirmed

import { NextRequest, NextResponse } from "next/server";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";
import { stripe } from "@/lib/stripe";
import { calculateCleaningRollover } from "@/lib/subscription-utils";
import type Stripe from "stripe";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Dynamically import Firebase to prevent build-time initialization
    const { getDbInstance } = await import("@/lib/firebase");
    const { doc, updateDoc, collection } = await import("firebase/firestore");
    
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
    if (!session.metadata ||
        session.metadata.userId !== userId ||
        session.metadata.newPlanId !== newPlanId ||
        session.metadata.subscriptionId !== subscriptionId) {
      return NextResponse.json(
        { error: "Checkout session metadata mismatch or missing" },
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

    // Get cleaning credits rollover from session metadata
    const cleaningCreditsRollover = parseInt(session.metadata?.cleaningCreditsRollover || "0", 10);
    
    // Get user data to calculate current cleaning credits
    const db = await getDbInstance();
    let currentCleaningCredits = 0;
    let finalCleaningCreditsRollover = cleaningCreditsRollover;
    
    if (db) {
      const { getDoc, query, where, getDocs } = await import("firebase/firestore");
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        currentCleaningCredits = userDoc.data()?.cleaningCredits || 0;
      }

      // If cleaning credits weren't in metadata, calculate them now
      if (finalCleaningCreditsRollover === 0 && session.metadata?.currentPlanId && session.metadata?.subscriptionId) {
        try {
          // Get subscription to find billing period
          const subscription = await stripe.subscriptions.retrieve(session.metadata.subscriptionId);
          const billingPeriodStart = new Date(subscription.current_period_start * 1000);
          const billingPeriodEnd = new Date(subscription.current_period_end * 1000);
          
          // Count cleanings used
          const cleaningsQuery = query(
            collection(db, "scheduledCleanings"),
            where("userId", "==", userId)
          );
          const cleaningsSnapshot = await getDocs(cleaningsQuery);
          
          let used = 0;
          cleaningsSnapshot.forEach((doc) => {
            const cleaningData = doc.data();
            const cleaningDate = cleaningData.scheduledDate?.toDate?.() || new Date(cleaningData.scheduledDate);
            const isCompleted = cleaningData.status === "completed" || cleaningData.jobStatus === "completed";
            
            if (isCompleted && cleaningDate >= billingPeriodStart && cleaningDate <= billingPeriodEnd) {
              used++;
            }
          });
          
          finalCleaningCreditsRollover = calculateCleaningRollover(
            session.metadata.currentPlanId as PlanId,
            billingPeriodStart,
            billingPeriodEnd,
            used
          );
        } catch (err) {
          console.error("[Complete Subscription Change] Error calculating cleaning credits:", err);
        }
      }
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

    // Update Firestore user document with cleaning credits rollover
    if (db) {
      const newCleaningCredits = currentCleaningCredits + finalCleaningCreditsRollover;
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        selectedPlan: newPlanId,
        cleaningCredits: newCleaningCredits,
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

