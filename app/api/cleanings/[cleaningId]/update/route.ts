import { NextRequest, NextResponse } from "next/server";
import { buildRecurringPreferenceUpdate } from "@/lib/recurring-preference";
import { assertCanModifyCleaning } from "@/lib/cleaning-schedule-validation";
import { getAdminFirestore } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function PUT(
  req: NextRequest,
  { params }: { params: { cleaningId: string } }
) {
  try {
    const cleaningId = params.cleaningId;
    const body = await req.json();
    const {
      userId,
      addressLine1,
      addressLine2,
      city,
      state,
      zipCode,
      trashDay,
      scheduledDate,
      scheduledTime,
      notes,
    } = body;

    if (!cleaningId) {
      return NextResponse.json(
        { error: "Cleaning ID is required" },
        { status: 400 }
      );
    }

    const db = await getAdminFirestore();
    const cleaningDoc = await db.collection("scheduledCleanings").doc(cleaningId).get();

    if (!cleaningDoc.exists) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const cleaningData = cleaningDoc.data() || {};
    const cleaningUserId = (userId || cleaningData.userId) as string | undefined;

    if (!cleaningUserId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    if (cleaningData.status === "completed" || cleaningData.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot edit completed or cancelled cleanings" },
        { status: 400 }
      );
    }

    try {
      await assertCanModifyCleaning(cleaningUserId, cleaningId);
    } catch (policyError: any) {
      return NextResponse.json(
        { error: policyError.message || "This cleaning can no longer be changed." },
        { status: 403 }
      );
    }

    if (!addressLine1 || !city || !state || !zipCode || !trashDay || !scheduledTime) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    const cleaningUpdate: Record<string, unknown> = {
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      zipCode,
      trashDay,
      scheduledTime,
      notes: notes || null,
      updatedAt: new Date(),
    };

    if (scheduledDate) {
      cleaningUpdate.scheduledDate = scheduledDate;
    }

    await db.collection("scheduledCleanings").doc(cleaningId).update(cleaningUpdate);

    const userDocRef = db.collection("users").doc(cleaningUserId);
    await userDocRef.update({
      ...buildRecurringPreferenceUpdate({
        preferredDayOfWeek: trashDay,
        preferredTimeWindow: scheduledTime,
        addressLine1,
        addressLine2: addressLine2 || null,
        city,
        state,
        zipCode,
      }),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Cleaning updated successfully",
    });
  } catch (err: any) {
    console.error("Error updating cleaning:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update cleaning" },
      { status: 500 }
    );
  }
}
