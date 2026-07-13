import { NextRequest, NextResponse } from "next/server";
import {
  syncPendingReferralsForReferrer,
  syncReferrerStatsForUser,
} from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");
    const syncPending = new URL(req.url).searchParams.get("syncPending") === "1";

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    let pendingSync = { checked: 0, awarded: 0 };
    if (syncPending) {
      pendingSync = await syncPendingReferralsForReferrer(userId);
    }

    const stats = await syncReferrerStatsForUser(userId);

    return NextResponse.json({
      success: true,
      ...stats,
      pendingChecked: pendingSync.checked,
      pendingAwarded: pendingSync.awarded,
    });
  } catch (err: unknown) {
    console.error("[Referral Stats] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to load referral stats";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
