// app/api/partners/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getAuthInstance } from "@/lib/firebase";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const auth = await getAuthInstance();
    const user = auth?.currentUser;
    
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

    // Find partner by userId or email
    const partnersRef = collection(db, "partners");
    let partnerQuery = query(partnersRef, where("userId", "==", user.uid));
    let partnerSnapshot = await getDocs(partnerQuery);

    if (partnerSnapshot.empty) {
      // Try finding by email as fallback
      partnerQuery = query(partnersRef, where("email", "==", user.email));
      partnerSnapshot = await getDocs(partnerQuery);
    }

    if (partnerSnapshot.empty) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerDoc = partnerSnapshot.docs[0];
    const partnerId = partnerDoc.id;

    // Get payout history
    const payoutsRef = collection(db, "partnerPayouts");
    let payoutsQuery;
    
    try {
      payoutsQuery = query(
        payoutsRef,
        where("partnerId", "==", partnerId),
        orderBy("createdAt", "desc")
      );
    } catch (orderError: any) {
      // If orderBy fails due to missing index, fetch all and sort in memory
      payoutsQuery = query(
        payoutsRef,
        where("partnerId", "==", partnerId)
      );
    }

    const payoutsSnapshot = await getDocs(payoutsQuery);
    
    const payouts = payoutsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: data.amount || 0, // Net amount
        grossAmount: data.grossAmount || 0, // Gross commission
        employeeCosts: data.employeeCosts || 0, // Employee payroll costs
        currency: data.currency || 'usd',
        status: data.status || 'pending',
        stripeTransferId: data.stripeTransferId || null,
        commissionIds: data.commissionIds || [],
        employeePayrollBreakdown: data.employeePayrollBreakdown || [],
        payoutDate: data.payoutDate?.toDate?.()?.toISOString() || data.payoutDate,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt,
      };
    });

    // Sort in memory if orderBy wasn't used
    if (payouts.length > 0 && !payouts[0].createdAt) {
      payouts.sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
    }

    // Calculate totals
    const totalPaid = payouts
      .filter(p => p.status === 'completed' || p.status === 'paid')
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const pendingAmount = payouts
      .filter(p => p.status === 'pending' || p.status === 'held')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    return NextResponse.json({
      success: true,
      payouts,
      totalPaid,
      pendingAmount,
      totalPayouts: payouts.length,
    });
  } catch (error: any) {
    console.error("[Get Partner Payouts] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch payouts" },
      { status: 500 }
    );
  }
}
