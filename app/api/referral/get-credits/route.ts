// app/api/referral/get-credits/route.ts
// This endpoint retrieves unused referral credits for a user

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Dynamically import Firebase to prevent build-time initialization
    const { getDbInstance } = await import("@/lib/firebase");
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      console.error("[Get Credits] Firebase is not configured");
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get all unused credits for this user
    const creditsQuery = query(
      collection(db, "credits"),
      where("userId", "==", userId),
      where("used", "==", false)
    );
    const creditsSnapshot = await getDocs(creditsQuery);

    let totalCredits = 0;
    const credits: any[] = [];

    creditsSnapshot.forEach((doc) => {
      const creditData = doc.data();
      totalCredits += creditData.amount || 0;
      credits.push({
        id: doc.id,
        ...creditData,
      });
    });

    return NextResponse.json({
      success: true,
      totalCredits,
      credits,
      count: credits.length,
    });
  } catch (err: any) {
    console.error("[Get Credits] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get credits" },
      { status: 500 }
    );
  }
}

