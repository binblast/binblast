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

/**
 * Get expected number of cleanings per month for a plan
 */
export function getCleaningsPerMonth(planId: PlanId): number {
  switch (planId) {
    case "one-time":
      return 1; // 1 cleaning per month
    case "twice-month":
      return 2; // 2 cleanings per month
    case "bi-monthly":
      return 0.5; // 6 cleanings per year = 0.5 per month
    case "quarterly":
      return 1/3; // 4 cleanings per year = 1/3 per month
    default:
      return 0;
  }
}

/**
 * Calculate cleaning credits rollover
 * @param currentPlanId - Current plan ID
 * @param billingPeriodStart - Start of current billing period
 * @param billingPeriodEnd - End of current billing period
 * @param cleaningsUsed - Number of cleanings actually used in this period
 * @returns Number of cleaning credits to roll over
 */
export function calculateCleaningRollover(
  currentPlanId: PlanId,
  billingPeriodStart: Date,
  billingPeriodEnd: Date,
  cleaningsUsed: number
): number {
  const cleaningsPerMonth = getCleaningsPerMonth(currentPlanId);
  if (cleaningsPerMonth === 0) return 0;

  // Calculate total days in billing period
  const totalDays = Math.ceil(
    (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  // Calculate expected cleanings based on plan frequency
  let expectedCleanings = 0;
  
  if (currentPlanId === "bi-monthly") {
    // 6 cleanings per year = 1 every 2 months
    // Calculate how many cleanings should have occurred in this period
    const monthsInPeriod = totalDays / 30;
    expectedCleanings = Math.floor(monthsInPeriod / 2) * 1; // 1 cleaning per 2 months
  } else if (currentPlanId === "quarterly") {
    // 4 cleanings per year = 1 every 3 months
    const monthsInPeriod = totalDays / 30;
    expectedCleanings = Math.floor(monthsInPeriod / 3) * 1; // 1 cleaning per 3 months
  } else {
    // Monthly or bi-weekly: calculate based on monthly rate
    const monthsInPeriod = totalDays / 30;
    expectedCleanings = Math.floor(cleaningsPerMonth * monthsInPeriod);
  }

  // Rollover = expected - used (minimum 0)
  const rollover = Math.max(0, expectedCleanings - cleaningsUsed);
  
  return Math.floor(rollover); // Return whole number of cleanings
}

