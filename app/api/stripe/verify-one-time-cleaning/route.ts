import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { processOneTimeCleaningPurchase } from "@/lib/one-time-cleaning-purchase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "sessionId and userId are required" },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.type !== "one_time_cleaning") {
      return NextResponse.json(
        { error: "Invalid checkout session type" },
        { status: 400 }
      );
    }

    if (session.metadata.userId !== userId) {
      return NextResponse.json(
        { error: "Checkout session does not belong to this user" },
        { status: 403 }
      );
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment has not been completed yet" },
        { status: 402 }
      );
    }

    const result = await processOneTimeCleaningPurchase(session);

    return NextResponse.json({
      success: true,
      cleaningCredits: result.cleaningCredits,
      alreadyProcessed: result.alreadyProcessed,
      amountPaid: (result.amountPaidCents / 100).toFixed(2),
    });
  } catch (error: any) {
    console.error("[Verify One-Time Cleaning] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to verify one-time cleaning payment" },
      { status: 500 }
    );
  }
}
