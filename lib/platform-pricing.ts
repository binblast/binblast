import { getAdminFirestore } from "@/lib/firebase-admin";
import { PLAN_CONFIGS, PlanConfig, PlanId } from "@/lib/stripe-config";

const PRICING_COLLECTION = "platformSettings";
const PRICING_DOC_ID = "pricing";

export type PlanPricingOverride = {
  price: number;
};

export type PlatformPricingOverrides = Partial<Record<PlanId, PlanPricingOverride>>;

export function getDefaultPlanConfigs(): Record<PlanId, PlanConfig> {
  return { ...PLAN_CONFIGS };
}

export function mergePlanConfigs(
  overrides: PlatformPricingOverrides | null | undefined
): Record<PlanId, PlanConfig> {
  const configs = getDefaultPlanConfigs();

  if (!overrides) {
    return configs;
  }

  for (const planId of Object.keys(overrides) as PlanId[]) {
    const override = overrides[planId];
    if (override && typeof override.price === "number" && configs[planId]) {
      configs[planId] = { ...configs[planId], price: override.price };
    }
  }

  return configs;
}

export async function loadPlatformPricingOverrides(): Promise<PlatformPricingOverrides> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection(PRICING_COLLECTION).doc(PRICING_DOC_ID).get();

    if (!snapshot.exists) {
      return {};
    }

    const data = snapshot.data();
    const plans = data?.plans;

    if (!plans || typeof plans !== "object") {
      return {};
    }

    return plans as PlatformPricingOverrides;
  } catch (error) {
    console.error("[Platform Pricing] Failed to load overrides:", error);
    return {};
  }
}

export async function getPlatformPlanConfigs(): Promise<Record<PlanId, PlanConfig>> {
  const overrides = await loadPlatformPricingOverrides();
  return mergePlanConfigs(overrides);
}

export async function savePlatformPricingOverrides(
  plans: PlatformPricingOverrides,
  updatedBy: string
): Promise<PlatformPricingOverrides> {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const existing = await loadPlatformPricingOverrides();
  const merged = { ...existing, ...plans };

  await db.collection(PRICING_COLLECTION).doc(PRICING_DOC_ID).set(
    {
      plans: merged,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy,
    },
    { merge: true }
  );

  return merged;
}

export const EDITABLE_PRICING_PLANS: Array<{
  id: PlanId;
  label: string;
  priceSuffix: string;
  editable: boolean;
}> = [
  { id: "one-time", label: "Monthly Clean", priceSuffix: "/month", editable: true },
  { id: "twice-month", label: "Bi-Weekly Clean (2x/Month)", priceSuffix: "/month", editable: true },
  { id: "bi-monthly", label: "Bi-Monthly Plan – Yearly Package", priceSuffix: "/year", editable: true },
  { id: "quarterly", label: "Quarterly Plan – Yearly Package", priceSuffix: "/year", editable: true },
  { id: "commercial", label: "Commercial & HOA Plans", priceSuffix: "Custom Quote", editable: false },
];
