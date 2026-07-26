import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { buildCompletionUpdateData } from "@/lib/cleaning-schedule";
import { scheduleNextCleaningIfNeeded } from "@/lib/cleaning-schedule-admin";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { cleaningId: string } }
) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleaningId = params.cleaningId;
    const body = await req.json();

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const docRef = db.collection("scheduledCleanings").doc(cleaningId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json({ error: "Cleaning not found" }, { status: 404 });
    }

    const existing = snapshot.data() || {};
    const updates: Record<string, unknown> = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const allowedFields = [
      "status",
      "operator",
      "partner",
      "notes",
      "internalNotes",
      "scheduledDate",
      "scheduledTime",
      "trashDay",
      "addressLine1",
      "addressLine2",
      "city",
      "state",
      "zipCode",
      "assignedEmployeeId",
      "assignedEmployeeName",
      "binsCount",
    ] as const;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (typeof body.status === "string") {
      Object.assign(updates, buildCompletionUpdateData(body.status));
      if (body.status === "completed") {
        updates.completedAt = admin.firestore.FieldValue.serverTimestamp();
      }
    }

    if (body.clearAssignment === true) {
      updates.assignedEmployeeId = admin.firestore.FieldValue.delete();
      updates.assignedEmployeeName = admin.firestore.FieldValue.delete();
      updates.jobStatus = admin.firestore.FieldValue.delete();
    } else if (
      typeof body.assignedEmployeeId === "string" &&
      body.assignedEmployeeId.length > 0
    ) {
      updates.jobStatus = "pending";
      updates.assignmentSource = "manual";
    }

    await docRef.update(updates);

    if (body.status === "completed") {
      await scheduleNextCleaningIfNeeded({
        id: cleaningId,
        ...existing,
        ...updates,
      });
    }

    await logAdminAction("update_schedule_job", userId || "owner", {
      cleaningId,
      updates: Object.keys(updates),
    });

    return NextResponse.json({
      success: true,
      message: "Job updated successfully",
    });
  } catch (error: unknown) {
    console.error("[Admin Schedule PATCH] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to update job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
