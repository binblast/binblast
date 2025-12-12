// app/api/admin/partners/applications/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const ALLOWED_ADMIN_EMAILS = [
  "you@example.com", // Update with your admin email
];

// Helper to check admin access
async function checkAdminAccess(req: NextRequest): Promise<boolean> {
  // For now, use a simple header check or API key
  // In production, verify Firebase auth token
  const authHeader = req.headers.get("authorization");
  // TODO: Implement proper admin auth check
  return true; // Stub for now - implement proper auth
}

export async function GET(req: NextRequest) {
  try {
    // TODO: Add proper admin auth check
    // if (!await checkAdminAccess(req)) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { collection, query, getDocs, orderBy } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    const applicationsQuery = query(
      collection(db, "partnerApplications"),
      orderBy("createdAt", "desc")
    );
    const applicationsSnapshot = await getDocs(applicationsQuery);

    const applications = applicationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      applications,
    });
  } catch (err: any) {
    console.error("Error fetching partner applications:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch applications" },
      { status: 500 }
    );
  }
}
