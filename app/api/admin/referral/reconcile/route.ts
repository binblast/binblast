import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  awardReferralCreditsForUser,
  processReferralSignup,
  referredUserHasCompletedPayment,
  validateReferralCode,
} from "@/lib/referral-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const referralCode = String(body.referralCode || "").trim();
    const referredEmail = String(body.referredEmail || "").trim().toLowerCase();

    if (!referralCode || !referredEmail) {
      return NextResponse.json(
        { error: "referralCode and referredEmail are required" },
        { status: 400 }
      );
    }

    const validation = await validateReferralCode(referralCode);
    if (!validation.valid || !validation.referrerId) {
      return NextResponse.json({ error: validation.error || "Invalid referral code" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const referredUsers = await db
      .collection("users")
      .where("email", "==", referredEmail)
      .limit(1)
      .get();

    if (referredUsers.empty) {
      return NextResponse.json({ error: "Referred customer account not found" }, { status: 404 });
    }

    const referredDoc = referredUsers.docs[0];
    const referredUserId = referredDoc.id;
    const referredData = referredDoc.data();

    const hasPaid = (
      await referredUserHasCompletedPayment({
        referredUserId,
        referredUserData: referredData,
        referredUserEmail: referredEmail,
      })
    ).hasPaid;

    let processResult: Awaited<ReturnType<typeof processReferralSignup>>;

    if (referredData.referredBy) {
      processResult = {
        success: true,
        referralId: undefined,
        referrerId: referredData.referredBy,
        alreadyProcessed: true,
      };
    } else {
      processResult = await processReferralSignup({
        referralCode,
        newUserId: referredUserId,
        newUserEmail: referredEmail,
      });
    }

    if (!processResult.success) {
      return NextResponse.json(
        { error: processResult.error || "Failed to link referral" },
        { status: 400 }
      );
    }

    let awardResult = { awarded: false, creditsAwarded: 0 };
    if (hasPaid) {
      awardResult = await awardReferralCreditsForUser(referredUserId);
    }

    const referrerDoc = await db.collection("users").doc(validation.referrerId).get();

    return NextResponse.json({
      success: true,
      referralLinked: true,
      referralId: processResult.referralId,
      referrer: {
        id: validation.referrerId,
        name: referrerDoc.data()?.firstName || "Referrer",
        email: referrerDoc.data()?.email || null,
        referralCount: referrerDoc.data()?.referralCount || 0,
      },
      referred: {
        id: referredUserId,
        email: referredEmail,
        hasPaid,
      },
      creditsAwarded: awardResult.creditsAwarded,
      message: hasPaid
        ? awardResult.awarded
          ? "Referral linked and credits awarded to both accounts."
          : "Referral linked. Credits were already awarded or are not pending."
        : "Referral linked. Credits will be awarded after the referred customer pays.",
    });
  } catch (error: unknown) {
    console.error("[Admin Referral Reconcile] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to reconcile referral";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
