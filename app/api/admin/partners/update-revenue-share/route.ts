// app/api/admin/partners/update-revenue-share/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId, revenueSharePartner, revenueSharePlatform } = body;

    if (!partnerId || revenueSharePartner === undefined || revenueSharePlatform === undefined) {
      return NextResponse.json(
        { error: "partnerId, revenueSharePartner, and revenueSharePlatform are required" },
        { status: 400 }
      );
    }

    if (revenueSharePartner < 0 || revenueSharePartner > 1 || revenueSharePlatform < 0 || revenueSharePlatform > 1) {
      return NextResponse.json(
        { error: "Revenue share values must be between 0 and 1" },
        { status: 400 }
      );
    }

    // Ensure they sum to 1
    const total = revenueSharePartner + revenueSharePlatform;
    if (Math.abs(total - 1) > 0.01) {
      return NextResponse.json(
        { error: "Revenue share values must sum to 1" },
        { status: 400 }
      );
    }

    // Dynamically import Firebase
    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { doc, updateDoc, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    const partnerRef = doc(db, "partners", partnerId);
    await updateDoc(partnerRef, {
      revenueSharePartner,
      revenueSharePlatform,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Revenue share updated successfully",
    });
  } catch (err: any) {
    console.error("Revenue share update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update revenue share" },
      { status: 500 }
    );
  }
}
