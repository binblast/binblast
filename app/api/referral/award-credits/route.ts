// app/api/referral/award-credits/route.ts
// This endpoint awards referral credits after a user completes their first paid service

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Dynamically import Firebase to prevent build-time initialization
    const { getDbInstance } = await import("@/lib/firebase");
    const { collection, query, where, getDocs, doc, updateDoc, setDoc, getDoc, serverTimestamp } = await import("firebase/firestore");
    
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      console.error("[Award Credits] Firebase is not configured");
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Find any PENDING referrals for this user
    const referralsQuery = query(
      collection(db, "referrals"),
      where("referredUserId", "==", userId),
      where("status", "==", "PENDING")
    );
    const referralsSnapshot = await getDocs(referralsQuery);

    if (referralsSnapshot.empty) {
      // No pending referrals - this is fine, user may not have been referred
      return NextResponse.json({
        success: true,
        message: "No pending referrals found",
        creditsAwarded: 0,
      });
    }

    const referralDoc = referralsSnapshot.docs[0];
    const referralData = referralDoc.data();
    const referrerId = referralData.referrerId;

    // Check if credits were already awarded for this referral
    if (referralData.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        message: "Credits already awarded for this referral",
        creditsAwarded: 0,
      });
    }

    // Award $10 credit to the referred user
    const referredUserCreditRef = doc(collection(db, "credits"));
    await setDoc(referredUserCreditRef, {
      userId,
      amount: 10.00,
      currency: "USD",
      used: false,
      referralId: referralDoc.id,
      type: "referral_reward",
      createdAt: serverTimestamp(),
      expiresAt: null, // Credits don't expire
    });

    // Award $10 credit to the referrer
    const referrerCreditRef = doc(collection(db, "credits"));
    await setDoc(referrerCreditRef, {
      userId: referrerId,
      amount: 10.00,
      currency: "USD",
      used: false,
      referralId: referralDoc.id,
      type: "referral_reward",
      createdAt: serverTimestamp(),
      expiresAt: null,
    });

    // Mark referral as COMPLETED
    await updateDoc(doc(db, "referrals", referralDoc.id), {
      status: "COMPLETED",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update referrer's completed referral count
    const referrerDocRef = doc(db, "users", referrerId);
    const referrerDoc = await getDoc(referrerDocRef);
    if (referrerDoc.exists()) {
      const currentCount = referrerDoc.data().referralCount || 0;
      await updateDoc(referrerDocRef, {
        referralCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      });
    }

    console.log("[Award Credits] Credits awarded successfully:", {
      referralId: referralDoc.id,
      referredUserId: userId,
      referrerId,
      creditsAwarded: 2,
    });

    return NextResponse.json({
      success: true,
      referralId: referralDoc.id,
      creditsAwarded: 2,
      message: "Credits awarded successfully",
    });
  } catch (err: any) {
    console.error("[Award Credits] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to award credits" },
      { status: 500 }
    );
  }
}

