import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { serializeQuotePartnerAssignment } from "@/lib/quote-partner-assignments";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

async function loadPartnerQuoteAssignments(partnerId: string) {
  const db = await getAdminFirestore();
  const snapshot = await db
    .collection("partners")
    .doc(partnerId)
    .collection("quoteAssignments")
    .get();

  if (!snapshot.empty) {
    return snapshot.docs as FirestoreDocument[];
  }

  try {
    const legacySnapshot = await db
      .collectionGroup("partnerAssignments")
      .where("partnerId", "==", partnerId)
      .get();
    return legacySnapshot.docs as FirestoreDocument[];
  } catch (queryError: unknown) {
    console.warn("[Partner Quote Assignments GET] Legacy collectionGroup query failed:", queryError);
    return [];
  }
}

export async function GET(req: NextRequest) {
  try {
    const access = await checkPartnerAccess(req);
    if (!access.isPartner || !access.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerId = access.partner.id;
    const db = await getAdminFirestore();
    const docs = await loadPartnerQuoteAssignments(partnerId);

    const assignments = docs
      .map((doc) => serializeQuotePartnerAssignment(doc.data(), doc.id))
      .filter((row) => row.status !== "cancelled")
      .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

    const quoteIds = [...new Set(assignments.map((row) => row.quoteId))];
    const quoteSummaries: Record<
      string,
      { customerName: string; propertyType: string; address: string }
    > = {};

    await Promise.all(
      quoteIds.map(async (quoteId) => {
        const quoteDoc = await db.collection("customQuotes").doc(quoteId).get();
        if (!quoteDoc.exists) return;
        const data = quoteDoc.data() || {};
        quoteSummaries[quoteId] = {
          customerName: String(data.name || "Customer"),
          propertyType: String(data.propertyType || ""),
          address: String(data.address || ""),
        };
      })
    );

    const enriched = assignments.map((row) => ({
      ...row,
      quoteSummary: quoteSummaries[row.quoteId] || null,
    }));

    return NextResponse.json({
      success: true,
      assignments: enriched,
      stats: {
        total: enriched.length,
        active: enriched.filter((row) => row.status === "active").length,
        draft: enriched.filter((row) => row.status === "draft").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Partner Quote Assignments GET] Error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to load quote assignments";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
