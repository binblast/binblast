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
      try {
        // Create a new Stripe Connect account
        const account = await stripe.accounts.create({
          type: 'express',
          country: 'US',
          email: partnerData.email,
          capabilities: {
            transfers: { requested: true },
          },
          business_type: partnerData.businessType === 'company' ? 'company' : 'individual',
          business_profile: {
            name: partnerData.businessName || partnerData.businessName || 'Partner Account',
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
      } catch (accountError: any) {
        // If account creation fails, check if it's a Connect not enabled error
        if (accountError.message?.includes("Connect") || accountError.type === "invalid_request_error") {
          throw new Error("Stripe Connect is not enabled. Please enable Stripe Connect in your Stripe Dashboard first.");
        }
        throw accountError;
      }
    }

    // Check if account needs onboarding or update
    const account = await stripe.accounts.retrieve(connectedAccountId);
    const needsOnboarding = !account.details_submitted || !account.charges_enabled || !account.payouts_enabled;
    
    // Create account link for onboarding or update
    const accountLink = await stripe.accountLinks.create({
      account: connectedAccountId,
      refresh_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://binblast.vercel.app'}/partners/dashboard?stripe_connect=refresh`,
      return_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://binblast.vercel.app'}/partners/dashboard?stripe_connect=success`,
      type: needsOnboarding ? 'account_onboarding' : 'account_update',
    });

    return NextResponse.json({
      url: accountLink.url,
      connectedAccountId,
    });
  } catch (err: any) {
    console.error("Error creating Stripe Connect account link:", err);
    
    // Check if Stripe Connect is not enabled
    if (err.message?.includes("Connect") || err.type === "invalid_request_error") {
      return NextResponse.json(
        { 
          error: "Stripe Connect is not enabled on this account. Please enable Stripe Connect in your Stripe Dashboard first.",
          requiresConnectSetup: true,
          stripeConnectDocs: "https://stripe.com/docs/connect"
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: err.message || "Failed to create account link" },
      { status: 500 }
    );
  }
}
