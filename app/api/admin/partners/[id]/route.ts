// app/api/admin/partners/[id]/route.ts
// Get partner details

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

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc } = firestore;

    const partnerRef = doc(db, "partners", partnerId);
    const partnerDoc = await getDoc(partnerRef);

    if (!partnerDoc.exists()) {
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
    return NextResponse.json(
      { error: error.message || "Failed to fetch partner" },
      { status: 500 }
    );
  }
}
