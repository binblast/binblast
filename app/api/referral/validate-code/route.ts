import { NextRequest, NextResponse } from "next/server";
import { REFERRAL_DISCOUNT_AMOUNT, validateReferralCode } from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await validateReferralCode(body.referralCode || "");

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error || "Invalid referral code",
      });
    }

    return NextResponse.json({
      valid: true,
      discountAmount: REFERRAL_DISCOUNT_AMOUNT,
      referrerName: result.referrerName || "Friend",
      matchedCode: result.matchedCode,
      message: `Referral code applied! You'll get $${REFERRAL_DISCOUNT_AMOUNT.toFixed(2)} off your first purchase.`,
    });
  } catch (err: unknown) {
    console.error("[Validate Referral Code] Error:", err);
    const message = err instanceof Error ? err.message : "Failed to validate referral code";
    return NextResponse.json({ error: message, valid: false }, { status: 500 });
  }
}
