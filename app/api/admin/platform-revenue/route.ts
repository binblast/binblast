import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

type FirestoreDoc = { id: string; data: () => Record<string, unknown> };

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.getTime();
  }
  if (typeof value === "object" && value !== null && "seconds" in value) {
    return Number((value as { seconds: number }).seconds) * 1000;
  }
  const parsed = new Date(value as string | number).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partnerIdFilter = req.nextUrl.searchParams.get("partnerId")?.trim() || "";
    const db = await getAdminFirestore();

    const [bookingsSnapshot, partnersSnapshot] = await Promise.all([
      db.collection("partnerBookings").get(),
      db.collection("partners").get(),
    ]);

    const partnersById = new Map<string, Record<string, unknown>>();
    partnersSnapshot.docs.forEach((doc: FirestoreDoc) => {
      partnersById.set(doc.id, { id: doc.id, ...doc.data() });
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartMs = monthStart.getTime();

    let totalCustomerPaidCents = 0;
    let totalPartnerShareCents = 0;
    let totalPlatformShareCents = 0;
    let mtdCustomerPaidCents = 0;
    let mtdPartnerShareCents = 0;
    let mtdPlatformShareCents = 0;

    type RevenueBookingRow = {
      id: string;
      partnerId: string;
      partnerBusinessName: string;
      partnerCode: string;
      customerEmail: string;
      customerName: string | null;
      planName: string;
      bookingAmountCents: number;
      partnerShareAmountCents: number;
      platformShareAmountCents: number;
      commissionStatus: string;
      status: string;
      stripeSessionId: string | null;
      stripeTransferId: string | null;
      createdAtMs: number;
      createdAt: string | null;
    };

    const bookings = bookingsSnapshot.docs
      .map((doc: FirestoreDoc): RevenueBookingRow | null => {
        const data = doc.data();
        const partnerId = String(data.partnerId || "");
        if (partnerIdFilter && partnerId !== partnerIdFilter) {
          return null;
        }

        const partner = partnersById.get(partnerId);
        const bookingAmount = Number(data.bookingAmount || 0);
        const partnerShareAmount = Number(data.partnerShareAmount || 0);
        const platformShareAmount = Number(
          data.platformShareAmount ||
            Math.max(0, bookingAmount - partnerShareAmount)
        );
        const createdAtMs = toMillis(data.createdAt);

        totalCustomerPaidCents += bookingAmount;
        totalPartnerShareCents += partnerShareAmount;
        totalPlatformShareCents += platformShareAmount;

        if (createdAtMs >= monthStartMs) {
          mtdCustomerPaidCents += bookingAmount;
          mtdPartnerShareCents += partnerShareAmount;
          mtdPlatformShareCents += platformShareAmount;
        }

        return {
          id: doc.id,
          partnerId,
          partnerBusinessName: String(partner?.businessName || "Unknown partner"),
          partnerCode: String(partner?.partnerCode || partner?.referralCode || ""),
          customerEmail: String(data.customerEmail || ""),
          customerName: data.customerName ? String(data.customerName) : null,
          planName: String(data.planName || data.planId || "Plan"),
          bookingAmountCents: bookingAmount,
          partnerShareAmountCents: partnerShareAmount,
          platformShareAmountCents: platformShareAmount,
          commissionStatus: String(data.commissionStatus || "pending"),
          status: String(data.status || "active"),
          stripeSessionId: data.stripeSessionId ? String(data.stripeSessionId) : null,
          stripeTransferId: data.stripeTransferId ? String(data.stripeTransferId) : null,
          createdAtMs,
          createdAt: createdAtMs ? new Date(createdAtMs).toISOString() : null,
        };
      })
      .filter((booking: RevenueBookingRow | null): booking is RevenueBookingRow => booking !== null)
      .sort((a: RevenueBookingRow, b: RevenueBookingRow) => b.createdAtMs - a.createdAtMs);

    return NextResponse.json({
      success: true,
      summary: {
        bookingCount: bookings.length,
        totalCustomerPaidCents,
        totalPartnerShareCents,
        totalPlatformShareCents,
        mtdCustomerPaidCents,
        mtdPartnerShareCents,
        mtdPlatformShareCents,
      },
      bookings,
      partners: Array.from(partnersById.values()).map((partner) => ({
        id: String(partner.id),
        businessName: String(partner.businessName || "Partner"),
        partnerCode: String(partner.partnerCode || partner.referralCode || ""),
      })),
    });
  } catch (error: unknown) {
    console.error("[Platform Revenue] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch platform revenue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
