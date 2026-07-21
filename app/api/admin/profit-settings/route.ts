import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";
import {
  loadProfitFirstSettings,
  saveProfitFirstSettings,
} from "@/lib/profit-first-server";
import { mergeProfitFirstSettings } from "@/lib/profit-first-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await loadProfitFirstSettings();
    return NextResponse.json({ success: true, settings, defaults: mergeProfitFirstSettings(null) });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to load profit settings";
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
    const settings = mergeProfitFirstSettings(body.settings || body);
    const saved = await saveProfitFirstSettings(settings, userId || "owner");

    await logAdminAction("update_profit_first_settings", userId || "owner", {
      referralSignupCommissionCents: saved.referralSignupCommissionCents,
      residentialTargetMargin: saved.residentialMargins.targetPercent,
      commercialTargetMargin: saved.commercialMargins.targetPercent,
    });

    return NextResponse.json({ success: true, settings: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to save profit settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
