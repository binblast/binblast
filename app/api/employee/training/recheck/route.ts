// app/api/employee/training/recheck/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkCertificationStatus, isExpired, calculateExpiration } from "@/lib/training-certification";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId } = body;

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
    const { collection, query, where, getDocs, updateDoc } = firestore;

    // Get all training records for this employee
    const trainingRef = collection(db, "employeeTraining");
    const trainingQuery = query(
      trainingRef,
      where("employeeId", "==", employeeId)
    );
    const snapshot = await getDocs(trainingQuery);

    let updatedCount = 0;

    snapshot.forEach(async (doc) => {
      const data = doc.data();
      const completedAt = data.completedAt?.toDate ? data.completedAt.toDate() : data.completedAt;

      if (data.completed && completedAt) {
        // Check if expired
        if (isExpired(completedAt) || data.forcedRetraining) {
          await updateDoc(doc.ref, {
            certificationStatus: "expired",
          });
          updatedCount++;
        } else {
          // Update expiration date if missing
          if (!data.expiresAt) {
            const expiration = calculateExpiration(completedAt);
            await updateDoc(doc.ref, {
              expiresAt: expiration,
            });
          }
        }
      }
    });

    // Get updated certification status
    const certification = await checkCertificationStatus(employeeId);

    return NextResponse.json({
      success: true,
      updatedCount,
      certification,
    });
  } catch (error: any) {
    console.error("Error rechecking certifications:", error);
    return NextResponse.json(
      { error: error.message || "Failed to recheck certifications" },
      { status: 500 }
    );
  }
}

