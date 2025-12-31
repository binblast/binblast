// app/api/cleanings/[cleaningId]/update/route.ts
import { NextRequest, NextResponse } from "next/server";

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
      scheduledTime,
      notes,
    } = body;

    if (!cleaningId) {
      return NextResponse.json(
        { error: "Cleaning ID is required" },
        { status: 400 }
      );
    }

    // Get user from auth header or session
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      // Extract user ID from auth header if needed
      // For now, we'll get it from the cleaning document
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Firebase is not configured" },
        { status: 500 }
      );
    }

    // Get the cleaning document
    const cleaningDocRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningDoc = await getDoc(cleaningDocRef);

    if (!cleaningDoc.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const cleaningData = cleaningDoc.data();
    
    // Get userId from cleaning document (for now, we'll allow updates if user matches)
    // In production, you'd want to verify the user is authenticated and matches
    userId = cleaningData.userId;

    // Rescheduling is now allowed at any time - no time restriction

    // Check if cleaning is already completed or cancelled
    if (cleaningData.status === "completed" || cleaningData.status === "cancelled") {
      return NextResponse.json(
        { error: "Cannot edit completed or cancelled cleanings" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!addressLine1 || !city || !state || !zipCode || !trashDay || !scheduledTime) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // Update the cleaning document
    await updateDoc(cleaningDocRef, {
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      zipCode,
      trashDay,
      scheduledTime,
      notes: notes || null,
      updatedAt: serverTimestamp(),
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

