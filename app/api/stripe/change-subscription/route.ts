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

    // Calculate proration preview (for display purposes)
    const currentMonthlyPrice = getMonthlyPriceForPlan(finalCurrentPlanId);
    const newMonthlyPrice = getMonthlyPriceForPlan(newPlanId as PlanId);
    const isUpgrade = newMonthlyPrice > currentMonthlyPrice;
    
    const daysRemaining = Math.max(
      0,
      Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    const totalDays = Math.ceil(
      (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dailyRateCurrent = currentMonthlyPrice / totalDays;
    const proratedCredit = dailyRateCurrent * daysRemaining;
    
    const dailyRateNew = newMonthlyPrice / totalDays;
    const proratedAmountNew = dailyRateNew * daysRemaining;
    
    // Preview calculation (will be replaced with actual Stripe invoice amount)
    const proratedAmountOwedPreview = isUpgrade ? proratedAmountNew - proratedCredit : 0;

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
        proration_behavior: "always_invoice", // Stripe will handle proration automatically
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

    // Get the latest invoice to show the actual prorated amount from Stripe
    const latestInvoice = updatedSubscription.latest_invoice;
    let invoiceDetails = null;
    let actualProratedAmount = 0;
    
    if (typeof latestInvoice === "string") {
      invoiceDetails = await stripe.invoices.retrieve(latestInvoice, {
        expand: ['lines.data.price']
      });
    } else if (latestInvoice) {
      invoiceDetails = latestInvoice;
    }

    // Calculate actual prorated amount from invoice
    if (invoiceDetails) {
      // Find the proration line item (usually has description containing "proration" or "Unused time")
      const prorationLine = invoiceDetails.lines.data.find(line => 
        line.description?.toLowerCase().includes('proration') ||
        line.description?.toLowerCase().includes('unused') ||
        line.proration === true
      );
      
      if (prorationLine) {
        // Proration amount is usually negative (credit) or positive (charge)
        actualProratedAmount = Math.abs(prorationLine.amount || 0);
      } else {
        // If no proration line found, use the total amount due (minus any previous balance)
        actualProratedAmount = Math.max(0, invoiceDetails.amount_due - (invoiceDetails.amount_paid || 0));
      }
    }

    // Use actual Stripe proration amount if available, otherwise use preview
    const proratedAmountOwed = invoiceDetails && actualProratedAmount > 0 
      ? actualProratedAmount 
      : proratedAmountOwedPreview;

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      proration: {
        daysRemaining,
        totalDays,
        proratedCredit: isUpgrade ? 0 : proratedCredit,
        proratedAmountOwed: proratedAmountOwed, // Use actual Stripe amount
        isUpgrade,
      },
      invoice: invoiceDetails ? {
        id: invoiceDetails.id,
        amount_due: invoiceDetails.amount_due,
        amount_paid: invoiceDetails.amount_paid,
        status: invoiceDetails.status,
        subtotal: invoiceDetails.subtotal,
        total: invoiceDetails.total,
      } : null,
    });
  } catch (err: any) {
    console.error("Stripe subscription change error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to change subscription" },
      { status: 500 }
    );
  }
}

