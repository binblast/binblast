import { NextRequest, NextResponse } from "next/server";
import { processReferralSignup } from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await processReferralSignup({
      referralCode: body.referralCode || "",
      newUserId: body.newUserId || "",
      newUserEmail: body.newUserEmail || "",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to process referral" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      referralId: result.referralId,
      referrerId: result.referrerId,
      alreadyProcessed: result.alreadyProcessed || false,
      message: result.alreadyProcessed
        ? "Referral already linked to this account."
        : "Referral processed successfully.",
    });
  } catch (err: unknown) {
    console.error("Referral processing error:", err);
    const message = err instanceof Error ? err.message : "Failed to process referral";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
