// app/api/stripe/get-subscription/route.ts
import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const subscriptionId = searchParams.get("subscriptionId");

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "subscriptionId is required" },
        { status: 400 }
      );
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return NextResponse.json({
      billingPeriodStart: (subscription as any).current_period_start,
      billingPeriodEnd: (subscription as any).current_period_end,
    });
  } catch (err: any) {
    console.error("Get subscription error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get subscription" },
      { status: 500 }
    );
  }
}

