// app/api/employee/training/[moduleId]/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { getModuleById } from "@/lib/training-modules";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { moduleId } = params;

    if (!moduleId) {
      return NextResponse.json(
        { error: "Missing moduleId" },
        { status: 400 }
      );
    }

    // Try to fetch from Firestore first
    let module: any = null;
    let moduleName = "Training Module";
    let quizData: any = null;

    try {
      const db = await getDbInstance();
      if (db) {
        // Ensure Firebase is initialized, then import Firestore functions directly
        await getDbInstance();
        const firestore = await import("firebase/firestore");
        const { collection, doc, getDoc } = firestore;
        const modulesRef = collection(db, "trainingModules");
        const moduleRef = doc(modulesRef, moduleId);
        const moduleDoc = await getDoc(moduleRef);
        
        if (moduleDoc.exists()) {
          const data = moduleDoc.data();
          moduleName = data.title || data.name || moduleName;
          quizData = data.quiz;
        }
      }
    } catch (firestoreError: any) {
      console.warn("[Quiz GET] Could not fetch from Firestore, trying hardcoded:", firestoreError?.message);
    }

    // Fallback to hardcoded modules if Firestore fetch failed or no quiz data
    if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
      const hardcodedModule = getModuleById(moduleId);
      if (hardcodedModule) {
        module = hardcodedModule;
        moduleName = module.name;
        quizData = module.quiz;
      }
    }

    if (!quizData || !quizData.questions || !Array.isArray(quizData.questions)) {
      return NextResponse.json(
        { error: "Module not found or quiz not available" },
        { status: 404 }
      );
    }

    // Return quiz questions (without correct answers for security)
    const questions = quizData.questions.map((q: any) => ({
      id: q.id || `q-${Math.random()}`,
      question: q.question,
      options: q.options || [],
    }));

    return NextResponse.json({
      moduleId,
      moduleName,
      questions,
      passingScore: quizData.passingScore || 80,
    });
  } catch (error: any) {
    console.error("[Quiz GET] Error fetching quiz:", error);
    console.error("[Quiz GET] Error stack:", error?.stack);
    return NextResponse.json(
      { 
        error: error.message || "Failed to fetch quiz",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  const { moduleId } = params;
  let body: any = null;
  
  try {
    body = await req.json();
    const { employeeId, answers, score, passed } = body || {};

    if (!employeeId || !answers || score === undefined || passed === undefined) {
      return NextResponse.json(
        { error: "Missing required fields", details: { employeeId: !!employeeId, answers: !!answers, score, passed } },
        { status: 400 }
      );
    }

    // Validate data types
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return NextResponse.json(
        { error: "Invalid score value", details: { score } },
        { status: 400 }
      );
    }

    if (typeof passed !== 'boolean') {
      return NextResponse.json(
        { error: "Invalid passed value", details: { passed } },
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

    // Ensure Firebase is initialized, then import Firestore functions directly
    await getDbInstance();
    const firestore = await import("firebase/firestore");
    const {
      collection,
      query,
      where,
      getDocs,
      addDoc,
      updateDoc,
      doc,
      getDoc,
      setDoc,
      serverTimestamp,
      Timestamp,
    } = firestore;

    // Fetch module from Firestore (optional - we don't strictly need it for quiz submission)
    // But we'll try to get the module name for better logging
    let moduleName = "Training Module";
    try {
      const modulesRef = collection(db, "trainingModules");
      const moduleRef = doc(modulesRef, moduleId);
      const moduleDoc = await getDoc(moduleRef);
      if (moduleDoc.exists()) {
        const moduleData = moduleDoc.data();
        moduleName = moduleData.title || moduleData.name || moduleName;
      } else {
        // Fallback to hardcoded modules
        const module = getModuleById(moduleId);
        if (module) {
          moduleName = module.name;
        }
      }
    } catch (moduleError) {
      console.warn("Could not fetch module name, using default:", moduleError);
      // Continue anyway - module name is not critical for quiz submission
    }

    // Get current training progress
    const trainingRef = collection(db, "employeeTraining");
    const trainingQuery = query(
      trainingRef,
      where("employeeId", "==", employeeId),
      where("moduleId", "==", moduleId)
    );
    const trainingSnapshot = await getDocs(trainingQuery);

    // Get current attempt number
    const quizAttemptsRef = collection(db, "trainingQuizAttempts");
    const attemptsQuery = query(
      quizAttemptsRef,
      where("employeeId", "==", employeeId),
      where("moduleId", "==", moduleId)
    );
    const attemptsSnapshot = await getDocs(attemptsQuery);
    const attemptNumber = attemptsSnapshot.size + 1;

    // Store quiz attempt
    try {
      await addDoc(quizAttemptsRef, {
        employeeId,
        moduleId,
        attemptNumber,
        answers,
        score,
        passed,
        completedAt: serverTimestamp(),
      });
    } catch (attemptError: any) {
      console.error("[Quiz API] Error storing quiz attempt:", attemptError);
      throw new Error(`Failed to store quiz attempt: ${attemptError.message}`);
    }

    // Get existing progress
    let existingProgress = 0;
    if (!trainingSnapshot.empty) {
      existingProgress = trainingSnapshot.docs[0].data().progress || 0;
    }

    // Update training progress
    const updateData: any = {
      employeeId,
      moduleId,
      moduleName: moduleName,
      quizScore: score,
      quizAttempts: attemptNumber,
      lastQuizAttempt: serverTimestamp(),
      progress: passed ? 100 : Math.max(existingProgress, score),
    };

    if (passed) {
      const completedAt = new Date();
      updateData.completed = true;
      updateData.completedAt = serverTimestamp();
      // Calculate expiration (6 months from completion)
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 6);
      updateData.expiresAt = Timestamp.fromDate(expirationDate);
      updateData.certificationStatus = "completed";
      updateData.failed = false;
    } else {
      updateData.certificationStatus = "in_progress";
      updateData.failed = true;
      updateData.lastFailedAt = serverTimestamp();
    }

    try {
      if (!trainingSnapshot.empty) {
        // Update existing record
        const docRef = trainingSnapshot.docs[0].ref;
        const existingData = trainingSnapshot.docs[0].data();
        updateData.progress = passed ? 100 : Math.max(existingData.progress || 0, score);
        await updateDoc(docRef, updateData);
      } else {
        // Create new record
        await addDoc(trainingRef, {
          ...updateData,
          pdfViewed: false,
        });
      }
    } catch (trainingError: any) {
      console.error("[Quiz API] Error updating employeeTraining:", trainingError);
      throw new Error(`Failed to update training progress: ${trainingError.message}`);
    }

    // Also update trainingProgress collection (non-blocking - don't fail quiz if this fails)
    try {
      const progressRef = collection(db, "trainingProgress");
      const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
      const progressSnapshot = await getDocs(progressQuery);

      if (!progressSnapshot.empty) {
      const progressDocRef = progressSnapshot.docs[0].ref;
      const progressData = progressSnapshot.docs[0].data();
      const modules = progressData.modules || {};

      if (!modules[moduleId]) {
        modules[moduleId] = {
          startedAt: serverTimestamp(),
          attempts: 0,
          pdfViewed: false,
        };
      }

      // Update module with completion status
      const moduleUpdate: any = {
        ...modules[moduleId],
        attempts: attemptNumber,
        score,
        lastAttemptAt: serverTimestamp(),
        failed: !passed,
        status: passed ? "passed" : "failed",
      };

      // Only set lastFailedAt if failed (Firestore doesn't accept undefined)
      if (!passed) {
        moduleUpdate.lastFailedAt = serverTimestamp();
      } else {
        // Remove lastFailedAt if it exists and quiz is now passed
        if (moduleUpdate.lastFailedAt !== undefined) {
          delete moduleUpdate.lastFailedAt;
        }
      }

      // Only set completedAt if passed and not already set
      if (passed) {
        moduleUpdate.completedAt = serverTimestamp();
        // Calculate expiration (6 months from completion)
        const completedDate = new Date();
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 6);
        moduleUpdate.expiresAt = Timestamp.fromDate(expirationDate);
      }

      modules[moduleId] = moduleUpdate;

      // Check if all modules are completed
      let totalModules = 0;
      let completedModules = 0;
      try {
        const allModulesRef = collection(db, "trainingModules");
        const allModulesQuery = query(
          allModulesRef,
          where("active", "==", true)
        );
        const allModulesSnapshot = await getDocs(allModulesQuery);
        totalModules = allModulesSnapshot.size;
        completedModules = Object.values(modules).filter(
          (m: any) => m.completedAt && (m.completedAt.toDate || typeof m.completedAt === 'string')
        ).length;
      } catch (modulesError: any) {
        console.warn("[Quiz API] Could not fetch total modules count:", modulesError);
        // Continue with default values - this is not critical for quiz submission
        totalModules = 0;
        completedModules = Object.values(modules).filter(
          (m: any) => m.completedAt
        ).length;
      }

      let overallStatus = progressData.overallStatus || "not_started";
      if (completedModules === totalModules && totalModules > 0) {
        overallStatus = "completed";
      } else if (completedModules > 0) {
        overallStatus = "in_progress";
      }

      try {
        await updateDoc(progressDocRef, {
          modules,
          overallStatus,
          updatedAt: serverTimestamp(),
        });
      } catch (updateError: any) {
        console.error("[Quiz API] Error updating trainingProgress:", updateError);
        throw new Error(`Failed to update training progress: ${updateError.message}`);
      }
    } else {
      // Create new progress document if it doesn't exist
      try {
        const progressDocRef = doc(progressRef);
        const modules: any = {};
        
        modules[moduleId] = {
          startedAt: serverTimestamp(),
          attempts: attemptNumber,
          score,
          lastAttemptAt: serverTimestamp(),
          pdfViewed: false,
          failed: !passed,
          lastFailedAt: !passed ? serverTimestamp() : undefined,
          status: passed ? "passed" : "failed",
        };

        if (passed) {
          modules[moduleId].completedAt = serverTimestamp();
          const expirationDate = new Date();
          expirationDate.setMonth(expirationDate.getMonth() + 6);
          modules[moduleId].expiresAt = Timestamp.fromDate(expirationDate);
        }

        await setDoc(progressDocRef, {
          employeeId,
          currentModuleOrder: 1,
          modules,
          certificates: [],
          overallStatus: passed ? "in_progress" : "not_started",
          updatedAt: serverTimestamp(),
        });
      } catch (createError: any) {
        console.error("[Quiz API] Error creating trainingProgress:", createError);
        throw new Error(`Failed to create training progress: ${createError.message}`);
      }
      }
    } catch (progressError: any) {
      // Log but don't fail the quiz submission - the main quiz attempt and employeeTraining are already saved
      console.error("[Quiz API] Warning: Failed to update trainingProgress collection:", progressError);
      console.error("[Quiz API] Progress error details:", {
        message: progressError?.message,
        code: progressError?.code,
        employeeId,
        moduleId,
      });
      // Continue - quiz attempt and employeeTraining are already saved successfully
    }

    return NextResponse.json({
      success: true,
      passed,
      score,
      attemptNumber,
    });
  } catch (error: any) {
    console.error("[Quiz API] Error submitting quiz:", error);
    console.error("[Quiz API] Error stack:", error?.stack);
    console.error("[Quiz API] Error details:", {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      moduleId,
      employeeId: body?.employeeId,
    });
    return NextResponse.json(
      { 
        error: error.message || "Failed to submit quiz",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

