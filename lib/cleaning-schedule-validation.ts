import { getAdminFirestore } from "./firebase-admin";
import { buildCleaningAllocation, canScheduleOnDate, planUsesCalendarMonthLimits } from "./cleaning-allocation";
import {
  canModifyScheduledCleaning,
  canUpgradeWithUpcomingCleaning,
  getNextUpcomingCleaning,
} from "./cleaning-scheduling-policy";
import { PlanId } from "./stripe-config";
import { stripe } from "./stripe";

type ScheduledCleaningRecord = {
  id: string;
  scheduledDate?: unknown;
  scheduledTime?: string;
  status?: string;
  jobStatus?: string;
};

export async function loadUserSchedulingContext(userId: string) {
  const db = await getAdminFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new Error("User not found");
  }

  const userData = userDoc.data() || {};
  const planId = (userData.selectedPlan as PlanId) || "one-time";
  const cleaningCredits = Number(userData.cleaningCredits) || 0;
  const stripeSubscriptionId = userData.stripeSubscriptionId as string | undefined;

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

  const cleanings = cleaningsSnapshot.docs.map((doc: { id: string; data: () => Record<string, unknown> }) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduledCleaningRecord[];

  const allocation = buildCleaningAllocation(
    planId,
    billingPeriodStart,
    billingPeriodEnd,
    cleanings,
    cleaningCredits
  );

  const nextUpcomingCleaning = getNextUpcomingCleaning(cleanings);

  return {
    userData,
    planId,
    cleanings,
    allocation,
    nextUpcomingCleaning,
  };
}

export async function assertCanScheduleAnotherCleaning(
  userId: string,
  scheduledDate?: unknown
) {
  const { allocation, cleanings, planId } = await loadUserSchedulingContext(userId);
  const cleaningCredits = allocation.cleaningCredits;

  if (scheduledDate && planUsesCalendarMonthLimits(planId)) {
    if (!canScheduleOnDate(planId, cleanings, scheduledDate, cleaningCredits)) {
      throw new Error(
        "You have reached your plan limit for this month. Purchase an extra cleaning at full price or upgrade your plan to schedule another visit."
      );
    }
    return;
  }

  if (!allocation.canScheduleAnother) {
    throw new Error(
      "You have reached your plan limit for this month. Purchase an extra cleaning at full price or upgrade your plan to schedule another visit."
    );
  }
}

export async function assertCanModifyCleaning(
  userId: string,
  cleaningId?: string
) {
  const { cleanings, nextUpcomingCleaning } = await loadUserSchedulingContext(userId);
  const target =
    (cleaningId
      ? cleanings.find((cleaning) => cleaning.id === cleaningId)
      : nextUpcomingCleaning) || nextUpcomingCleaning;

  if (!target?.scheduledDate) {
    return;
  }

  if (
    !canModifyScheduledCleaning(target.scheduledDate, target.scheduledTime as string | undefined)
  ) {
    throw new Error(
      "Changes must be made at least 24 hours before your scheduled cleaning time."
    );
  }
}

export async function assertCanUpgradePlan(userId: string) {
  const { nextUpcomingCleaning } = await loadUserSchedulingContext(userId);

  if (
    nextUpcomingCleaning?.scheduledDate &&
    !canUpgradeWithUpcomingCleaning(
      nextUpcomingCleaning.scheduledDate,
      nextUpcomingCleaning.scheduledTime as string | undefined
    )
  ) {
    throw new Error(
      "Plan upgrades cannot be made within 4 hours of your scheduled cleaning."
    );
  }
}
