import { NextRequest, NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/admin-auth";
import { getAdminFirestore } from "@/lib/firebase-admin";
import {
  PLAN_LABELS,
  ScheduleJob,
  ScheduleStaffMember,
  attachReadinessToJob,
  buildScheduleStats,
  serializeScheduleDate,
} from "@/lib/schedule-board";

export const dynamic = "force-dynamic";

interface FirestoreDocument {
  id: string;
  data: () => Record<string, unknown>;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await getAdminFirestore();
    const [cleaningsSnapshot, usersSnapshot] = await Promise.all([
      db.collection("scheduledCleanings").get(),
      db.collection("users").get(),
    ]);

    const userMap = new Map<string, Record<string, unknown>>();
    const staff: ScheduleStaffMember[] = [];

    (usersSnapshot.docs as FirestoreDocument[]).forEach((doc) => {
      const data = doc.data();
      userMap.set(doc.id, data);

      const role = asString(data.role);
      if (role === "employee" || role === "operator") {
        const firstName = asString(data.firstName);
        const lastName = asString(data.lastName);
        staff.push({
          id: doc.id,
          name: `${firstName} ${lastName}`.trim() || asString(data.email),
          role,
          email: asString(data.email),
        });
      }
    });

    staff.sort((a, b) => a.name.localeCompare(b.name));

    const jobs: ScheduleJob[] = (cleaningsSnapshot.docs as FirestoreDocument[])
      .map((doc) => {
        const data = doc.data();
        const user = userMap.get(asString(data.userId));
        const firstName = user ? asString(user.firstName) : "";
        const lastName = user ? asString(user.lastName) : "";
        const planType = asString(data.planType);

        const baseJob = {
          id: doc.id,
          userId: asString(data.userId),
          customerName:
            `${firstName} ${lastName}`.trim() ||
            asString(data.userName) ||
            asString(data.customerName) ||
            "Unknown",
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
          planLabel: PLAN_LABELS[planType] || planType || "N/A",
          binsCount: asNumber(data.binsCount) || (user ? asNumber(user.binsCount) || 1 : 1),
          notes: asString(data.notes),
          internalNotes: asString(data.internalNotes),
          assignedEmployeeId: asString(data.assignedEmployeeId),
          assignedEmployeeName: asString(data.assignedEmployeeName),
          completedAt: data.completedAt ? serializeScheduleDate(data.completedAt) : null,
          isCommercial: planType === "commercial",
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

    const cities = [...new Set(jobs.map((job) => job.city).filter(Boolean))].sort();
    const partners = [...new Set(jobs.map((job) => job.partner).filter(Boolean))].sort();

    return NextResponse.json({
      success: true,
      jobs,
      staff,
      cities,
      partners,
      stats: buildScheduleStats(jobs),
    });
  } catch (error: unknown) {
    console.error("[Admin Schedule GET] Error:", error);
    const message = error instanceof Error ? error.message : "Failed to load schedule board";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
