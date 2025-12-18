// app/api/partners/stripe-connect/login-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthInstance } from "@/lib/firebase";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { stripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getAuthInstance();
    const user = auth?.currentUser;
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    // Find partner by userId or email
    const partnersRef = collection(db, "partners");
    let partnerQuery = query(partnersRef, where("userId", "==", user.uid));
    let partnerSnapshot = await getDocs(partnerQuery);

    if (partnerSnapshot.empty) {
      // Try finding by email as fallback
      partnerQuery = query(partnersRef, where("email", "==", user.email));
      partnerSnapshot = await getDocs(partnerQuery);
    }

    if (partnerSnapshot.empty) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerDoc = partnerSnapshot.docs[0];
    const partnerData = partnerDoc.data();
    const stripeConnectedAccountId = partnerData.stripeConnectedAccountId;

    if (!stripeConnectedAccountId) {
      return NextResponse.json(
        { error: "Stripe account not connected" },
        { status: 400 }
      );
    }

    // Create login link for the connected account
    // Note: redirect_url is not supported in the current Stripe API version
    // Users will be redirected to Stripe's default page after logout
    const loginLink = await stripe.accounts.createLoginLink(stripeConnectedAccountId);

    return NextResponse.json({
      success: true,
      loginUrl: loginLink.url,
    });
  } catch (error: any) {
    console.error("[Stripe Login Link] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create login link" },
      { status: 500 }
    );
  }
}
