// app/api/employee/training/modules/[moduleId]/complete/route.ts
// API route to mark a module as complete and unlock next module

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * POST /api/employee/training/modules/[moduleId]/complete
 * Mark module complete, unlock next module
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;
    const body = await req.json();
    const { employeeId, score, passed } = body;

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
    const {
      collection,
      query,
      where,
      orderBy,
      getDocs,
      doc,
      setDoc,
      serverTimestamp,
    } = firestore;

    // Get all active modules ordered
    const modulesRef = collection(db, "trainingModules");
    const modulesQuery = query(
      modulesRef,
      where("active", "==", true),
      orderBy("order", "asc")
    );
    const modulesSnapshot = await getDocs(modulesQuery);
    const allModules = modulesSnapshot.docs.map((doc) => ({
      id: doc.id,
      order: doc.data().order,
    }));

    // Find current module order
    const currentModule = allModules.find((m) => m.id === moduleId);
    if (!currentModule) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Get or create progress document
    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    let progressDocRef;
    let progressData: any;

    if (progressSnapshot.empty) {
      progressDocRef = doc(progressRef);
      progressData = {
        employeeId,
        currentModuleOrder: 1,
        modules: {},
        certificates: [],
        overallStatus: "not_started",
        updatedAt: serverTimestamp(),
      };
    } else {
      progressDocRef = progressSnapshot.docs[0].ref;
      progressData = progressSnapshot.docs[0].data();
    }

    // Update module progress
    const modules = progressData.modules || {};
    if (!modules[moduleId]) {
      modules[moduleId] = {
        startedAt: serverTimestamp(),
        pdfViewed: false,
        lastPagePosition: 0,
      };
    }

    modules[moduleId] = {
      ...modules[moduleId],
      completedAt: passed ? serverTimestamp() : modules[moduleId].completedAt,
      score: score || modules[moduleId].score,
      attempts: (modules[moduleId].attempts || 0) + 1,
      lastAttemptAt: serverTimestamp(),
    };

    // Update current module order if passed
    let currentModuleOrder = progressData.currentModuleOrder || 1;
    if (passed) {
      // Find next module
      const nextModule = allModules.find((m) => m.order > currentModule.order);
      if (nextModule) {
        currentModuleOrder = nextModule.order;
      } else {
        // All modules completed
        currentModuleOrder = allModules.length + 1;
      }
    }

    // Determine overall status
    const completedCount = Object.values(modules).filter(
      (m: any) => m.completedAt
    ).length;
    let overallStatus = "not_started";
    if (completedCount === allModules.length && allModules.length > 0) {
      overallStatus = "completed";
    } else if (completedCount > 0) {
      overallStatus = "in_progress";
    }

    // Update progress document
    await setDoc(progressDocRef, {
      ...progressData,
      currentModuleOrder,
      modules,
      overallStatus,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      passed,
      currentModuleOrder,
      overallStatus,
      nextModuleUnlocked: passed && currentModuleOrder <= allModules.length,
    });
  } catch (error: any) {
    console.error("[Training Complete API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete module" },
      { status: 500 }
    );
  }
}
