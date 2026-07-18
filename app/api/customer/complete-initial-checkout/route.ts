import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { generateReadableReferralCode } from "@/lib/referral-code-format";

export const dynamic = "force-dynamic";

/**
 * Links Stripe checkout to an account that was created before payment.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Session ID and user ID are required." },
        { status: 400 }
      );
    }

    if (
      sessionId.includes("{") ||
      (!sessionId.startsWith("cs_") && !sessionId.startsWith("cs_test_"))
    ) {
      return NextResponse.json({ error: "Invalid session ID." }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return NextResponse.json({ error: "Payment not completed." }, { status: 400 });
    }

    if (session.metadata?.userId && session.metadata.userId !== userId) {
      return NextResponse.json({ error: "Checkout session does not match this account." }, { status: 403 });
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User account not found." }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    if (userData.initialCheckoutCompleted && userData.stripeSubscriptionId) {
      return NextResponse.json({ success: true, alreadyCompleted: true });
    }

    const customerId =
      typeof session.customer === "string" ? session.customer : session.customer?.id || null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id || null;
    const planId = session.metadata?.planId || userData.selectedPlan || null;

    let onboardingData: Record<string, unknown> | null = null;
    if (session.metadata?.hasOnboardingData === "true" && session.metadata?.onboardingData) {
      try {
        onboardingData = JSON.parse(session.metadata.onboardingData);
      } catch {
        onboardingData = null;
      }
    }

    const subscriptionStatus = subscriptionId ? "active" : userData.subscriptionStatus || "pending";
    const generatedCode = userData.referralCode || generateReadableReferralCode();

    const updates: Record<string, unknown> = {
      selectedPlan: planId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus,
      paymentStatus: "paid",
      referralCode: generatedCode,
      initialCheckoutCompleted: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (onboardingData) {
      Object.assign(updates, {
        addressLine1: onboardingData.addressLine1 || userData.addressLine1 || null,
        addressLine2: onboardingData.addressLine2 ?? userData.addressLine2 ?? null,
        city: onboardingData.city || userData.city || null,
        state: onboardingData.state || userData.state || null,
        zipCode: onboardingData.zipCode || userData.zipCode || null,
        preferredDayOfWeek: onboardingData.preferredDayOfWeek || userData.preferredDayOfWeek || null,
        phone: onboardingData.phone || userData.phone || null,
      });

      if (onboardingData.preferredServiceDate) {
        updates.pendingCleaningConfirmation = true;
        updates.pendingCleaningData = {
          preferredServiceDate: onboardingData.preferredServiceDate,
          preferredDayOfWeek: onboardingData.preferredDayOfWeek || null,
          preferredTimeWindow: onboardingData.preferredTimeWindow || "8:00 AM - 12:00 PM",
          addressLine1: onboardingData.addressLine1,
          addressLine2: onboardingData.addressLine2 || null,
          city: onboardingData.city,
          state: onboardingData.state,
          zipCode: onboardingData.zipCode,
          notes: onboardingData.notes || null,
        };
      }
    }

    await userRef.set(updates, { merge: true });

    if (!userData.welcomeEmailSent) {
      try {
        const { notifyCustomerWelcome } = await import("@/lib/email-utils");
        const { PLAN_CONFIGS } = await import("@/lib/stripe-config");
        const planName =
          planId && planId in PLAN_CONFIGS
            ? PLAN_CONFIGS[planId as keyof typeof PLAN_CONFIGS].name
            : "Your Plan";

        const pending = (updates.pendingCleaningData || userData.pendingCleaningData) as
          | Record<string, unknown>
          | undefined;

        await notifyCustomerWelcome({
          email: String(userData.email || session.customer_details?.email || "").toLowerCase(),
          firstName: String(userData.firstName || onboardingData?.firstName || ""),
          lastName: String(userData.lastName || onboardingData?.lastName || ""),
          planName,
          addressLine1: String(pending?.addressLine1 || userData.addressLine1 || ""),
          addressLine2: (pending?.addressLine2 as string) || userData.addressLine2,
          city: String(pending?.city || userData.city || ""),
          state: String(pending?.state || userData.state || ""),
          zipCode: String(pending?.zipCode || userData.zipCode || ""),
          preferredServiceDate: pending?.preferredServiceDate as string | undefined,
          preferredDayOfWeek: pending?.preferredDayOfWeek as string | undefined,
          preferredTimeWindow: pending?.preferredTimeWindow as string | undefined,
        });

        await userRef.set(
          { welcomeEmailSent: true, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      } catch (emailError) {
        console.error("[Complete Initial Checkout] Welcome email failed:", emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Complete Initial Checkout] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to complete checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
