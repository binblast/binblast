// lib/subscription-utils.ts

import { PLAN_CONFIGS, PlanId } from "./stripe-config";

/**
 * Calculate prorated amount for subscription change
 * @param currentPlanPrice - Current plan's monthly price
 * @param newPlanPrice - New plan's monthly price
 * @param billingPeriodStart - Start of current billing period
 * @param billingPeriodEnd - End of current billing period
 * @returns Object with prorated credit (if downgrading) or amount owed (if upgrading)
 */
export function calculateProration(
  currentPlanPrice: number,
  newPlanPrice: number,
  billingPeriodStart: Date,
  billingPeriodEnd: Date
): {
  daysRemaining: number;
  totalDays: number;
  proratedCredit: number;
  proratedAmountOwed: number;
  isUpgrade: boolean;
} {
  const now = new Date();
  const totalDays = Math.ceil(
    (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const daysRemaining = Math.max(
    0,
    Math.ceil((billingPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Calculate daily rate for current plan
  const dailyRateCurrent = currentPlanPrice / totalDays;
  const proratedCredit = dailyRateCurrent * daysRemaining;

  // Calculate daily rate for new plan
  const dailyRateNew = newPlanPrice / totalDays;
  const proratedAmountNew = dailyRateNew * daysRemaining;

  const isUpgrade = newPlanPrice > currentPlanPrice;
  const proratedAmountOwed = isUpgrade ? proratedAmountNew - proratedCredit : 0;

  return {
    daysRemaining,
    totalDays,
    proratedCredit: isUpgrade ? 0 : proratedCredit,
    proratedAmountOwed,
    isUpgrade,
  };
}

/**
 * Get monthly price for a plan
 * For "Monthly Clean" ($35/month), returns $35
 */
export function getMonthlyPriceForPlan(planId: PlanId): number {
  const plan = PLAN_CONFIGS[planId];
  
  if (!plan) return 0;
  
  // Handle monthly plan
  if (planId === "one-time") {
    return plan.price; // $35/month
  }
  
  // Handle yearly plans - convert to monthly
  if (plan.priceSuffix === "/year") {
    return plan.price / 12;
  }
  
  // Monthly plans
  if (plan.priceSuffix === "/month") {
    return plan.price;
  }
  
  return 0;
}

/**
 * Check if plan can be upgraded/downgraded
 */
export function canChangePlan(planId: PlanId): boolean {
  return planId !== "commercial";
}

