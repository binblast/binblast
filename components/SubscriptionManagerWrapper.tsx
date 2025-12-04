// components/SubscriptionManagerWrapper.tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { PlanId } from "@/lib/stripe-config";

interface SubscriptionManagerWrapperProps {
  userId: string;
  currentPlanId: PlanId;
  stripeSubscriptionId: string | null;
  stripeCustomerId?: string | null;
  billingPeriodEnd?: Date;
  onPlanChanged?: () => void;
}

// Use standalone version that doesn't import anything that could trigger Firebase
const SubscriptionManager = dynamic(
  () => import("@/components/SubscriptionManagerStandalone").then((mod) => ({ default: mod.SubscriptionManagerStandalone })),
  { 
    ssr: false,
    loading: () => null,
  }
);

export function SubscriptionManagerWrapper(props: SubscriptionManagerWrapperProps) {
  // No need to wait for Firebase - SubscriptionManagerStandalone doesn't use Firebase
  return <SubscriptionManager {...props} />;
}

