import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { acceptOverflowOffer } from "@/lib/partner-overflow";

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

    const result = await acceptOverflowOffer(offerId, auth.partner.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to accept offer" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      message: "Overflow job accepted. Assign it to your team from your dashboard.",
    });
  } catch (error: unknown) {
    console.error("[Partner Overflow Accept] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to accept overflow offer";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
