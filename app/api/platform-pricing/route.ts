import { NextResponse } from "next/server";
import { getPlatformPlanConfigs } from "@/lib/platform-pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await getPlatformPlanConfigs();

    return NextResponse.json({
      success: true,
      plans,
    });
  } catch (error: unknown) {
    console.error("[Platform Pricing GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load platform pricing";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
