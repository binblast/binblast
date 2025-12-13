// app/api/stripe/extra-bin/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";

export const dynamic = 'force-dynamic';

const EXTRA_BIN_PRICE = 1000; // $10.00 in cents

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, quantity } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (!quantity || quantity < 1) {
      return NextResponse.json(
        { error: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    const successUrl = `${origin}/dashboard?extra_bin=success&quantity=${quantity}`;
    const cancelUrl = `${origin}/dashboard`;

    // Create Stripe Checkout Session for extra bins
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Extra Bin Cleaning",
              description: `${quantity} additional bin${quantity > 1 ? 's' : ''} cleaning service`,
            },
            unit_amount: EXTRA_BIN_PRICE, // $10.00 per bin
          },
          quantity: quantity,
        },
      ],
      metadata: {
        userId,
        type: 'extra_bin',
        quantity: quantity.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      totalAmount: (EXTRA_BIN_PRICE * quantity / 100).toFixed(2),
    });
  } catch (err: any) {
    console.error("Extra bin checkout error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

