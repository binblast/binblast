import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = new Set(["new", "contacted", "converted", "archived", "spam"]);

export async function POST(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const action = typeof body.action === "string" ? body.action.trim() : "";
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0)
      : [];

    if (!action) {
      return NextResponse.json({ error: "action is required" }, { status: 400 });
    }

    if (ids.length === 0) {
      return NextResponse.json({ error: "At least one lead id is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const batch = db.batch();

    if (action === "delete") {
      for (const id of ids) {
        batch.delete(db.collection("siteLeads").doc(id));
      }
      await batch.commit();
      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (action === "updateStatus") {
      const status = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
      if (!ALLOWED_STATUSES.has(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }

      for (const id of ids) {
        batch.update(db.collection("siteLeads").doc(id), {
          status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      return NextResponse.json({ success: true, updated: ids.length, status });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error: unknown) {
    console.error("[Admin Site Leads Bulk] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process bulk action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
