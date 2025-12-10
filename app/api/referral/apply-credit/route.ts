// app/api/referral/apply-credit/route.ts
// This endpoint applies referral credits to a checkout session

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Dynamically import Firebase to prevent build-time initialization
    const { getDbInstance } = await import("@/lib/firebase");
    const { collection, query, where, getDocs, doc, updateDoc, orderBy, limit } = await import("firebase/firestore");
    
    const body = await req.json();
    const { userId, amount } = body;

    if (!userId || !amount) {
      return NextResponse.json(
        { error: "userId and amount are required" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      console.error("[Apply Credit] Firebase is not configured");
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get unused credits
    const creditsQuery = query(
      collection(db, "credits"),
      where("userId", "==", userId),
      where("used", "==", false)
    );
    const creditsSnapshot = await getDocs(creditsQuery);

    if (creditsSnapshot.empty) {
      return NextResponse.json({
        success: true,
        creditApplied: 0,
        remainingAmount: amount,
        creditsUsed: [],
      });
    }

    // Sort credits by creation date (oldest first) in memory
    const creditsArray = creditsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount || 0,
        createdAt: data.createdAt,
      };
    }).sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || (a.createdAt as any)?.seconds * 1000 || 0;
      const bTime = b.createdAt?.toMillis?.() || (b.createdAt as any)?.seconds * 1000 || 0;
      return aTime - bTime;
    });

    let remainingAmount = amount;
    let totalApplied = 0;
    const creditsUsed: string[] = [];

    // Apply credits up to $10 maximum or remaining amount, whichever is smaller
    const maxCreditToApply = Math.min(10.00, remainingAmount);

    for (const creditData of creditsArray) {
      if (remainingAmount <= 0 || totalApplied >= maxCreditToApply) break;

      const creditAmount = creditData.amount || 0;

      if (creditAmount > 0 && totalApplied + creditAmount <= maxCreditToApply) {
        const amountToApply = Math.min(creditAmount, remainingAmount, maxCreditToApply - totalApplied);
        
        // Mark credit as used
        await updateDoc(doc(db, "credits", creditData.id), {
          used: true,
          usedAt: new Date(),
          usedForAmount: amountToApply,
        });

        creditsUsed.push(creditData.id);
        remainingAmount = Math.max(0, remainingAmount - amountToApply);
        totalApplied += amountToApply;
      }
    }

    const creditApplied = totalApplied;

    return NextResponse.json({
      success: true,
      creditApplied: Math.min(creditApplied, maxCreditToApply),
      remainingAmount: Math.max(0, amount - Math.min(creditApplied, maxCreditToApply)),
      creditsUsed,
    });
  } catch (err: any) {
    console.error("[Apply Credit] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to apply credit" },
      { status: 500 }
    );
  }
}

