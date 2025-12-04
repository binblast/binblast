// lib/stripe-config.ts

import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-11-17.clover",
  typescript: true,
});

export type PlanId = "one-time" | "twice-month" | "bi-monthly" | "quarterly" | "commercial";

export interface PlanConfig {
  id: PlanId;
  name: string;
  price: number;
  priceSuffix: "/clean" | "/month" | "/year";
  isRecurring: boolean;
  // Stripe Price ID - you'll need to create these in Stripe Dashboard
  // For now, we'll create prices dynamically if not provided
  stripePriceId?: string;
}

export const PLAN_CONFIGS: Record<PlanId, PlanConfig> = {
  "one-time": {
    id: "one-time",
    name: "One-Time Blast",
    price: 35,
    priceSuffix: "/clean",
    isRecurring: false,
  },
  "twice-month": {
    id: "twice-month",
    name: "Bi-Weekly Clean (2x/Month)",
    price: 65,
    priceSuffix: "/month",
    isRecurring: true,
  },
  "bi-monthly": {
    id: "bi-monthly",
    name: "Bi-Monthly Plan – Yearly Package",
    price: 210,
    priceSuffix: "/year",
    isRecurring: true,
  },
  "quarterly": {
    id: "quarterly",
    name: "Quarterly Plan – Yearly Package",
    price: 160,
    priceSuffix: "/year",
    isRecurring: true,
  },
  "commercial": {
    id: "commercial",
    name: "Commercial & HOA Plans",
    price: 0, // Custom quote
    priceSuffix: "/month",
    isRecurring: false,
  },
};

/**
 * Get Stripe Price ID for a plan
 * If not set, we'll create the price dynamically
 */
export function getStripePriceId(planId: PlanId): string | null {
  return PLAN_CONFIGS[planId]?.stripePriceId || null;
}

/**
 * Check if plan requires custom quote (commercial)
 */
export function isCustomQuote(planId: PlanId): boolean {
  return planId === "commercial";
}

