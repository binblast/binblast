// app/api/partners/stripe-connect/create-account-link/route.ts

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

    // Get partner data to check if they already have a connected account
    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

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

    // Check if partner already has a connected account
    let connectedAccountId = partnerData.stripeConnectedAccountId;

    if (!connectedAccountId) {
      // Create a new Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: partnerData.email,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual', // or 'company' based on partner data
        business_profile: {
          name: partnerData.businessName,
          support_email: partnerData.email,
        },
      });

      connectedAccountId = account.id;

      // Save the connected account ID to the partner document
      await updateDoc(partnerRef, {
        stripeConnectedAccountId: connectedAccountId,
        stripeConnectStatus: 'pending',
        updatedAt: serverTimestamp(),
      });
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://binblast.vercel.app'}/partners/dashboard?stripe_connect=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://binblast.vercel.app'}/partners/dashboard?stripe_connect=success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      url: accountLink.url,
      connectedAccountId,
    });
  } catch (err: any) {
    console.error("Error creating Stripe Connect account link:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create account link" },
      { status: 500 }
    );
  }
}
