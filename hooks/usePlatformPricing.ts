"use client";

import { useEffect, useState } from "react";
import { PLAN_CONFIGS, type PlanConfig, type PlanId } from "@/lib/stripe-config";

export function usePlatformPricing() {
  const [plans, setPlans] = useState<Record<PlanId, PlanConfig>>(PLAN_CONFIGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadPricing() {
      try {
        const response = await fetch("/api/platform-pricing");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load pricing");
        }

        if (mounted && data.plans) {
          setPlans(data.plans);
        }
      } catch (error) {
        console.warn("[usePlatformPricing] Falling back to default pricing:", error);
        if (mounted) {
          setPlans(PLAN_CONFIGS);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadPricing();

    return () => {
      mounted = false;
    };
  }, []);

  return { plans, loading };
}
