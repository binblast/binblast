import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function serializeTimestamp(value: unknown): string | null {
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
    const snapshot = await db.collection("siteLeads").get();

    const leads = (snapshot.docs as FirestoreDocument[])
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: asString(data.name),
          email: asString(data.email),
          phone: asString(data.phone),
          referredBy: asString(data.referredBy),
          heardAboutUs: asString(data.heardAboutUs),
          referralCode: asString(data.referralCode),
          partnerCode: asString(data.partnerCode),
          utmSource: asString(data.utmSource),
          utmMedium: asString(data.utmMedium),
          utmCampaign: asString(data.utmCampaign),
          landingPage: asString(data.landingPage),
          pageReferrer: asString(data.pageReferrer),
          status: asString(data.status) || "new",
          source: asString(data.source),
          createdAt: serializeTimestamp(data.createdAt),
        };
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

    return NextResponse.json({
      success: true,
      leads,
      stats: {
        total: leads.length,
        new: leads.filter((lead) => lead.status === "new").length,
      },
    });
  } catch (error: unknown) {
    console.error("[Admin Site Leads GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load site leads";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
