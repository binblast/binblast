// app/api/employee/training/progress/route.ts
// API routes for employee training progress

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

/**
 * GET /api/employee/training/progress
 * Get employee's training progress
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId parameter" },
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
    const { collection, query, where, getDocs, doc, getDoc } = firestore;

    // Try new trainingProgress collection first
    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    if (!progressSnapshot.empty) {
      const progressDoc = progressSnapshot.docs[0];
      const data = progressDoc.data();
      
      return NextResponse.json({
        id: progressDoc.id,
        employeeId: data.employeeId,
        currentModuleOrder: data.currentModuleOrder || 1,
        modules: data.modules || {},
        certificates: data.certificates || [],
        nextRecertDueAt: data.nextRecertDueAt?.toDate?.()?.toISOString(),
        overallStatus: data.overallStatus || "not_started",
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
      });
    }

    // Fallback to legacy employeeTraining collection
    const legacyTrainingRef = collection(db, "employeeTraining");
    const legacyQuery = query(legacyTrainingRef, where("employeeId", "==", employeeId));
    const legacySnapshot = await getDocs(legacyQuery);

    const modules: Record<string, any> = {};
    legacySnapshot.forEach((doc) => {
      const data = doc.data();
      modules[data.moduleId] = {
        startedAt: data.startedAt?.toDate?.()?.toISOString(),
        completedAt: data.completedAt?.toDate?.()?.toISOString(),
        score: data.quizScore,
        attempts: data.quizAttempts || 0,
        lastAttemptAt: data.lastQuizAttempt?.toDate?.()?.toISOString(),
        pdfViewed: data.pdfViewed || false,
        lastPagePosition: data.lastPagePosition || 0,
      };
    });

    // Determine overall status
    const completedModules = Object.values(modules).filter((m: any) => m.completedAt).length;
    const totalModules = Object.keys(modules).length;
    let overallStatus = "not_started";
    if (completedModules === totalModules && totalModules > 0) {
      overallStatus = "completed";
    } else if (completedModules > 0) {
      overallStatus = "in_progress";
    }

    return NextResponse.json({
      employeeId,
      currentModuleOrder: 1, // Default
      modules,
      certificates: [],
      nextRecertDueAt: null,
      overallStatus,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Training Progress API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch training progress" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employee/training/progress
 * Update training progress (internal use)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, moduleId, updates } = body;

    if (!employeeId || !moduleId) {
      return NextResponse.json(
        { error: "Missing employeeId or moduleId" },
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
    const { collection, query, where, getDocs, doc, setDoc, getDoc, serverTimestamp } = firestore;

    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    let progressDocRef;
    let progressData: any;
    
    if (progressSnapshot.empty) {
      // Create new progress document
      progressDocRef = doc(progressRef);
      progressData = {
        employeeId,
        currentModuleOrder: 1,
        modules: {},
        certificates: [],
        overallStatus: "not_started",
        updatedAt: serverTimestamp(),
      };
      await setDoc(progressDocRef, progressData);
    } else {
      progressDocRef = progressSnapshot.docs[0].ref;
      progressData = progressSnapshot.docs[0].data();
    }

    // Update module progress
    const modules = progressData?.modules || {};

    if (!modules[moduleId]) {
      modules[moduleId] = {
        startedAt: serverTimestamp(),
        pdfViewed: false,
        lastPagePosition: 0,
      };
    }

    // Merge updates
    modules[moduleId] = {
      ...modules[moduleId],
      ...updates,
      updatedAt: serverTimestamp(),
    };

    // Update document
    await setDoc(progressDocRef, {
      ...progressData,
      modules,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Progress updated successfully",
    });
  } catch (error: any) {
    console.error("[Training Progress API] Error updating progress:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update training progress" },
      { status: 500 }
    );
  }
}
