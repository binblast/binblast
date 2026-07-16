import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { buildCleaningAllocation } from "@/lib/cleaning-allocation";
import {
  getExtraCleaningPriceDollars,
  getNextUpcomingCleaning,
  getSchedulingPolicyState,
} from "@/lib/cleaning-scheduling-policy";
import { getUpgradeProrationPreview } from "@/lib/subscription-upgrade-service";
import { PlanId, PLAN_CONFIGS } from "@/lib/stripe-config";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const planId = (userData.selectedPlan as PlanId) || "one-time";
    const cleaningCredits = userData.cleaningCredits || 0;
    const stripeSubscriptionId = userData.stripeSubscriptionId as
      | string
      | undefined;

    let billingPeriodStart = new Date();
    let billingPeriodEnd = new Date();

    billingPeriodStart.setDate(1);
    billingPeriodStart.setHours(0, 0, 0, 0);
    billingPeriodEnd = new Date(
      billingPeriodStart.getFullYear(),
      billingPeriodStart.getMonth() + 1,
      0,
      23,
      59,
      59,
      999
    );

    if (stripeSubscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
      billingPeriodStart = new Date((subscription as any).current_period_start * 1000);
      billingPeriodEnd = new Date((subscription as any).current_period_end * 1000);
    }

    const cleaningsSnapshot = await db
      .collection("scheduledCleanings")
      .where("userId", "==", userId)
      .get();

    const cleanings = cleaningsSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const allocation = buildCleaningAllocation(
      planId,
      billingPeriodStart,
      billingPeriodEnd,
      cleanings,
      cleaningCredits
    );

    const nextUpcomingCleaning = getNextUpcomingCleaning(cleanings);
    const schedulingPolicy = getSchedulingPolicyState(
      nextUpcomingCleaning?.scheduledDate,
      nextUpcomingCleaning?.scheduledTime as string | undefined
    );
    const extraCleaningPrice = getExtraCleaningPriceDollars(planId);

    let upgradePreview = null;
    const canUpgradeToBiWeekly =
      planId === "one-time" &&
      Boolean(stripeSubscriptionId) &&
      schedulingPolicy.canUpgradePlan;

    if (canUpgradeToBiWeekly) {
      try {
        const preview = await getUpgradeProrationPreview(
          userId,
          "twice-month",
          {
            selectedPlan: planId,
            stripeSubscriptionId,
            cleaningCredits,
          },
          cleanings
        );
        upgradePreview = {
          newPlanId: "twice-month",
          newPlanName: PLAN_CONFIGS["twice-month"].name,
          newPlanPrice: PLAN_CONFIGS["twice-month"].price,
          proratedAmount: preview.proratedAmountDollars,
          daysRemaining: preview.daysRemaining,
          cleaningCreditsRollover: preview.cleaningCreditsRollover,
        };
      } catch (previewError) {
        console.error(
          "[Cleaning Schedule Eligibility] Upgrade preview failed:",
          previewError
        );
      }
    }

    return NextResponse.json({
      planId,
      planName: PLAN_CONFIGS[planId]?.name || planId,
      allocation,
      schedulingPolicy,
      nextUpcomingCleaning: nextUpcomingCleaning
        ? {
            id: nextUpcomingCleaning.id,
            scheduledDate: nextUpcomingCleaning.scheduledDate,
            scheduledTime: nextUpcomingCleaning.scheduledTime,
          }
        : null,
      options: allocation.isAtLimit
        ? {
            oneTimeCleaning: {
              price: extraCleaningPrice,
              label: "One-Time Extra Cleaning",
            },
            upgradeToBiWeekly: canUpgradeToBiWeekly ? upgradePreview : null,
            upgradeBlockedReason: !schedulingPolicy.canUpgradePlan
              ? schedulingPolicy.message
              : null,
          }
        : null,
    });
  } catch (error: any) {
    console.error("[Cleaning Schedule Eligibility] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check cleaning eligibility" },
      { status: 500 }
    );
  }
}
