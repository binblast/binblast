import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore } from "@/lib/firebase-admin";
import { appendStandardPrepNote } from "@/lib/cleaning-readiness";
import { buildRecurringPreferenceUpdate } from "@/lib/recurring-preference";
import { shouldConsumeCleaningCredit } from "@/lib/cleaning-allocation";
import { assertCanScheduleAnotherCleaning, loadUserSchedulingContext } from "@/lib/cleaning-schedule-validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      userEmail,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      trashDay,
      scheduledDate,
      scheduledTime,
      notes,
      binsCount = 1,
    } = body;

    if (
      !userId ||
      !addressLine1 ||
      !city ||
      !state ||
      !zipCode ||
      !trashDay ||
      !scheduledDate ||
      !scheduledTime
    ) {
      return NextResponse.json(
        { error: "All required scheduling fields must be provided." },
        { status: 400 }
      );
    }

    await assertCanScheduleAnotherCleaning(userId, scheduledDate);

    const { allocation } = await loadUserSchedulingContext(userId);
    const db = await getAdminFirestore();
    const admin = await import("firebase-admin");

    const cleaningRef = await db.collection("scheduledCleanings").add({
      userId,
      userEmail: userEmail || null,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      zipCode,
      trashDay,
      scheduledDate,
      scheduledTime,
      notes: notes || null,
      binsCount: Number(binsCount) || 1,
      internalNotes: appendStandardPrepNote(null),
      status: "upcoming",
      billingCoverage: shouldConsumeCleaningCredit(allocation) ? "paid_extra" : "plan_included",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection("users").doc(userId).update({
      ...buildRecurringPreferenceUpdate({
        preferredDayOfWeek: trashDay,
        preferredTimeWindow: scheduledTime,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        zipCode,
      }),
      pendingCleaningConfirmation: false,
      pendingCleaningData: null,
      ...(shouldConsumeCleaningCredit(allocation)
        ? {
            cleaningCredits: Math.max(0, allocation.cleaningCredits - 1),
          }
        : {}),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      cleaningId: cleaningRef.id,
    });
  } catch (error: any) {
    console.error("[Schedule Cleaning API] Error:", error);
    const status = error.message?.includes("plan limit") ? 403 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to schedule cleaning." },
      { status }
    );
  }
}
