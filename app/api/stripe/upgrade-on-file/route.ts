import { NextRequest, NextResponse } from "next/server";
import { PlanId } from "@/lib/stripe-config";
import {
  completeSubscriptionUpgrade,
  getDefaultPaymentMethodId,
  getUpgradeProrationPreview,
} from "@/lib/subscription-upgrade-service";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, newPlanId = "twice-month" } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const { getAdminFirestore } = await import("@/lib/firebase-admin");
    const db = await getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const stripeCustomerId = userData.stripeCustomerId as string | undefined;
    const stripeSubscriptionId = userData.stripeSubscriptionId as
      | string
      | undefined;

    if (!stripeCustomerId || !stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No active subscription or payment method on file." },
        { status: 400 }
      );
    }

    const cleaningsSnapshot = await db
      .collection("scheduledCleanings")
      .where("userId", "==", userId)
      .get();
    const cleanings = cleaningsSnapshot.docs.map((doc: any) => doc.data());

    const preview = await getUpgradeProrationPreview(
      userId,
      newPlanId as PlanId,
      {
        selectedPlan: userData.selectedPlan,
        stripeSubscriptionId,
        cleaningCredits: userData.cleaningCredits,
      },
      cleanings
    );

    if (!preview.isUpgrade) {
      return NextResponse.json(
        { error: "Selected plan is not an upgrade." },
        { status: 400 }
      );
    }

    if (preview.proratedAmountCents > 0) {
      const paymentMethodId = await getDefaultPaymentMethodId(
        stripeCustomerId,
        stripeSubscriptionId
      );

      if (!paymentMethodId) {
        return NextResponse.json(
          {
            error:
              "No card on file. Please update your payment method in billing settings.",
          },
          { status: 400 }
        );
      }

      try {
        await stripe.paymentIntents.create({
          amount: preview.proratedAmountCents,
          currency: "usd",
          customer: stripeCustomerId,
          payment_method: paymentMethodId,
          off_session: true,
          confirm: true,
          description: `Prorated upgrade to ${preview.newPlanId}`,
          metadata: {
            userId,
            type: "subscription_upgrade_proration",
            currentPlanId: preview.currentPlanId,
            newPlanId: preview.newPlanId,
            subscriptionId: stripeSubscriptionId,
            cleaningCreditsRollover: String(preview.cleaningCreditsRollover),
          },
        });
      } catch (paymentError: any) {
        const requiresAction =
          paymentError?.code === "authentication_required" ||
          paymentError?.raw?.payment_intent?.status === "requires_action";

        return NextResponse.json(
          {
            error: requiresAction
              ? "Your bank requires additional verification. Please update your card in billing settings."
              : paymentError.message || "Failed to charge card on file.",
          },
          { status: 402 }
        );
      }
    }

    const updatedSubscription = await completeSubscriptionUpgrade(
      userId,
      stripeSubscriptionId,
      preview.newPlanId,
      preview.cleaningCreditsRollover
    );

    return NextResponse.json({
      success: true,
      subscriptionId: updatedSubscription.id,
      newPlanId: preview.newPlanId,
      proratedAmount: preview.proratedAmountDollars,
      cleaningCreditsRollover: preview.cleaningCreditsRollover,
    });
  } catch (error: any) {
    console.error("[Upgrade On File] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upgrade subscription" },
      { status: 500 }
    );
  }
}
