// app/api/referral/validate-code/route.ts
// Endpoint to validate a referral code and return discount information

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Dynamically import Firebase to prevent build-time initialization
    const { getDbInstance } = await import("@/lib/firebase");
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    
    const body = await req.json();
    const { referralCode } = body;

    if (!referralCode || typeof referralCode !== 'string' || referralCode.trim().length === 0) {
      return NextResponse.json(
        { error: "Referral code is required", valid: false },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured", valid: false },
        { status: 500 }
      );
    }

    // Find the user with this referral code
    const usersQuery = query(
      collection(db, "users"),
      where("referralCode", "==", referralCode.trim().toUpperCase())
    );
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      return NextResponse.json({
        valid: false,
        error: "Invalid referral code",
      });
    }

    const referrerDoc = usersSnapshot.docs[0];
    const referrerData = referrerDoc.data();

    return NextResponse.json({
      valid: true,
      discountAmount: 10.00, // $10 discount
      referrerName: referrerData.firstName || "Friend",
      message: "Referral code applied! You'll get $10 off your first purchase.",
    });
  } catch (err: any) {
    console.error("[Validate Referral Code] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to validate referral code", valid: false },
      { status: 500 }
    );
  }
}
