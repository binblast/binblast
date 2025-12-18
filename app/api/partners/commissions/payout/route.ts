// app/api/partners/commissions/payout/route.ts
// Weekly payout processor for partner commissions
// This should be called via a cron job or scheduled task weekly

import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { calculatePartnerEmployeeCosts } from "@/lib/partner-payroll";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Verify this is called from a secure source (cron job, admin, etc.)
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, doc, updateDoc, setDoc, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get all partners with connected accounts
    const partnersQuery = query(
      collection(db, "partners"),
      where("status", "==", "active"),
      where("stripeConnectedAccountId", "!=", null)
    );
    const partnersSnapshot = await getDocs(partnersQuery);

    const results = [];

    for (const partnerDoc of partnersSnapshot.docs) {
      const partnerData = partnerDoc.data();
      const partnerId = partnerDoc.id;
      const connectedAccountId = partnerData.stripeConnectedAccountId;

      if (!connectedAccountId) continue;

      // Get all pending/held commissions for this partner from the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const commissionsQuery = query(
        collection(db, "partnerBookings"),
        where("partnerId", "==", partnerId),
        where("commissionStatus", "in", ["pending", "held"]),
        where("status", "==", "active")
      );
      const commissionsSnapshot = await getDocs(commissionsQuery);

      let totalPayoutAmount = 0;
      const commissionIds: string[] = [];

      commissionsSnapshot.forEach((commissionDoc) => {
        const commissionData = commissionDoc.data();
        const createdAt = commissionData.createdAt?.toDate?.() || new Date(commissionData.createdAt?.seconds * 1000);
        
        // Only include commissions from at least 7 days ago (hold period)
        if (createdAt <= oneWeekAgo) {
          totalPayoutAmount += commissionData.partnerShareAmount || 0;
          commissionIds.push(commissionDoc.id);
        }
      });

      // Calculate employee payroll costs for the same period
      const payrollStartDate = oneWeekAgo.toISOString().split('T')[0];
      const payrollEndDate = new Date().toISOString().split('T')[0];
      const employeeCosts = await calculatePartnerEmployeeCosts(
        partnerId,
        payrollStartDate,
        payrollEndDate
      );

      // Calculate net payout (gross commission - employee costs)
      const netPayoutAmount = Math.max(0, totalPayoutAmount - employeeCosts.totalCost);

      if (totalPayoutAmount > 0 && commissionIds.length > 0) {
        try {
          // Funds are already transferred (held), we just need to mark them as paid
          // If transfers weren't created initially, create them now
          // Transfer net amount (after deducting employee costs)
          const transfer = await stripe.transfers.create({
            amount: netPayoutAmount,
            currency: 'usd',
            destination: connectedAccountId,
            metadata: {
              partnerId: partnerId,
              payoutType: 'weekly',
              commissionIds: commissionIds.join(','),
              grossAmount: totalPayoutAmount.toString(),
              employeeCosts: employeeCosts.totalCost.toString(),
              netAmount: netPayoutAmount.toString(),
            },
          });

          // Update all commission records to 'paid'
          for (const commissionId of commissionIds) {
            await updateDoc(doc(db, "partnerBookings", commissionId), {
              commissionStatus: 'paid',
              payoutDate: serverTimestamp(),
              stripeTransferId: transfer.id,
              updatedAt: serverTimestamp(),
            });
          }

          // Create payout record with employee cost breakdown
          const payoutRef = doc(collection(db, "partnerPayouts"));
          await setDoc(payoutRef, {
            partnerId: partnerId,
            amount: netPayoutAmount, // Net amount after employee costs
            grossAmount: totalPayoutAmount, // Gross commission before deductions
            employeeCosts: employeeCosts.totalCost, // Total employee payroll costs
            currency: 'usd',
            status: 'completed',
            stripeTransferId: transfer.id,
            commissionIds: commissionIds,
            employeePayrollBreakdown: employeeCosts.breakdown.map(emp => ({
              employeeId: emp.employeeId,
              employeeName: emp.employeeName,
              earnings: emp.earnings,
            })),
            payoutDate: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          results.push({
            partnerId,
            grossAmount: totalPayoutAmount,
            employeeCosts: employeeCosts.totalCost,
            netAmount: netPayoutAmount,
            commissionsCount: commissionIds.length,
            transferId: transfer.id,
            status: 'success',
          });
        } catch (error: any) {
          console.error(`[Payout] Error processing payout for partner ${partnerId}:`, error);
          results.push({
            partnerId,
            amount: totalPayoutAmount,
            commissionsCount: commissionIds.length,
            status: 'failed',
            error: error.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Error processing partner payouts:", err);
    return NextResponse.json(
      { error: err.message || "Failed to process payouts" },
      { status: 500 }
    );
  }
}
