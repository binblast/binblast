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

function splitName(fullName: string) {
  const trimmed = fullName.trim();
  const spaceIndex = trimmed.indexOf(" ");
  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: "" };
  }
  return {
    firstName: trimmed.slice(0, spaceIndex),
    lastName: trimmed.slice(spaceIndex + 1),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();

    const [usersSnapshot, siteLeadsSnapshot, partnerBookingsSnapshot, cleaningsSnapshot, referralsSnapshot] =
      await Promise.all([
        db.collection("users").orderBy("createdAt", "desc").get(),
        db.collection("siteLeads").get(),
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
          recordType: "customer" as const,
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
          heardAboutUs: "",
          referredBy: "",
          referralCode: "",
          capturedAt: serializeDate(data.createdAt),
          role,
        };
      })
      .filter((customer: { role: string }) => !STAFF_ROLES.has(customer.role))
      .map(({ role: _role, ...customer }: { role: string }) => customer);

    const registeredEmails = new Set(
      customers.map((customer: { email: string }) => customer.email.trim().toLowerCase()).filter(Boolean)
    );

    const prospects = siteLeadsSnapshot.docs
      .map((doc: { id: string; data: () => Record<string, unknown> }) => {
        const data = doc.data();
        const email = asString(data.email).trim().toLowerCase();
        if (!email || registeredEmails.has(email)) {
          return null;
        }

        const { firstName, lastName } = splitName(asString(data.name));
        const referralCode = asString(data.referralCode);
        const partnerCode = asString(data.partnerCode);

        return {
          id: `lead_${doc.id}`,
          recordType: "prospect" as const,
          firstName,
          lastName,
          email,
          phone: asString(data.phone),
          address: "",
          selectedPlan: "",
          serviceTier: "",
          status: "prospect",
          loyaltyRanking: "Not enrolled",
          referralUsageCount: 0,
          nextScheduledService: null,
          totalRevenue: 0,
          source: "prospect" as const,
          partnerName: partnerCode || undefined,
          heardAboutUs: asString(data.heardAboutUs),
          referredBy: asString(data.referredBy),
          referralCode: referralCode || partnerCode,
          capturedAt: serializeDate(data.createdAt),
        };
      })
      .filter(Boolean);

    const records = [...prospects, ...customers].sort((a, b) => {
      const dateA = a?.capturedAt || "";
      const dateB = b?.capturedAt || "";
      return dateB.localeCompare(dateA);
    });

    return NextResponse.json({
      success: true,
      customers: records,
      stats: {
        total: records.length,
        customers: customers.length,
        prospects: prospects.length,
        active: customers.filter((customer: { status: string }) => customer.status === "active").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Customers GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load customers";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
