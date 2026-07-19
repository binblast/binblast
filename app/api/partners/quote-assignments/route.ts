import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { serializeQuotePartnerAssignment } from "@/lib/quote-partner-assignments";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const access = await checkPartnerAccess(req);
    if (!access.isPartner || !access.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerId = access.partner.id;
    const db = await getAdminFirestore();

    let snapshot;
    try {
      snapshot = await db
        .collectionGroup("partnerAssignments")
        .where("partnerId", "==", partnerId)
        .get();
    } catch (queryError: unknown) {
      const message =
        queryError instanceof Error ? queryError.message : String(queryError);
      if (message.includes("index")) {
        return NextResponse.json(
          {
            error:
              "Firestore index required for partner quote assignments. Create a collection group index on partnerAssignments.partnerId.",
          },
          { status: 500 }
        );
      }
      throw queryError;
    }

    const assignments = (snapshot.docs as FirestoreDocument[])
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
