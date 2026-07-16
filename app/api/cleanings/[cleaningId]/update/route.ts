import { NextRequest, NextResponse } from "next/server";
import { buildRecurringPreferenceUpdate } from "@/lib/recurring-preference";

export const dynamic = 'force-dynamic';

export async function PUT(
  req: NextRequest,
  { params }: { params: { cleaningId: string } }
) {
  try {
    const { getDbInstance } = await import("@/lib/firebase");
    const { doc, getDoc, updateDoc, serverTimestamp } = await import("firebase/firestore");
    
    const cleaningId = params.cleaningId;
    const body = await req.json();
    const {
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

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    const cleaningDocRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningDoc = await getDoc(cleaningDocRef);

    if (!cleaningDoc.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const cleaningData = cleaningDoc.data();
    const userId = cleaningData.userId as string | undefined;

    if (cleaningData.status === "completed" || cleaningData.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot edit completed or cancelled cleanings" },
        { status: 400 }
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
      updatedAt: serverTimestamp(),
    };

    if (scheduledDate) {
      cleaningUpdate.scheduledDate = scheduledDate;
    }

    await updateDoc(cleaningDocRef, cleaningUpdate);

    if (userId) {
      const userDocRef = doc(db, "users", userId);
      await updateDoc(userDocRef, {
        ...buildRecurringPreferenceUpdate({
          preferredDayOfWeek: trashDay,
          preferredTimeWindow: scheduledTime,
          addressLine1,
          addressLine2: addressLine2 || null,
          city,
          state,
          zipCode,
        }),
        updatedAt: serverTimestamp(),
      });
    }

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
