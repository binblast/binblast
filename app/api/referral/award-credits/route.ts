import { NextRequest, NextResponse } from "next/server";
import {
  awardReferralCreditsForUser,
  processPendingReferralPaymentForUser,
} from "@/lib/referral-service";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.userId;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();
    const userEmail = String(userDoc.data()?.email || "").toLowerCase();

    let result: Awaited<ReturnType<typeof awardReferralCreditsForUser>> = {
      awarded: false,
      creditsAwarded: 0,
    };

    if (userEmail) {
      const pendingResult = await processPendingReferralPaymentForUser(
        userId,
        userEmail
      );
      if (pendingResult.awarded) {
        result = pendingResult;
      }
    }

    if (!result.awarded) {
      result = await awardReferralCreditsForUser(userId);
    }

    if (!result.awarded) {
      return NextResponse.json({
        success: true,
        message: result.alreadyCompleted
          ? "Credits already awarded for this referral"
          : "No pending referrals found",
        creditsAwarded: 0,
      });
    }

    return NextResponse.json({
      success: true,
      referralId: result.referralId,
      creditsAwarded: result.creditsAwarded,
      message: "Credits awarded successfully",
    });
  } catch (err: unknown) {
    console.error("[Award Credits] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to award credits";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
