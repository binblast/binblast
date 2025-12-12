// app/api/referral/process/route.ts
// This endpoint processes referrals when a new user signs up with a referral code

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Dynamically import Firebase to prevent build-time initialization
    const { getDbInstance } = await import("@/lib/firebase");
    const { collection, query, where, getDocs, doc, updateDoc, getDoc, setDoc, increment, serverTimestamp } = await import("firebase/firestore");
    
    const body = await req.json();
    let { referralCode, newUserId, newUserEmail } = body;

    // Normalize referral code to uppercase and trim whitespace
    referralCode = referralCode?.trim().toUpperCase();

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

    console.log("[Referral Process] Looking up referral code:", referralCode);

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
    
    // Check if this user was already referred (prevent duplicate referrals)
    // Users can only use ONE referral code total
    if (newUserDoc.exists() && newUserDoc.data().referredBy) {
      console.warn("[Referral Process] User already has a referral:", {
        userId: newUserId,
        existingReferrer: newUserDoc.data().referredBy,
        attemptedCode: referralCode,
      });
      return NextResponse.json(
        { error: "You have already used a referral code. Each user can only use one referral code." },
        { status: 400 }
      );
    }

    // Check if a referral record already exists for this user
    const referralsQuery = query(
      collection(db, "referrals"),
      where("referredUserId", "==", newUserId)
    );
    const existingReferrals = await getDocs(referralsQuery);
    
    if (!existingReferrals.empty) {
      console.warn("[Referral Process] Referral already exists for this user:", {
        userId: newUserId,
        existingReferrals: existingReferrals.docs.map(d => d.id),
      });
      return NextResponse.json(
        { error: "Referral already exists for this user. Each user can only use one referral code." },
        { status: 400 }
      );
    }

    // Create a PENDING referral record
    const referralRef = doc(collection(db, "referrals"));
    await setDoc(referralRef, {
      referrerId,
      referredUserId: newUserId,
      referredUserEmail: newUserEmail,
      referralCode,
      status: "PENDING",
      active: true, // Mark as active - will be marked inactive after credits are awarded
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Store referral information in the new user's document
    // Mark that this user has used a referral code (prevents future use)
    await updateDoc(newUserDocRef, {
      referredBy: referrerId,
      referredByCode: referralCode,
      referralCodeUsed: true, // Mark that user has used a referral code
      updatedAt: serverTimestamp(),
    });

    // Increment referrer's referral count
    const referrerDocRef = doc(db, "users", referrerId);
    await updateDoc(referrerDocRef, {
      referralCount: increment(1),
      updatedAt: serverTimestamp(),
    });

    console.log("[Referral Process] Referral created successfully:", {
      referralId: referralRef.id,
      referrerId,
      newUserId,
      referralCode,
      status: "PENDING",
    });

    return NextResponse.json({
      success: true,
      referralId: referralRef.id,
      referrerId,
      message: "Referral processed successfully. Credits will be awarded after first purchase!",
    });
  } catch (err: any) {
    console.error("Referral processing error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process referral" },
      { status: 500 }
    );
  }
}

