// app/api/admin/partners/[id]/jobs/route.ts
// Get jobs for a partner

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status");
    const county = searchParams.get("county");

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, where, orderBy } = firestore;

    // Query jobs for this partner
    let jobsQuery = query(
      collection(db, "scheduledCleanings"),
      where("partnerId", "==", partnerId),
      orderBy("scheduledDate", "desc")
    );

    // Apply filters if provided
    if (status) {
      jobsQuery = query(
        collection(db, "scheduledCleanings"),
        where("partnerId", "==", partnerId),
        where("status", "==", status),
        orderBy("scheduledDate", "desc")
      );
    }

    const jobsSnapshot = await getDocs(jobsQuery);
    
    let jobs = jobsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by county if provided (client-side filter since Firestore doesn't support multiple where clauses easily)
    if (county) {
      jobs = jobs.filter((job: any) => job.county === county);
    }

    return NextResponse.json({
      success: true,
      jobs,
    });
  } catch (error: any) {
    console.error("[Get Partner Jobs] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
