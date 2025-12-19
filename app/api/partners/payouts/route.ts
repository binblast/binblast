// app/api/partners/payouts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getPartner } from "@/lib/partner-auth";

export const dynamic = 'force-dynamic';

/**
 * Verify Firebase ID token from Authorization header
 */
async function verifyAuthToken(req: NextRequest): Promise<{ uid: string; email?: string } | null> {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const idToken = authHeader.split("Bearer ")[1];
    if (!idToken) {
      return null;
    }

    const { getAdminApp } = await import("@/lib/firebase-admin");
    const adminApp = await getAdminApp();
    const adminAuth = adminApp.auth();
    
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error("[Payouts API] Token verification error:", error);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    // Verify authentication token
    const authData = await verifyAuthToken(req);
    
    if (!authData) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { uid: userId, email: userEmail } = authData;

    // Get partner data (any status) - try userId first, then email as fallback
    const partner = await getPartner(userId, userEmail);
    if (!partner) {
      console.error("[Payouts API] Partner not found for userId:", userId, "email:", userEmail);
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }
    
    console.log("[Payouts API] Found partner:", { id: partner.id, status: partner.status, userId, userEmail });

    // Only active partners can view payouts
    if (partner.status !== "active") {
      return NextResponse.json(
        { 
          error: `Partner account is ${partner.status}. Only active partners can view payouts.`,
          partnerStatus: partner.status
        },
        { status: 403 }
      );
    }

    const partnerId = partner.id;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, orderBy } = firestore;

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
