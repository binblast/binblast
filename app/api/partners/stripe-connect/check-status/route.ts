// app/api/partners/stripe-connect/check-status/route.ts

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    const partnerRef = doc(db, "partners", partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerDoc.data();
    const connectedAccountId = partnerData.stripeConnectedAccountId;

    if (!connectedAccountId) {
      return NextResponse.json({
        connected: false,
        status: 'not_connected',
      });
    }

    // Check account status with Stripe
    const account = await stripe.accounts.retrieve(connectedAccountId);
    
    const isEnabled = account.charges_enabled && account.payouts_enabled;
    const detailsSubmitted = account.details_submitted;

    return NextResponse.json({
      connected: true,
      status: isEnabled ? 'active' : detailsSubmitted ? 'pending' : 'incomplete',
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  } catch (err: any) {
    console.error("Error checking Stripe Connect status:", err);
    return NextResponse.json(
      { error: err.message || "Failed to check account status" },
      { status: 500 }
    );
  }
}
