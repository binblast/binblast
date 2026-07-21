import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { calculatePricingFloor } from "@/lib/profit-first-engine";
import { loadProfitFirstSettings } from "@/lib/profit-first-server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const settings = await loadProfitFirstSettings();
    const result = calculatePricingFloor(
      {
        category: body.category === "commercial" ? "commercial" : "residential",
        estimatedDirectCostCents: Number(body.estimatedDirectCostCents || 0),
        targetMarginPercent:
          body.targetMarginPercent != null ? Number(body.targetMarginPercent) : undefined,
      },
      settings
    );

    return NextResponse.json({ success: true, pricingFloor: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to calculate pricing floor";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
