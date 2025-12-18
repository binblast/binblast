// app/api/admin/partners/[id]/route.ts
// Get partner details

import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const partnerId = params.id;

    if (!partnerId) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    const db = await getAdminFirestore();
    const partnerDoc = await db.collection("partners").doc(partnerId).get();

    if (!partnerDoc.exists) {
      return NextResponse.json(
        { error: "Partner not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      partner: {
        id: partnerDoc.id,
        ...partnerDoc.data(),
      },
    });
  } catch (error: any) {
    console.error("[Get Partner] Error:", error);
    
    // Provide helpful error message for missing credentials
    let errorMessage = error.message || "Failed to fetch partner";
    if (errorMessage.includes("Firebase Admin credentials not configured")) {
      errorMessage = "Server configuration error: Firebase Admin credentials are missing. Please contact your administrator.";
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
