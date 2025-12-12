// app/api/partners/agreement/[partnerId]/accept/route.ts

import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const AGREEMENT_VERSION = "v1"; // Update when agreement changes

export async function POST(
  req: NextRequest,
  { params }: { params: { partnerId: string } }
) {
  try {
    const partnerId = params.partnerId;
    const body = await req.json();
    const { userId } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get the partner
    const partnerRef = doc(db, "partners", partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    const partnerData = partnerDoc.data();

    // Verify userId matches
    if (partnerData.userId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized: This partner account does not belong to you" },
        { status: 403 }
      );
    }

    // Check if already accepted
    if (partnerData.status === "active" && partnerData.agreementAcceptedAt) {
      return NextResponse.json({
        success: true,
        message: "Agreement already accepted",
      });
    }

    // Update partner to active status
    await updateDoc(partnerRef, {
      status: "active",
      agreementAcceptedAt: serverTimestamp(),
      agreementVersion: AGREEMENT_VERSION,
      updatedAt: serverTimestamp(),
    });

    // TODO: Send welcome email to partner with dashboard link

    return NextResponse.json({
      success: true,
      message: "Agreement accepted successfully",
    });
  } catch (err: any) {
    console.error("Error accepting partner agreement:", err);
    return NextResponse.json(
      { error: err.message || "Failed to accept agreement" },
      { status: 500 }
    );
  }
}
