// app/api/operator/employees/[employeeId]/training/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getRequiredModules } from "@/lib/training-modules";
import { getModuleProgress } from "@/lib/training-certification";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const employeeId = params.employeeId;

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    const requiredModules = getRequiredModules();
    const modules = await Promise.all(
      requiredModules.map(async (module) => {
        const progress = await getModuleProgress(employeeId, module.id);
        return {
          moduleId: module.id,
          moduleName: module.name,
          completed: progress.completed,
          completedAt: progress.completedAt?.toISOString(),
          expiresAt: progress.expiresAt?.toISOString(),
          quizScore: progress.quizScore,
          quizAttempts: progress.quizAttempts,
          certificationStatus: progress.certificationStatus,
          requiredForPayment: module.requiredForPayment,
        };
      })
    );

    return NextResponse.json({ modules });
  } catch (error: any) {
    console.error("Error loading training status:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load training status" },
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
    const { moduleId, forceRetraining } = body;

    if (!employeeId || !moduleId) {
      return NextResponse.json(
        { error: "Missing employeeId or moduleId" },
        { status: 400 }
      );
    }

    if (!forceRetraining) {
      return NextResponse.json(
        { error: "forceRetraining must be true" },
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
    const { collection, query, where, getDocs, updateDoc, serverTimestamp } = firestore;

    const trainingRef = collection(db, "employeeTraining");
    const trainingQuery = query(
      trainingRef,
      where("employeeId", "==", employeeId),
      where("moduleId", "==", moduleId)
    );
    const snapshot = await getDocs(trainingQuery);

    if (snapshot.empty) {
      return NextResponse.json(
        { error: "Training record not found" },
        { status: 404 }
      );
    }

    // Force re-training by marking as expired
    await updateDoc(snapshot.docs[0].ref, {
      forcedRetraining: true,
      forcedRetrainingAt: serverTimestamp(),
      certificationStatus: "expired",
      completed: false,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error forcing re-training:", error);
    return NextResponse.json(
      { error: error.message || "Failed to force re-training" },
      { status: 500 }
    );
  }
}

