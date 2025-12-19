// app/api/partners/stripe-connect/login-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getActivePartner } from "@/lib/partner-auth";
import { stripe } from "@/lib/stripe";

export const dynamic = 'force-dynamic';

/**
 * Verify Firebase ID token from Authorization header
 */
async function verifyAuthToken(req: NextRequest): Promise<string | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
      return null;
    }

    const { getAdminApp } = await import("@/lib/firebase-admin");
    const adminApp = await getAdminApp();
    const adminAuth = adminApp.auth();
    
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken.uid;
  } catch (error) {
    console.error("[Stripe Login Link] Token verification error:", error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication token
    const userId = await verifyAuthToken(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get partner data
    const partner = await getActivePartner(userId);
    if (!partner) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const stripeConnectedAccountId = (partner as any).stripeConnectedAccountId;

    if (!stripeConnectedAccountId) {
      return NextResponse.json(
        { error: "Stripe account not connected" },
        { status: 400 }
      );
    }

    // Create login link for the connected account
    // Note: redirect_url is not supported in the current Stripe API version
    // Users will be redirected to Stripe's default page after logout
    try {
      const loginLink = await stripe.accounts.createLoginLink(stripeConnectedAccountId);
      
      if (!loginLink || !loginLink.url) {
        console.error("[Stripe Login Link] Invalid response from Stripe:", loginLink);
        return NextResponse.json(
          { error: "Invalid response from Stripe", success: false },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        loginUrl: loginLink.url,
      });
    } catch (stripeError: any) {
      console.error("[Stripe Login Link] Stripe API error:", stripeError);
      console.error("[Stripe Login Link] Error details:", {
        type: stripeError.type,
        code: stripeError.code,
        message: stripeError.message,
        statusCode: stripeError.statusCode,
      });
      
      return NextResponse.json(
        { 
          error: stripeError.message || "Failed to create login link",
          success: false,
          details: stripeError.type || "unknown_error"
        },
        { status: stripeError.statusCode || 500 }
      );
    }
  } catch (error: any) {
    console.error("[Stripe Login Link] Unexpected error:", error);
    return NextResponse.json(
      { 
        error: error.message || "Failed to create login link",
        success: false
      },
      { status: 500 }
    );
  }
}
