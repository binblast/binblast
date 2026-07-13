// app/api/operator/employees/[employeeId]/proof/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getTodayDateString } from "@/lib/employee-utils";

export const dynamic = "force-dynamic";

function isCompletedCleaning(data: Record<string, unknown>): boolean {
  return data.status === "completed" || data.jobStatus === "completed";
}

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const searchParams = req.nextUrl.searchParams;
    const cleaningId = searchParams.get("cleaningId");
    const todayOnly = searchParams.get("todayOnly") !== "0";

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs } = firestore;
    const today = getTodayDateString();

    if (cleaningId) {
      const { doc, getDoc } = firestore;
      const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
      const cleaningSnap = await getDoc(cleaningRef);

      if (!cleaningSnap.exists()) {
        return NextResponse.json(
          { error: "Cleaning not found" },
          { status: 404 }
        );
      }

      const cleaningData = cleaningSnap.data();

      return NextResponse.json({
        proof: {
          cleaningId,
          completionPhotoUrl: cleaningData.completionPhotoUrl || null,
          insidePhotoUrl: cleaningData.insidePhotoUrl || null,
          outsidePhotoUrl: cleaningData.outsidePhotoUrl || null,
          employeeNotes: cleaningData.employeeNotes || null,
          operatorNotes: cleaningData.operatorNotes || null,
          flags: cleaningData.flags || [],
          completedAt: cleaningData.completedAt || cleaningData.operatorResolvedAt || null,
          customerName: cleaningData.customerName || cleaningData.userEmail || null,
          addressLine1: cleaningData.addressLine1 || null,
          city: cleaningData.city || null,
          operatorSkipPhotos: cleaningData.operatorSkipPhotos === true,
        },
      });
    }

    const cleaningsRef = collection(db, "scheduledCleanings");
    const assignedQuery = query(
      cleaningsRef,
      where("assignedEmployeeId", "==", employeeId)
    );

    const snapshot = await getDocs(assignedQuery);
    const proofs = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          cleaningId: docSnap.id,
          completionPhotoUrl: data.completionPhotoUrl || null,
          insidePhotoUrl: data.insidePhotoUrl || null,
          outsidePhotoUrl: data.outsidePhotoUrl || null,
          employeeNotes: data.employeeNotes || null,
          operatorNotes: data.operatorNotes || null,
          flags: data.flags || [],
          completedAt: data.completedAt || data.operatorResolvedAt || null,
          scheduledDate: data.scheduledDate || null,
          scheduledTime: data.scheduledTime || null,
          customerName: data.customerName || data.userEmail || null,
          addressLine1: data.addressLine1 || null,
          addressLine2: data.addressLine2 || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          status: data.status || data.jobStatus || null,
          operatorSkipPhotos: data.operatorSkipPhotos === true,
        };
      })
      .filter((proof) => isCompletedCleaning(proof as Record<string, unknown>))
      .filter((proof) => (todayOnly ? proof.scheduledDate === today : true))
      .sort((a, b) => {
        const aTime = a.completedAt?.seconds || a.completedAt?.toDate?.()?.getTime?.() || 0;
        const bTime = b.completedAt?.seconds || b.completedAt?.toDate?.()?.getTime?.() || 0;
        return Number(bTime) - Number(aTime);
      });

    return NextResponse.json({ proofs });
  } catch (error: unknown) {
    console.error("Error getting proof:", error);
    const message = error instanceof Error ? error.message : "Failed to get proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const body = await req.json();
    const { cleaningId, photoUrl, note, isOperatorOverride } = body;

    if (!employeeId || !cleaningId) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, cleaningId" },
        { status: 400 }
      );
    }

    if (!photoUrl && !isOperatorOverride) {
      return NextResponse.json(
        { error: "Photo is required unless operator override is provided" },
        { status: 400 }
      );
    }

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const cleaningRef = doc(db, "scheduledCleanings", cleaningId);
    const cleaningSnap = await getDoc(cleaningRef);

    if (!cleaningSnap.exists()) {
      return NextResponse.json(
        { error: "Cleaning not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };

    if (photoUrl) {
      updateData.completionPhotoUrl = photoUrl;
    }

    if (note) {
      if (isOperatorOverride) {
        updateData.operatorNotes = note;
        updateData.proofOperatorOverride = true;
      } else {
        updateData.employeeNotes = note;
      }
    }

    await updateDoc(cleaningRef, updateData);

    return NextResponse.json({
      success: true,
      message: "Proof uploaded successfully",
    });
  } catch (error: unknown) {
    console.error("Error uploading proof:", error);
    const message = error instanceof Error ? error.message : "Failed to upload proof";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
