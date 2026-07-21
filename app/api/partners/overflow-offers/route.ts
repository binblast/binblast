import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { serializeOverflowOffer } from "@/lib/partner-overflow";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();
    const snapshot = await db
      .collection("overflowOffers")
      .where("offeredToPartnerId", "==", auth.partner.id)
      .get();

    const offers = (snapshot.docs as FirestoreDocument[])
      .map((docSnap) => serializeOverflowOffer(docSnap.data(), docSnap.id))
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({
      success: true,
      offers,
      stats: {
        pending: offers.filter((offer) => offer.status === "pending").length,
        accepted: offers.filter((offer) => offer.status === "accepted").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Partner Overflow Offers GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load overflow offers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
