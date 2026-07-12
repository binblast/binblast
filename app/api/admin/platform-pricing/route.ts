import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";
import {
  EDITABLE_PRICING_PLANS,
  getDefaultPlanConfigs,
  getPlatformPlanConfigs,
  loadPlatformPricingOverrides,
  savePlatformPricingOverrides,
  type PlatformPricingOverrides,
} from "@/lib/platform-pricing";
import type { PlanId } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

function sanitizeOverrides(
  input: unknown
): { overrides: PlatformPricingOverrides; error?: string } {
  if (!input || typeof input !== "object") {
    return { overrides: {}, error: "Invalid pricing payload" };
  }

  const plansInput = (input as { plans?: unknown }).plans;
  if (!plansInput || typeof plansInput !== "object") {
    return { overrides: {}, error: "Plans object is required" };
  }

  const overrides: PlatformPricingOverrides = {};
  const defaults = getDefaultPlanConfigs();

  for (const [planId, value] of Object.entries(plansInput)) {
    if (!(planId in defaults)) {
      continue;
    }

    if (planId === "commercial") {
      continue;
    }

    const price = (value as { price?: unknown })?.price;
    if (typeof price !== "number" || !Number.isFinite(price) || price <= 0 || price > 10000) {
      return { overrides: {}, error: `Invalid price for ${planId}` };
    }

    overrides[planId as PlanId] = { price: Math.round(price * 100) / 100 };
  }

  return { overrides };
}

export async function GET() {
  try {
    const plans = await getPlatformPlanConfigs();
    const overrides = await loadPlatformPricingOverrides();

    return NextResponse.json({
      success: true,
      plans,
      overrides,
      editablePlans: EDITABLE_PRICING_PLANS,
    });
  } catch (error: unknown) {
    console.error("[Admin Platform Pricing GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load pricing settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { overrides, error } = sanitizeOverrides(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    if (Object.keys(overrides).length === 0) {
      return NextResponse.json({ error: "No valid plan prices provided" }, { status: 400 });
    }

    const savedOverrides = await savePlatformPricingOverrides(overrides, userId || "owner");
    const plans = await getPlatformPlanConfigs();

    await logAdminAction("update_platform_pricing", userId || "owner", { plans: overrides });

    return NextResponse.json({
      success: true,
      plans,
      overrides: savedOverrides,
      message: "Platform pricing updated. New prices apply to the landing page and new checkouts.",
    });
  } catch (error: unknown) {
    console.error("[Admin Platform Pricing PUT] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to save pricing settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
