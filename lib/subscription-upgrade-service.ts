import { PlanId } from "@/lib/stripe-config";
import { getPlatformPlanConfigs } from "@/lib/platform-pricing";
import { stripe } from "@/lib/stripe";
import {
  calculateCleaningRollover,
  getMonthlyPriceForPlan,
} from "@/lib/subscription-utils";
import type Stripe from "stripe";

export interface UpgradeProrationPreview {
  currentPlanId: PlanId;
  newPlanId: PlanId;
  isUpgrade: boolean;
  proratedAmountCents: number;
  proratedAmountDollars: number;
  daysRemaining: number;
  totalDays: number;
  cleaningCreditsRollover: number;
  cleaningsUsed: number;
}

export async function getUpgradeProrationPreview(
  userId: string,
  newPlanId: PlanId,
  userData: {
    selectedPlan?: PlanId;
    stripeSubscriptionId?: string;
    cleaningCredits?: number;
  },
  cleanings: Array<{
    scheduledDate?: unknown;
    status?: string;
    jobStatus?: string;
  }>
): Promise<UpgradeProrationPreview> {
  const planConfigs = await getPlatformPlanConfigs();
  const subscriptionId = userData.stripeSubscriptionId;

  if (!subscriptionId) {
    throw new Error("No active subscription found");
  }

  const subscriptionResponse = await stripe.subscriptions.retrieve(
    subscriptionId,
    { expand: ["items.data.price"] }
  );
  const subscription = subscriptionResponse as Stripe.Subscription;
  const subscriptionItem = subscription.items.data[0];

  if (!subscriptionItem) {
    throw new Error("No subscription items found");
  }

  const finalCurrentPlanId =
    (subscription.metadata?.planId as PlanId | undefined) ||
    userData.selectedPlan ||
    "one-time";
  const newPlan = planConfigs[newPlanId];

  if (!newPlan) {
    throw new Error("Invalid plan ID");
  }

  const billingPeriodStart = new Date(
    (subscription as Stripe.Subscription & { current_period_start: number })
      .current_period_start * 1000
  );
  const billingPeriodEnd = new Date(
    (subscription as Stripe.Subscription & { current_period_end: number })
      .current_period_end * 1000
  );
  const now = new Date();

  let newPriceId = newPlan.stripePriceId;
  if (!newPriceId) {
    const priceParams: Stripe.PriceCreateParams = {
      currency: "usd",
      product_data: { name: newPlan.name },
      unit_amount: newPlan.price * 100,
    };

    if (newPlan.isRecurring) {
      if (newPlan.priceSuffix === "/month") {
        priceParams.recurring = { interval: "month" };
      } else if (newPlan.priceSuffix === "/year") {
        priceParams.recurring = { interval: "year" };
      }
    }

    const createdPrice = await stripe.prices.create(priceParams);
    newPriceId = createdPrice.id;
  }

  const currentMonthlyPrice = getMonthlyPriceForPlan(
    finalCurrentPlanId,
    planConfigs
  );
  const newMonthlyPrice = getMonthlyPriceForPlan(newPlanId, planConfigs);
  const isUpgrade = newMonthlyPrice > currentMonthlyPrice;

  const daysRemaining = Math.max(
    0,
    Math.ceil(
      (billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );
  const totalDays = Math.max(
    1,
    Math.ceil(
      (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  let proratedAmountCents = 0;

  if (isUpgrade) {
    const currentPrice = await stripe.prices.retrieve(subscriptionItem.price.id);
    const newPrice = await stripe.prices.retrieve(newPriceId);
    const currentUnitAmount = currentPrice.unit_amount || 0;
    const newUnitAmount = newPrice.unit_amount || 0;
    const daysInPeriod =
      currentPrice.recurring?.interval === "year"
        ? 365
        : currentPrice.recurring?.interval === "month"
          ? 30
          : totalDays;

    proratedAmountCents = Math.max(
      0,
      Math.round(
        ((newUnitAmount - currentUnitAmount) * daysRemaining) / daysInPeriod
      )
    );
  }

  let cleaningsUsed = 0;
  for (const cleaning of cleanings) {
    const status = cleaning.status || cleaning.jobStatus;
    const cleaningDate =
      typeof cleaning.scheduledDate === "string"
        ? new Date(
            cleaning.scheduledDate.includes("T")
              ? cleaning.scheduledDate
              : `${cleaning.scheduledDate}T12:00:00`
          )
        : cleaning.scheduledDate instanceof Date
          ? cleaning.scheduledDate
          : null;

    if (
      status === "completed" &&
      cleaningDate &&
      cleaningDate >= billingPeriodStart &&
      cleaningDate <= billingPeriodEnd
    ) {
      cleaningsUsed++;
    }
  }

  const cleaningCreditsRollover = calculateCleaningRollover(
    finalCurrentPlanId,
    billingPeriodStart,
    billingPeriodEnd,
    cleaningsUsed
  );

  return {
    currentPlanId: finalCurrentPlanId,
    newPlanId,
    isUpgrade,
    proratedAmountCents,
    proratedAmountDollars: proratedAmountCents / 100,
    daysRemaining,
    totalDays,
    cleaningCreditsRollover,
    cleaningsUsed,
  };
}

export async function getDefaultPaymentMethodId(
  stripeCustomerId: string,
  subscriptionId?: string
): Promise<string | null> {
  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const subscriptionPm = subscription.default_payment_method;
    if (typeof subscriptionPm === "string") {
      return subscriptionPm;
    }
    if (subscriptionPm && typeof subscriptionPm === "object") {
      return subscriptionPm.id;
    }
  }

  const customer = (await stripe.customers.retrieve(stripeCustomerId, {
    expand: ["invoice_settings.default_payment_method"],
  })) as Stripe.Customer;

  const defaultPm = customer.invoice_settings?.default_payment_method;
  if (typeof defaultPm === "string") {
    return defaultPm;
  }
  if (defaultPm && typeof defaultPm === "object") {
    return defaultPm.id;
  }

  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: "card",
    limit: 1,
  });

  return paymentMethods.data[0]?.id || null;
}

export async function completeSubscriptionUpgrade(
  userId: string,
  subscriptionId: string,
  newPlanId: PlanId,
  cleaningCreditsRollover: number
) {
  const planConfigs = await getPlatformPlanConfigs();
  const newPlan = planConfigs[newPlanId];

  if (!newPlan) {
    throw new Error("Invalid plan ID");
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const subscriptionItem = subscription.items.data[0];

  if (!subscriptionItem) {
    throw new Error("No subscription items found");
  }

  let newPriceId = newPlan.stripePriceId;
  if (!newPriceId) {
    const priceParams: Stripe.PriceCreateParams = {
      currency: "usd",
      product_data: { name: newPlan.name },
      unit_amount: newPlan.price * 100,
    };

    if (newPlan.isRecurring) {
      if (newPlan.priceSuffix === "/month") {
        priceParams.recurring = { interval: "month" };
      } else if (newPlan.priceSuffix === "/year") {
        priceParams.recurring = { interval: "year" };
      }
    }

    const createdPrice = await stripe.prices.create(priceParams);
    newPriceId = createdPrice.id;
  }

  const updatedSubscription = await stripe.subscriptions.update(
    subscriptionId,
    {
      items: [{ id: subscriptionItem.id, price: newPriceId }],
      proration_behavior: "none",
      metadata: { planId: newPlanId },
    }
  );

  const { getAdminFirestore } = await import("@/lib/firebase-admin");
  const db = await getAdminFirestore();
  const userRef = db.collection("users").doc(userId);
  const userDoc = await userRef.get();
  const currentCleaningCredits = userDoc.data()?.cleaningCredits || 0;
  const admin = await import("firebase-admin");

  await userRef.update({
    selectedPlan: newPlanId,
    cleaningCredits: currentCleaningCredits + cleaningCreditsRollover,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return updatedSubscription;
}
