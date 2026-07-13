import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const ONE_TIME_CLEANING_PRICE = 3500;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const db = await getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const stripeCustomerId = userData.stripeCustomerId as string | undefined;

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No payment profile found. Please contact support." },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/dashboard?one_time_cleaning=success&schedule_cleaning=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/dashboard?one_time_cleaning=cancelled`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer: stripeCustomerId,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "One-Time Extra Bin Cleaning",
              description:
                "Add one additional bin cleaning to your current billing period",
            },
            unit_amount: ONE_TIME_CLEANING_PRICE,
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        type: "one_time_cleaning",
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      totalAmount: (ONE_TIME_CLEANING_PRICE / 100).toFixed(2),
    });
  } catch (error: any) {
    console.error("[One-Time Cleaning Checkout] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
