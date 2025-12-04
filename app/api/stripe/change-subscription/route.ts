// app/api/stripe/change-subscription/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe, PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";
import { getMonthlyPriceForPlan } from "@/lib/subscription-utils";
import { getDbInstance } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";
import Stripe from "stripe";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, newPlanId, currentSubscriptionId } = body;

    if (!userId || !newPlanId) {
      return NextResponse.json(
        { error: "userId and newPlanId are required" },
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

    // Get user data from Firestore
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }
    const userDocRef = doc(collection(db, "users"), userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const userData = userDoc.data();
    const currentPlanId = userData?.selectedPlan as PlanId | undefined;
    const stripeCustomerId = userData?.stripeCustomerId as string | undefined;
    const actualSubscriptionId = currentSubscriptionId || userData?.stripeSubscriptionId as string | undefined;

    // Handle one-time to subscription conversion
    if (!actualSubscriptionId && currentPlanId === "one-time" && stripeCustomerId) {
      // Create a new subscription from one-time payment
      const newMonthlyPrice = getMonthlyPriceForPlan(newPlanId as PlanId);
      
      // Create price for new plan
      let newPriceId: string;
      if (newPlan.stripePriceId) {
        newPriceId = newPlan.stripePriceId;
      } else {
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

      // Create new subscription
      const newSubscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: newPriceId }],
        metadata: {
          planId: newPlanId,
          convertedFromOneTime: "true",
        },
        proration_behavior: "none", // No proration for new subscription
      });

      // Update Firestore
      await updateDoc(userDocRef, {
        selectedPlan: newPlanId,
        stripeSubscriptionId: newSubscription.id,
        subscriptionStatus: "active",
        updatedAt: new Date(),
      });

      return NextResponse.json({
        success: true,
        subscriptionId: newSubscription.id,
        proration: {
          daysRemaining: 0,
          totalDays: 0,
          proratedCredit: 0,
          proratedAmountOwed: 0,
          isUpgrade: true,
          convertedFromOneTime: true,
        },
      });
    }

    // Handle regular subscription change
    if (!actualSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription found. Cannot change plan." },
        { status: 400 }
      );
    }

    // Get current subscription from Stripe
    const subscriptionResponse = await stripe.subscriptions.retrieve(actualSubscriptionId, {
      expand: ['items.data.price.product'],
    });

    if (!subscriptionResponse) {
      return NextResponse.json(
        { error: "Current subscription not found" },
        { status: 404 }
      );
    }

    const currentSubscription = subscriptionResponse as Stripe.Subscription;

    // Get current plan ID from subscription metadata or use stored value
    const subscriptionPlanId = currentSubscription.metadata?.planId as PlanId | undefined;
    const finalCurrentPlanId = subscriptionPlanId || (userData?.selectedPlan as PlanId) || "one-time";

    // Calculate billing period
    const billingPeriodStart = new Date((currentSubscription as any).current_period_start * 1000);
    const billingPeriodEnd = new Date((currentSubscription as any).current_period_end * 1000);
    const now = new Date();

    // Get current subscription item
    const subscriptionItem = currentSubscription.items.data[0];
    if (!subscriptionItem) {
      return NextResponse.json(
        { error: "No subscription items found" },
        { status: 400 }
      );
    }

    // Create new price for the new plan first (needed for invoice preview)
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
        unit_amount: newPlan.price * 100, // Convert to cents
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

    // Use Stripe's invoice preview to get the actual prorated amount
    const currentMonthlyPrice = getMonthlyPriceForPlan(finalCurrentPlanId);
    const newMonthlyPrice = getMonthlyPriceForPlan(newPlanId as PlanId);
    const isUpgrade = newMonthlyPrice > currentMonthlyPrice;
    
    let actualProratedAmount = 0;
    
    if (isUpgrade) {
      // Calculate proration using actual Stripe subscription prices
      // Get current price from subscription item
      const currentPriceId = subscriptionItem.price.id;
      const currentPrice = await stripe.prices.retrieve(currentPriceId);
      const newPrice = await stripe.prices.retrieve(newPriceId);
      
      // Calculate proration based on actual Stripe prices
      const currentUnitAmount = currentPrice.unit_amount || 0;
      const newUnitAmount = newPrice.unit_amount || 0;
      
      // Calculate days remaining in billing period
      const daysRemaining = Math.max(
        0,
        Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
      const totalDays = Math.ceil(
        (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      // Calculate proration: (new price - current price) * (days remaining / total days)
      // For monthly subscriptions, divide by days in month
      const daysInPeriod = currentPrice.recurring?.interval === 'year' ? 365 : 
                          currentPrice.recurring?.interval === 'month' ? 30 : totalDays;
      
      const proratedAmount = Math.round(
        ((newUnitAmount - currentUnitAmount) * daysRemaining) / daysInPeriod
      );
      
      actualProratedAmount = Math.max(0, proratedAmount);
      
      console.log("[Change Subscription] Stripe price-based proration:", {
        currentUnitAmount,
        newUnitAmount,
        daysRemaining,
        daysInPeriod,
        proratedAmount,
        actualProratedAmount,
      });
    }

    const daysRemaining = Math.max(
      0,
      Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalDays = Math.ceil(
      (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dailyRateCurrent = currentMonthlyPrice / totalDays;
    const proratedCredit = dailyRateCurrent * daysRemaining;

    console.log("[Change Subscription] Proration calculation:", {
      currentMonthlyPrice,
      newMonthlyPrice,
      isUpgrade,
      daysRemaining,
      totalDays,
      proratedCredit,
      actualProratedAmountFromStripe: actualProratedAmount,
      stripeCustomerId: !!stripeCustomerId,
    });

    // If this is an upgrade with a prorated amount, require payment first
    if (isUpgrade && actualProratedAmount > 0) {
      if (!stripeCustomerId) {
        return NextResponse.json(
          { error: "Stripe customer ID not found. Cannot process payment." },
          { status: 400 }
        );
      }

      const origin = req.headers.get("origin") || "http://localhost:3000";
      const successUrl = `${origin}/dashboard?subscription_change=success&payment_intent={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${origin}/dashboard?subscription_change=cancelled`;

      console.log("[Change Subscription] Creating checkout session for prorated amount:", actualProratedAmount / 100);

      // Create Checkout Session for the prorated amount
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer: stripeCustomerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `Upgrade to ${newPlan.name}`,
                description: `Prorated charge for upgrading from ${PLAN_CONFIGS[finalCurrentPlanId]?.name || finalCurrentPlanId} to ${newPlan.name}`,
              },
              unit_amount: actualProratedAmount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId,
          currentPlanId: finalCurrentPlanId,
          newPlanId,
          subscriptionId: actualSubscriptionId,
          type: 'subscription_upgrade_proration',
        },
      });

      console.log("[Change Subscription] Checkout session created:", session.id, session.url);

      return NextResponse.json({
        requiresPayment: true,
        checkoutSessionId: session.id,
        checkoutUrl: session.url,
        proration: {
          daysRemaining,
          totalDays,
          proratedCredit: 0,
          proratedAmountOwed: actualProratedAmount / 100, // Convert back to dollars
          isUpgrade: true,
        },
      });
    }

    console.log("[Change Subscription] No payment required - proceeding with subscription update directly");

    // Update subscription with proration
    const updatedSubscription = await stripe.subscriptions.update(
      actualSubscriptionId,
      {
        items: [
          {
            id: subscriptionItem.id,
            price: newPriceId,
          },
        ],
        proration_behavior: isUpgrade ? "none" : "always_invoice", // No proration if we already collected payment
        metadata: {
          planId: newPlanId,
        },
      }
    );

    // Update Firestore user document
    if (db) {
      const userDocRef = doc(collection(db, "users"), userId);
      await updateDoc(userDocRef, {
        selectedPlan: newPlanId,
        updatedAt: new Date(),
      });
    }

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      proration: {
        daysRemaining,
        totalDays,
        proratedCredit: isUpgrade ? 0 : proratedCredit,
        proratedAmountOwed: 0,
        isUpgrade,
      },
    });
  } catch (err: any) {
    console.error("Stripe subscription change error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to change subscription" },
      { status: 500 }
    );
  }
}

