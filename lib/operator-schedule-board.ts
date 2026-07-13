import {
  PLAN_LABELS,
  ScheduleJob,
  attachReadinessToJob,
  serializeScheduleDate,
} from "@/lib/schedule-board";

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

export function buildOperatorScheduleJobs(
  cleaningDocs: Array<{ id: string; data: () => Record<string, unknown> }>,
  userMap: Map<string, Record<string, unknown>>
): ScheduleJob[] {
  return cleaningDocs
    .map((doc) => {
      const data = doc.data();
      const user = userMap.get(asString(data.userId));
      const firstName = user ? asString(user.firstName) : "";
      const lastName = user ? asString(user.lastName) : "";
      const planType = asString(data.planType) || (user ? asString(user.selectedPlan) : "");

      const baseJob = {
        id: doc.id,
        userId: asString(data.userId),
        customerName:
          `${firstName} ${lastName}`.trim() ||
          asString(data.userName) ||
          asString(data.customerName) ||
          asString(data.userEmail) ||
          "Unknown Customer",
        customerEmail: asString(data.userEmail) || (user ? asString(user.email) : ""),
        customerPhone: user ? asString(user.phone) : "",
        addressLine1: asString(data.addressLine1),
        addressLine2: asString(data.addressLine2),
        city: asString(data.city),
        state: asString(data.state),
        zipCode: asString(data.zipCode),
        scheduledDate: serializeScheduleDate(data.scheduledDate),
        scheduledTime: asString(data.scheduledTime) || "TBD",
        trashDay: asString(data.trashDay),
        status: asString(data.status) || "pending",
        jobStatus: asString(data.jobStatus),
        operator: asString(data.operator) || asString(data.assignedEmployeeName),
        partner: asString(data.partner),
        planType,
        planLabel: PLAN_LABELS[planType] || planType || "Residential",
        binsCount: asNumber(data.binsCount) || asNumber(data.binCount) || (user ? asNumber(user.binsCount) || 1 : 1),
        notes: asString(data.notes),
        internalNotes: asString(data.internalNotes),
        assignedEmployeeId: asString(data.assignedEmployeeId),
        assignedEmployeeName: asString(data.assignedEmployeeName),
        completedAt: data.completedAt ? serializeScheduleDate(data.completedAt) : null,
        isCommercial:
          planType === "commercial" ||
          planType.includes("commercial") ||
          planType.includes("HOA"),
      };

      return attachReadinessToJob(baseJob, {
        paymentStatus: user ? asString(user.paymentStatus) : "",
        subscriptionStatus: user ? asString(user.subscriptionStatus) : "",
        servicePaused: user ? Boolean(user.servicePaused) : false,
      });
    })
    .sort((a, b) => {
      const dateCompare = a.scheduledDate.localeCompare(b.scheduledDate);
      if (dateCompare !== 0) return dateCompare;
      return a.scheduledTime.localeCompare(b.scheduledTime);
    });
}
