import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { serializeOverflowOffer } from "@/lib/partner-overflow";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;

    const offersQuery = query(
      collection(db, "overflowOffers"),
      where("offeredToPartnerId", "==", auth.partner.id)
    );
    const snapshot = await getDocs(offersQuery);

    const offers = snapshot.docs
      .map((docSnap) => serializeOverflowOffer(docSnap.data() as Record<string, unknown>, docSnap.id))
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
