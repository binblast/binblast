// app/api/operator/employees/[employeeId]/proof/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;
    const searchParams = req.nextUrl.searchParams;
    const cleaningId = searchParams.get("cleaningId");

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
    const { collection, query, where, getDocs, orderBy } = firestore;

    if (cleaningId) {
      // Get proof for specific cleaning
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
          completionPhotoUrl: cleaningData.completionPhotoUrl || null,
          employeeNotes: cleaningData.employeeNotes || null,
          operatorNotes: cleaningData.operatorNotes || null,
          flags: cleaningData.flags || [],
          completedAt: cleaningData.completedAt || null,
        },
      });
    } else {
      // Get all proof for employee's completed stops
      const cleaningsRef = collection(db, "scheduledCleanings");
      const completedQuery = query(
        cleaningsRef,
        where("assignedEmployeeId", "==", employeeId),
        where("status", "==", "completed"),
        orderBy("completedAt", "desc")
      );

      const snapshot = await getDocs(completedQuery);
      const proofs = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          cleaningId: doc.id,
          completionPhotoUrl: data.completionPhotoUrl || null,
          employeeNotes: data.employeeNotes || null,
          operatorNotes: data.operatorNotes || null,
          flags: data.flags || [],
          completedAt: data.completedAt || null,
          scheduledDate: data.scheduledDate || null,
        };
      });

      return NextResponse.json({
        proofs,
      });
    }
  } catch (error: any) {
    console.error("Error getting proof:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get proof" },
      { status: 500 }
    );
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

    // Require photo unless operator override
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

    const updateData: any = {
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
  } catch (error: any) {
    console.error("Error uploading proof:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload proof" },
      { status: 500 }
    );
  }
}

