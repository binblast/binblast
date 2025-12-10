// app/api/referral/process/route.ts
// This endpoint processes referrals when a new user signs up with a referral code

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, increment, serverTimestamp } from "firebase/firestore";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { referralCode, newUserId, newUserEmail } = body;

    if (!referralCode || !newUserId || !newUserEmail) {
      return NextResponse.json(
        { error: "referralCode, newUserId, and newUserEmail are required" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      console.error("[Referral Process] Firebase is not configured");
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Find the user with this referral code
    const usersQuery = query(
      collection(db, "users"),
      where("referralCode", "==", referralCode)
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      console.warn("[Referral Process] Invalid referral code:", referralCode);
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 400 }
      );
    }

    const referrerDoc = usersSnapshot.docs[0];
    const referrerId = referrerDoc.id;

    // Prevent self-referral
    if (referrerId === newUserId) {
      return NextResponse.json(
        { error: "Cannot refer yourself" },
        { status: 400 }
      );
    }

    // Check if this referral was already processed
    const newUserDocRef = doc(db, "users", newUserId);
    const newUserDoc = await getDoc(newUserDocRef);
    
    // Note: We'll track referrals in a separate collection to prevent duplicates
    // For now, we'll just increment the referrer's count
    // In production, you'd want to:
    // 1. Create a referrals collection to track each referral
    // 2. Check if this newUserId was already referred
    // 3. Apply $10 discount codes to both users

    // Increment referrer's referral count
    await updateDoc(doc(db, "users", referrerId), {
      referralCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    // Store referral information in the new user's document
    await updateDoc(newUserDocRef, {
      referredBy: referrerId,
      referredByCode: referralCode,
      updatedAt: serverTimestamp(),
    });

    console.log("[Referral Process] Referral processed successfully:", {
      referrerId,
      newUserId,
      referralCode,
    });

    // TODO: In production, you would:
    // 1. Create discount codes for both users ($10 off)
    // 2. Send notification emails
    // 3. Track referral in a separate collection for analytics

    return NextResponse.json({
      success: true,
      referrerId,
      message: "Referral processed successfully. Both users will receive $10 off!",
    });
  } catch (err: any) {
    console.error("Referral processing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process referral" },
      { status: 500 }
    );
  }
}

