import { NextRequest, NextResponse } from "next/server";
import { getUnusedCreditsForUser } from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId = new URL(req.url).searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { credits, totalCredits } = await getUnusedCreditsForUser(userId);

    return NextResponse.json({
      success: true,
      totalCredits,
      credits,
      count: credits.length,
    });
  } catch (err: unknown) {
    console.error("[Get Credits] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to get credits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
