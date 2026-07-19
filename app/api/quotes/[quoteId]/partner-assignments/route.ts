import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { serializeQuotePartnerAssignment } from "@/lib/quote-partner-assignments";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { quoteId: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quoteId = params.quoteId;
    const db = await getAdminFirestore();
    const quoteDoc = await db.collection("customQuotes").doc(quoteId).get();

    if (!quoteDoc.exists) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    const snapshot = await db
      .collection("customQuotes")
      .doc(quoteId)
      .collection("partnerAssignments")
      .get();

    const assignments = (snapshot.docs as FirestoreDocument[])
      .map((doc) => serializeQuotePartnerAssignment(doc.data(), doc.id))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({ success: true, assignments });
  } catch (error: unknown) {
    console.error("[Quote Partner Assignments GET] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load partner assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
