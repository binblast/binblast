import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { getDbInstance } = await import("@/lib/firebase");
    const { doc, getDoc } = await import("firebase/firestore");

    const body = await req.json();
    const { userId, returnUrl } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Firebase is not configured" }, { status: 500 });
    }

    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const stripeCustomerId = userDoc.data().stripeCustomerId as string | undefined;
    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing account found. Please contact support." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.binblastco.com";
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${appUrl}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("[Billing Portal] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to open billing portal" },
      { status: 500 }
    );
  }
}
