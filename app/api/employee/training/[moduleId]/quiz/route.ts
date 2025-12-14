// app/api/employee/training/[moduleId]/quiz/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { getModuleById } from "@/lib/training-modules";

export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { moduleId } = params;
    const module = getModuleById(moduleId);

    if (!module) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Return quiz questions (without correct answers for security)
    const questions = module.quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
    }));

    return NextResponse.json({
      moduleId,
      moduleName: module.name,
      questions,
      passingScore: module.quiz.passingScore,
    });
  } catch (error: any) {
    console.error("Error fetching quiz:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const { moduleId } = params;
    const body = await req.json();
    const { employeeId, answers, score, passed } = body;

    if (!employeeId || !answers || score === undefined || passed === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
    await addDoc(quizAttemptsRef, {
      employeeId,
      moduleId,
      attemptNumber,
      answers,
      score,
      passed,
      completedAt: serverTimestamp(),
    });

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

    // Also update trainingProgress collection
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
        lastFailedAt: !passed ? serverTimestamp() : undefined,
        status: passed ? "passed" : "failed",
      };

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
      const allModulesRef = collection(db, "trainingModules");
      const allModulesQuery = query(
        allModulesRef,
        where("active", "==", true)
      );
      const allModulesSnapshot = await getDocs(allModulesQuery);
      const totalModules = allModulesSnapshot.size;
      const completedModules = Object.values(modules).filter(
        (m: any) => m.completedAt
      ).length;

      let overallStatus = progressData.overallStatus || "not_started";
      if (completedModules === totalModules && totalModules > 0) {
        overallStatus = "completed";
      } else if (completedModules > 0) {
        overallStatus = "in_progress";
      }

      await updateDoc(progressDocRef, {
        modules,
        overallStatus,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new progress document if it doesn't exist
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
    }

    return NextResponse.json({
      success: true,
      passed,
      score,
      attemptNumber,
    });
  } catch (error: any) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: error.message || "Failed to submit quiz" },
      { status: 500 }
    );
  }
}

