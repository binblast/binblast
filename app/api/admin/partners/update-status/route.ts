// app/api/admin/partners/update-status/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { partnerId, status } = body;

    if (!partnerId || !status) {
      return NextResponse.json(
        { error: "partnerId and status are required" },
        { status: 400 }
      );
    }

    if (!["pending", "approved", "suspended"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
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
      partnerStatus: status,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Partner status updated successfully",
    });
  } catch (err: any) {
    console.error("Partner status update error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update partner status" },
      { status: 500 }
    );
  }
}
