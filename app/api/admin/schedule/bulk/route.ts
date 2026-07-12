import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess, logAdminAction } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { buildCompletionUpdateData } from "@/lib/cleaning-schedule";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isAdmin, userId } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { jobIds, action, assignedEmployeeId, assignedEmployeeName, status } = body as {
      jobIds?: string[];
      action?: "assign" | "status" | "unassign";
      assignedEmployeeId?: string;
      assignedEmployeeName?: string;
      status?: string;
    };

    if (!Array.isArray(jobIds) || jobIds.length === 0) {
      return NextResponse.json({ error: "jobIds array is required" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");
    const batch = db.batch();
    const updated: string[] = [];
    const userAssignments = new Map<string, { employeeId: string; employeeName: string }>();

    for (const jobId of jobIds) {
      const docRef = db.collection("scheduledCleanings").doc(jobId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) continue;

      const jobData = snapshot.data() || {};

      const updates: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (action === "assign" && assignedEmployeeId && assignedEmployeeName) {
        updates.assignedEmployeeId = assignedEmployeeId;
        updates.assignedEmployeeName = assignedEmployeeName;
        updates.jobStatus = "pending";
        updates.assignmentSource = "manual";

        const userId = typeof jobData.userId === "string" ? jobData.userId : "";
        if (userId) {
          userAssignments.set(userId, {
            employeeId: assignedEmployeeId,
            employeeName: assignedEmployeeName,
          });
        }
      }

      if (action === "unassign") {
        updates.assignedEmployeeId = admin.firestore.FieldValue.delete();
        updates.assignedEmployeeName = admin.firestore.FieldValue.delete();
      }

      if (action === "status" && status) {
        updates.status = status;
        Object.assign(updates, buildCompletionUpdateData(status));
        if (status === "completed") {
          updates.completedAt = admin.firestore.FieldValue.serverTimestamp();
        }
      }

      batch.update(docRef, updates);
      updated.push(jobId);
    }

    await batch.commit();

    if (action === "assign" && userAssignments.size > 0) {
      const userBatch = db.batch();
      for (const [customerUserId, assignment] of userAssignments.entries()) {
        userBatch.update(db.collection("users").doc(customerUserId), {
          defaultAssignedEmployeeId: assignment.employeeId,
          defaultAssignedEmployeeName: assignment.employeeName,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await userBatch.commit();
    }

    await logAdminAction("bulk_schedule_update", userId || "owner", {
      action,
      count: updated.length,
      jobIds: updated,
    });

    return NextResponse.json({
      success: true,
      updated: updated.length,
      message: `Updated ${updated.length} job(s)`,
    });
  } catch (error: unknown) {
    console.error("[Admin Schedule Bulk] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to bulk update jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
