import { NextRequest, NextResponse } from "next/server";
import { syncPendingReferralsForReferrer } from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const referrerId = body.referrerId;

    if (!referrerId) {
      return NextResponse.json({ error: "referrerId is required" }, { status: 400 });
    }

    const result = await syncPendingReferralsForReferrer(referrerId);

    return NextResponse.json({
      success: true,
      checked: result.checked,
      awarded: result.awarded,
    });
  } catch (err: unknown) {
    console.error("[Sync Pending Referrals] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to sync pending referrals";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
