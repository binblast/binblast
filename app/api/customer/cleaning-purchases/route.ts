import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { PLAN_CONFIGS, PlanId } from "@/lib/stripe-config";

export const dynamic = "force-dynamic";

function formatTimestamp(value: any): string | null {
  if (!value) return null;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value.seconds === "number") {
    return new Date(value.seconds * 1000).toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const userDoc = await db.collection("users").doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data() || {};
    const selectedPlan = (userData.selectedPlan as PlanId) || "one-time";

    const [oneTimeSnapshot, upgradeSnapshot] = await Promise.all([
      db
        .collection("oneTimeCleaningPayments")
        .where("userId", "==", userId)
        .get(),
      db
        .collection("subscriptionUpgradePayments")
        .where("userId", "==", userId)
        .get(),
    ]);

    const oneTimePurchases = oneTimeSnapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          type: "one_time_cleaning" as const,
          label: "One-Time Extra Cleaning",
          amount: (data.amountPaidCents || 3500) / 100,
          processedAt: formatTimestamp(data.processedAt),
        };
      })
      .sort((a: any, b: any) => {
        const aTime = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        const bTime = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        return bTime - aTime;
      });

    const upgradePurchases = upgradeSnapshot.docs
      .map((doc: any) => {
        const data = doc.data();
        const newPlanId = data.newPlanId as PlanId;
        return {
          id: doc.id,
          type: "plan_upgrade" as const,
          label: `Upgrade to ${PLAN_CONFIGS[newPlanId]?.name || newPlanId}`,
          amount: (data.amountPaidCents || 0) / 100,
          previousPlanId: data.previousPlanId,
          newPlanId: data.newPlanId,
          processedAt: formatTimestamp(data.processedAt),
        };
      })
      .sort((a: any, b: any) => {
        const aTime = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        const bTime = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        return bTime - aTime;
      });

    return NextResponse.json({
      selectedPlan,
      planName: PLAN_CONFIGS[selectedPlan]?.name || selectedPlan,
      cleaningCredits: userData.cleaningCredits || 0,
      purchases: [...oneTimePurchases, ...upgradePurchases].sort((a, b) => {
        const aTime = a.processedAt ? new Date(a.processedAt).getTime() : 0;
        const bTime = b.processedAt ? new Date(b.processedAt).getTime() : 0;
        return bTime - aTime;
      }),
    });
  } catch (error: any) {
    console.error("[Cleaning Purchases] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load cleaning purchases" },
      { status: 500 }
    );
  }
}
