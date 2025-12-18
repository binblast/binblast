// app/api/admin/partners/list/route.ts
// Get all partners with computed stats

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await getAdminFirestore();

    // Get all partners
    const partnersSnapshot = await db
      .collection("partners")
      .orderBy("createdAt", "desc")
      .get();

    const partners = partnersSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate stats for each partner
    const partnersWithStats = await Promise.all(
      partners.map(async (partner: any) => {
        // Count customers assigned to this partner
        const bookingsSnapshot = await db
          .collection("bookings")
          .where("partnerId", "==", partner.id)
          .get();
        const customerEmails = new Set<string>();
        bookingsSnapshot.forEach((doc: any) => {
          const booking = doc.data();
          if (booking.customerEmail) {
            customerEmails.add(booking.customerEmail);
          }
        });

        // Count jobs
        const jobsSnapshot = await db
          .collection("scheduledCleanings")
          .where("partnerId", "==", partner.id)
          .get();
        
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        let jobsTotal = 0;
        let jobsThisWeek = 0;
        let jobsThisMonth = 0;
        
        // Calculate photo compliance for last 30 days
        let jobsWithPhotos30d = 0;
        let totalJobs30d = 0;
        
        for (const jobDoc of jobsSnapshot.docs) {
          const job = jobDoc.data();
          const jobDate = job.scheduledDate?.toDate?.() || job.createdAt?.toDate?.() || job.createdAt;
          
          jobsTotal++;
          if (jobDate) {
            if (new Date(jobDate) >= weekAgo) {
              jobsThisWeek++;
            }
            if (new Date(jobDate) >= monthAgo) {
              jobsThisMonth++;
              
              // Check photo compliance for jobs in last 30 days
              if (job.status === "completed" || job.jobStatus === "completed") {
                totalJobs30d++;
                const photosSnapshot = await db
                  .collection("jobPhotos")
                  .where("jobId", "==", jobDoc.id)
                  .get();
                const photos = photosSnapshot.docs.map((doc: any) => doc.data());
                const hasInsidePhoto = photos.some((p: any) => p.photoType === "inside");
                const hasOutsidePhoto = photos.some((p: any) => p.photoType === "outside");
                if (hasInsidePhoto && hasOutsidePhoto) {
                  jobsWithPhotos30d++;
                }
              }
            }
          }
        }
        
        const photoCompliance30d = totalJobs30d > 0 
          ? Math.round((jobsWithPhotos30d / totalJobs30d) * 100) 
          : 100;

        // Calculate revenue
        let grossRevenueMTD = 0;
        let grossRevenueLifetime = 0;
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        
        bookingsSnapshot.forEach((doc: any) => {
          const booking = doc.data();
          if (booking.status === "completed" && booking.grossAmount) {
            grossRevenueLifetime += booking.grossAmount || 0;
            const bookingDate = booking.completedAt?.toDate?.() || booking.createdAt?.toDate?.() || booking.createdAt;
            if (bookingDate && new Date(bookingDate) >= monthStart) {
              grossRevenueMTD += booking.grossAmount || 0;
            }
          }
        });

        // Get unpaid balance from payouts
        const payoutsSnapshot = await db
          .collection("partnerPayouts")
          .where("partnerId", "==", partner.id)
          .where("status", "==", "pending")
          .get();
        let unpaidBalance = 0;
        payoutsSnapshot.forEach((doc: any) => {
          unpaidBalance += doc.data().amount || 0;
        });

        // Get last payout date
        const paidPayoutsSnapshot = await db
          .collection("partnerPayouts")
          .where("partnerId", "==", partner.id)
          .where("status", "==", "paid")
          .orderBy("paidAt", "desc")
          .get();
        const lastPayoutDate = paidPayoutsSnapshot.docs[0]?.data()?.paidAt || null;

        return {
          ...partner,
          customersAssigned: customerEmails.size,
          jobsTotal,
          jobsThisWeek,
          jobsThisMonth,
          photoCompliance30d,
          grossRevenueMTD,
          grossRevenueLifetime,
          unpaidBalance,
          lastPayoutDate,
        };
      })
    );

    return NextResponse.json({
      success: true,
      partners: partnersWithStats,
    });
  } catch (error: any) {
    console.error("[Partners List] Error:", error);
    
    // Provide helpful error message for missing credentials
    let errorMessage = error.message || "Failed to fetch partners";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage = "Server configuration error: Firebase Admin credentials are missing. Please contact your administrator to configure FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in Vercel environment variables.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
