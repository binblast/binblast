import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const STAFF_ROLES = new Set(["admin", "owner", "operator", "employee"]);

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function serializeDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    const maybeDate = (value as { toDate?: () => Date }).toDate?.();
    if (maybeDate instanceof Date) return maybeDate.toISOString();
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();

    const [usersSnapshot, partnerBookingsSnapshot, cleaningsSnapshot, referralsSnapshot] =
      await Promise.all([
        db.collection("users").orderBy("createdAt", "desc").get(),
        db.collection("partnerBookings").get(),
        db.collection("scheduledCleanings").get(),
        db.collection("referrals").get(),
      ]);

    const partnerCustomerMap = new Map<string, string>();
    partnerBookingsSnapshot.docs.forEach((doc: { data: () => Record<string, unknown> }) => {
      const data = doc.data();
      const customerEmail = asString(data.customerEmail);
      const partnerName = asString(data.partnerName);
      if (customerEmail && partnerName) {
        partnerCustomerMap.set(customerEmail, partnerName);
      }
    });

    const nextCleaningMap = new Map<string, string>();
    cleaningsSnapshot.docs.forEach((doc: { data: () => Record<string, unknown> }) => {
      const data = doc.data();
      const userId = asString(data.userId);
      const status = asString(data.status);
      if (!userId || status === "cancelled" || status === "completed") return;

      const cleaningDate = serializeDate(data.scheduledDate);
      if (!cleaningDate) return;

      const existing = nextCleaningMap.get(userId);
      if (!existing || cleaningDate < existing) {
        nextCleaningMap.set(userId, cleaningDate);
      }
    });

    const referralCountMap = new Map<string, number>();
    referralsSnapshot.docs.forEach((doc: { data: () => Record<string, unknown> }) => {
      const data = doc.data();
      const referrerId = asString(data.referrerId);
      if (!referrerId) return;
      referralCountMap.set(referrerId, (referralCountMap.get(referrerId) || 0) + 1);
    });

    const customers = usersSnapshot.docs
      .map((doc: { id: string; data: () => Record<string, unknown> }) => {
        const data = doc.data();
        const role = asString(data.role) || "customer";
        const email = asString(data.email);

        return {
          id: doc.id,
          firstName: asString(data.firstName),
          lastName: asString(data.lastName),
          email,
          phone: asString(data.phone),
          address: asString(data.address),
          selectedPlan: asString(data.selectedPlan),
          serviceTier: asString(data.selectedPlan),
          status: asString(data.subscriptionStatus) || "inactive",
          loyaltyRanking: asString(data.loyaltyLevel) || "Getting Started",
          referralUsageCount: referralCountMap.get(doc.id) || 0,
          nextScheduledService: nextCleaningMap.get(doc.id) || null,
          totalRevenue: 0,
          source: partnerCustomerMap.has(email) ? "partner" : "direct",
          partnerName: partnerCustomerMap.get(email),
          role,
        };
      })
      .filter((customer: { role: string }) => !STAFF_ROLES.has(customer.role))
      .map(({ role: _role, ...customer }: { role: string }) => customer);

    return NextResponse.json({
      success: true,
      customers,
      stats: {
        total: customers.length,
        active: customers.filter((customer: { status: string }) => customer.status === "active").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Customers GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load customers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
