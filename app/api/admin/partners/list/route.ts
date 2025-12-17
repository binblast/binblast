// app/api/admin/partners/list/route.ts
// Get all partners with computed stats

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, where, orderBy } = firestore;

    // Get all partners
    const partnersQuery = query(
      collection(db, "partners"),
      orderBy("createdAt", "desc")
    );
    const partnersSnapshot = await getDocs(partnersQuery);

    const partners = partnersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate stats for each partner
    const partnersWithStats = await Promise.all(
      partners.map(async (partner) => {
        // Count customers assigned to this partner
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("partnerId", "==", partner.id)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const customerEmails = new Set<string>();
        bookingsSnapshot.forEach(doc => {
          const booking = doc.data();
          if (booking.customerEmail) {
            customerEmails.add(booking.customerEmail);
          }
        });

        // Count jobs
        const jobsQuery = query(
          collection(db, "scheduledCleanings"),
          where("partnerId", "==", partner.id)
        );
        const jobsSnapshot = await getDocs(jobsQuery);
        
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
                const photosQuery = query(
                  collection(db, "jobPhotos"),
                  where("jobId", "==", jobDoc.id)
                );
                const photosSnapshot = await getDocs(photosQuery);
                const photos = photosSnapshot.docs.map(doc => doc.data());
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

        // Get unpaid balance from payouts
        const payoutsQuery = query(
          collection(db, "partnerPayouts"),
          where("partnerId", "==", partner.id),
          where("status", "==", "pending")
        );
        const payoutsSnapshot = await getDocs(payoutsQuery);
        let unpaidBalance = 0;
        payoutsSnapshot.forEach(doc => {
          unpaidBalance += doc.data().amount || 0;
        });

        // Get last payout date
        const paidPayoutsQuery = query(
          collection(db, "partnerPayouts"),
          where("partnerId", "==", partner.id),
          where("status", "==", "paid"),
          orderBy("paidAt", "desc")
        );
        const paidPayoutsSnapshot = await getDocs(paidPayoutsQuery);
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
    return NextResponse.json(
      { error: error.message || "Failed to fetch partners" },
      { status: 500 }
    );
  }
}
