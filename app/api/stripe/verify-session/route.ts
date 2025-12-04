// app/api/stripe/verify-session/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe-config";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Retrieve the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    // Check if payment was successful
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json(
        { error: "Payment not completed" },
        { status: 400 }
      );
    }

    // Extract customer and subscription info
    const customerId = typeof session.customer === 'string' 
      ? session.customer 
      : session.customer?.id || null;
    
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id || null;

    const planId = session.metadata?.planId || null;

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      customerId,
      subscriptionId,
      planId,
      paymentStatus: session.payment_status,
      mode: session.mode,
    });
  } catch (err: any) {
    console.error("Stripe session verification error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify session" },
      { status: 500 }
    );
  }
}

