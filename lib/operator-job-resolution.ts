import { getAdminFirestore } from "@/lib/firebase-admin";
import { scheduleNextCleaningIfNeeded } from "@/lib/cleaning-schedule-admin";

export const OPERATOR_RESOLUTION_TYPES = [
  "bins_not_present",
  "customer_cancelled",
  "access_blocked",
  "reduce_bins",
  "complete_no_photos",
  "skip_stop",
] as const;

export type OperatorResolutionType = (typeof OPERATOR_RESOLUTION_TYPES)[number];

export type ApplyOperatorResolutionParams = {
  jobId: string;
  operatorId: string;
  resolution: OperatorResolutionType;
  notes?: string;
  binCount?: number;
};

export async function applyOperatorJobResolution(params: ApplyOperatorResolutionParams) {
  const db = await getAdminFirestore();
  const admin = await import("firebase-admin");
  const jobRef = db.collection("scheduledCleanings").doc(params.jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    throw new Error("Job not found");
  }

  const jobData = jobDoc.data() || {};
  const now = admin.firestore.FieldValue.serverTimestamp();

  const baseUpdate: Record<string, unknown> = {
    operatorResolution: params.resolution,
    operatorResolvedAt: now,
    operatorResolvedBy: params.operatorId,
    operatorNotes: params.notes || null,
    lastOperatorActionAt: now,
  };

  if (params.resolution === "customer_cancelled") {
    await jobRef.update({
      ...baseUpdate,
      status: "cancelled",
      jobStatus: "cancelled",
      cancelledAt: now,
      cancellationReason: params.notes || "Cancelled by operator",
    });
    return { status: "cancelled" as const };
  }

  if (params.resolution === "reduce_bins") {
    const bins = Math.max(0, Number(params.binCount ?? 0));
    await jobRef.update({
      ...baseUpdate,
      binCount: bins,
      binsCount: bins,
      binsAdjustedByOperator: true,
    });
    return { status: "updated" as const, binCount: bins };
  }

  const skipPhotos =
    params.resolution === "bins_not_present" ||
    params.resolution === "access_blocked" ||
    params.resolution === "complete_no_photos" ||
    params.resolution === "skip_stop";

  const binsCleaned =
    params.resolution === "bins_not_present" || params.resolution === "skip_stop"
      ? 0
      : params.binCount ?? jobData.binCount ?? jobData.binsCount ?? 1;

  await jobRef.update({
    ...baseUpdate,
    status: "completed",
    jobStatus: "completed",
    completedAt: now,
    operatorSkipPhotos: skipPhotos,
    proofOperatorOverride: skipPhotos,
    hasRequiredPhotos: skipPhotos ? true : jobData.hasRequiredPhotos ?? false,
    photoDocumentationStatus: skipPhotos ? "operator_override" : jobData.photoDocumentationStatus,
    binsCleaned,
    binCount: binsCleaned,
    binsCount: binsCleaned,
    binsSkipped: params.resolution === "bins_not_present",
    employeeCanProceed: true,
  });

  try {
    await scheduleNextCleaningIfNeeded({
      id: params.jobId,
      userId: jobData.userId,
      userEmail: jobData.userEmail,
      addressLine1: jobData.addressLine1,
      addressLine2: jobData.addressLine2,
      city: jobData.city,
      state: jobData.state,
      zipCode: jobData.zipCode,
      trashDay: jobData.trashDay,
      scheduledTime: jobData.scheduledTime,
      notes: jobData.notes,
      scheduledDate: jobData.scheduledDate,
      status: "completed",
      jobStatus: "completed",
      assignedEmployeeId: jobData.assignedEmployeeId,
      assignedEmployeeName: jobData.assignedEmployeeName,
    });
  } catch (scheduleError) {
    console.error("[Operator Resolution] schedule next cleaning failed:", scheduleError);
  }

  await db.collection("operatorJobEvents").add({
    jobId: params.jobId,
    employeeId: jobData.assignedEmployeeId || null,
    operatorId: params.operatorId,
    resolution: params.resolution,
    notes: params.notes || null,
    createdAt: now,
  });

  return { status: "completed" as const, skipPhotos, binsCleaned };
}
