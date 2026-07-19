import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { declineOverflowOffer } from "@/lib/partner-overflow";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { offerId: string } }
) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const offerId = params.offerId?.trim();
    if (!offerId) {
      return NextResponse.json({ error: "Offer ID is required" }, { status: 400 });
    }

    const result = await declineOverflowOffer(offerId, auth.partner.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to decline offer" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[Partner Overflow Decline] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to decline overflow offer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
