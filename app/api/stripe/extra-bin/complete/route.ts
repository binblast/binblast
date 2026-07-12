import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { processExtraBinPurchase } from "@/lib/extra-bin-purchase";

export const dynamic = "force-dynamic";

async function verifyAuthToken(req: NextRequest): Promise<{ uid: string } | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) return null;

    const { getAdminApp } = await import("@/lib/firebase-admin");
    const adminApp = await getAdminApp();
    const decodedToken = await adminApp.auth().verifyIdToken(idToken);

    return { uid: decodedToken.uid };
  } catch (error) {
    console.error("[Extra Bin Complete API] Token verification error:", error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const authData = await verifyAuthToken(req);
    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sessionId = new URL(req.url).searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 });
    }

    if (
      sessionId.includes("{") ||
      sessionId.includes("}") ||
      (!sessionId.startsWith("cs_") && !sessionId.startsWith("cs_test_"))
    ) {
      return NextResponse.json({ error: "Invalid session ID format" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.type !== "extra_bin") {
      return NextResponse.json({ error: "Not an extra bin checkout session" }, { status: 400 });
    }

    if (session.metadata.userId !== authData.uid) {
      return NextResponse.json({ error: "Session does not belong to this account" }, { status: 403 });
    }

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    const result = await processExtraBinPurchase(session);

    return NextResponse.json({
      success: true,
      quantity: result.quantity,
      totalBins: result.binsCount,
      extraBinsTotal: Math.max(0, result.binsCount - 1),
      amountPaid: (result.amountPaidCents / 100).toFixed(2),
      alreadyProcessed: result.alreadyProcessed,
    });
  } catch (error: unknown) {
    console.error("[Extra Bin Complete API] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to complete extra bin purchase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
