import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = ["pending", "hold", "approved", "rejected"] as const;
type ApplicationStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = params instanceof Promise ? await params : params;
    const applicationId = resolvedParams.id;
    const body = await req.json();
    const { status, notes, reason } = body as {
      status?: ApplicationStatus;
      notes?: string;
      reason?: string;
    };

    if (!applicationId) {
      return NextResponse.json({ error: "Application ID is required" }, { status: 400 });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const { getDbInstance } = await import("@/lib/firebase");
    const { safeImportFirestore } = await import("@/lib/firebase-module-loader");
    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json({ error: "Firebase is not configured" }, { status: 500 });
    }

    const applicationRef = doc(db, "partnerApplications", applicationId);
    const applicationDoc = await getDoc(applicationRef);

    if (!applicationDoc.exists()) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const applicationData = applicationDoc.data();

    if (status === "approved") {
      return NextResponse.json(
        { error: "Use the approve action to approve applications and create partner records." },
        { status: 400 }
      );
    }

    if (status === "pending" && applicationData.linkedPartnerId) {
      return NextResponse.json(
        {
          error:
            "This application is already linked to a partner account. Manage the partner under Active Partners.",
        },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      status,
      updatedAt: serverTimestamp(),
    };

    if (status === "hold") {
      updates.holdNotes = notes || null;
    }

    if (status === "rejected") {
      updates.rejectionReason = reason || null;
    }

    if (status === "pending") {
      updates.holdNotes = null;
      updates.rejectionReason = null;
    }

    await updateDoc(applicationRef, updates);

    return NextResponse.json({
      success: true,
      message: `Application marked as ${status}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update application status";
    console.error("[Application Status] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
