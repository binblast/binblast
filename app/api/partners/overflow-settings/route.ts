import { NextRequest, NextResponse } from "next/server";
import { checkPartnerAccess } from "@/lib/partner-api-auth";
import { DEFAULT_MAX_JOBS_PER_DAY } from "@/lib/partner-overflow";
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
    const { doc, getDoc } = firestore;
    const partnerSnap = await getDoc(doc(db, "partners", auth.partner.id));
    if (!partnerSnap.exists()) {
      return NextResponse.json({ error: "Partner not found" }, { status: 404 });
    }

    const data = partnerSnap.data();
    return NextResponse.json({
      success: true,
      settings: {
        acceptsOverflow: Boolean(data.acceptsOverflow),
        maxJobsPerDay: Number(data.maxJobsPerDay || DEFAULT_MAX_JOBS_PER_DAY),
        partnerTier: String(data.partnerTier || "operator"),
      },
    });
  } catch (error: unknown) {
    console.error("[Partner Overflow Settings GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load overflow settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await checkPartnerAccess(req);
    if (!auth.isPartner || !auth.partner?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.acceptsOverflow === "boolean") {
      updates.acceptsOverflow = body.acceptsOverflow;
    }

    if (body.maxJobsPerDay !== undefined) {
      const maxJobsPerDay = Number(body.maxJobsPerDay);
      if (!Number.isFinite(maxJobsPerDay) || maxJobsPerDay < 1 || maxJobsPerDay > 50) {
        return NextResponse.json(
          { error: "maxJobsPerDay must be between 1 and 50" },
          { status: 400 }
        );
      }
      updates.maxJobsPerDay = Math.floor(maxJobsPerDay);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Database not available" }, { status: 500 });
    }

    const firestore = await safeImportFirestore();
    const { doc, updateDoc, serverTimestamp } = firestore;
    await updateDoc(doc(db, "partners", auth.partner.id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true, ...updates });
  } catch (error: unknown) {
    console.error("[Partner Overflow Settings PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update overflow settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
