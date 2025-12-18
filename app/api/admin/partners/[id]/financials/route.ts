// app/api/admin/partners/[id]/financials/route.ts
// Get financial data for a partner

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { calculatePartnerEmployeeCosts } from "@/lib/partner-payroll";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, where, orderBy } = firestore;

    // Get partner to get revenue split
    const { doc, getDoc } = firestore;
    const partnerRef = doc(db, "partners", partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerDoc.data();

    // Calculate revenue from bookings
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("partnerId", "==", partnerId)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let grossRevenueMTD = 0;
    let grossRevenueLifetime = 0;
    let totalPaid = 0;

    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      if (booking.status === "completed" && booking.grossAmount) {
        grossRevenueLifetime += booking.grossAmount || 0;
        const bookingDate = booking.completedAt?.toDate?.() || booking.createdAt?.toDate?.() || booking.createdAt;
        if (bookingDate && new Date(bookingDate) >= monthStart) {
          grossRevenueMTD += booking.grossAmount || 0;
        }
      }
    });

    // Get payouts
    const payoutsQuery = query(
      collection(db, "partnerPayouts"),
      where("partnerId", "==", partnerId),
      orderBy("createdAt", "desc")
    );
    const payoutsSnapshot = await getDocs(payoutsQuery);

    let unpaidBalance = 0;
    const payouts: any[] = [];

    payoutsSnapshot.forEach(doc => {
      const payout = doc.data();
      payouts.push({
        id: doc.id,
        ...payout,
      });
      
      if (payout.status === "pending") {
        unpaidBalance += payout.amount || 0;
      } else if (payout.status === "paid") {
        totalPaid += payout.amount || 0; // This is net amount (after employee costs)
      }
    });

    // Calculate current month employee costs
    const monthStartStr = monthStart.toISOString().split('T')[0];
    const monthEndStr = new Date().toISOString().split('T')[0];
    const employeeCostsMTD = await calculatePartnerEmployeeCosts(
      partnerId,
      monthStartStr,
      monthEndStr
    );

    // Calculate lifetime employee costs (all time)
    const employeeCostsLifetime = await calculatePartnerEmployeeCosts(partnerId);

    return NextResponse.json({
      success: true,
      grossRevenueMTD,
      grossRevenueLifetime,
      unpaidBalance,
      totalPaid, // Net paid (after employee costs)
      payouts,
      revenueSharePartner: partnerData.revenueSharePartner || 0,
      revenueSharePlatform: partnerData.revenueSharePlatform || 0,
      employeeCostsMTD: employeeCostsMTD.totalCost,
      employeeCostsLifetime: employeeCostsLifetime.totalCost,
      netRevenueMTD: grossRevenueMTD - employeeCostsMTD.totalCost,
      netRevenueLifetime: grossRevenueLifetime - employeeCostsLifetime.totalCost,
      employeePayrollBreakdown: employeeCostsMTD.breakdown,
    });
  } catch (error: any) {
    console.error("[Get Partner Financials] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch financials" },
      { status: 500 }
    );
  }
}
