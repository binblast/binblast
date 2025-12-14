// app/api/employee/training/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const moduleId = searchParams.get("moduleId");

    if (!employeeId) {
      return NextResponse.json(
        { error: "Missing employeeId" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = await getDbInstance();
      if (!db) {
        console.error("[Training API] Database instance returned null");
        console.error("[Training API] Check Firebase environment variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID");
        // Log which env vars are actually set (without values)
        const envCheck = {
          hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        console.error("[Training API] Environment variable check:", envCheck);
        return NextResponse.json(
          { 
            error: "Database not available",
            details: process.env.NODE_ENV === "development" ? "Firebase initialization failed. Check server logs." : "Firebase initialization failed. Check Vercel environment variables."
          },
          { status: 500 }
        );
      }
    } catch (dbError: any) {
      console.error("[Training API] Error getting database instance:", dbError?.message || dbError);
      console.error("[Training API] Database error stack:", dbError?.stack);
      // Log which env vars are actually set (without values)
      const envCheck = {
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      console.error("[Training API] Environment variable check:", envCheck);
      return NextResponse.json(
        { 
          error: "Database initialization failed",
          details: process.env.NODE_ENV === "development" ? dbError?.message : "Check Vercel environment variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID"
        },
        { status: 500 }
      );
    }

    const firestore = await import("firebase/firestore");
    const { collection, query, where, getDocs } = firestore;

    // If moduleId provided, return single module progress
    if (moduleId) {
      let trainingRef, trainingQuery, snapshot;
      try {
        trainingRef = collection(db, "employeeTraining");
        trainingQuery = query(
          trainingRef,
          where("employeeId", "==", employeeId),
          where("moduleId", "==", moduleId)
        );
        snapshot = await getDocs(trainingQuery);
      } catch (queryError: any) {
        console.error("[Training API] Error querying Firestore:", queryError?.message || queryError);
        console.error("[Training API] Query error stack:", queryError?.stack);
        return NextResponse.json(
          { 
            error: "Failed to query training data",
            details: process.env.NODE_ENV === "development" ? queryError?.message : undefined
          },
          { status: 500 }
        );
      }

      if (snapshot.empty) {
        return NextResponse.json({
          completed: false,
          progress: 0,
          quizAttempts: 0,
          pdfViewed: false,
          certificationStatus: "not_started",
        });
      }

      const data = snapshot.docs[0].data();
      return NextResponse.json({
        completed: data.completed || false,
        progress: data.progress || 0,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate().toISOString() : data.completedAt,
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : data.expiresAt,
        quizScore: data.quizScore,
        quizAttempts: data.quizAttempts || 0,
        pdfViewed: data.pdfViewed || false,
        certificationStatus: data.certificationStatus || "not_started",
      });
    }

    // Get training progress for all modules
    let trainingRef, trainingQuery, snapshot;
    try {
      trainingRef = collection(db, "employeeTraining");
      trainingQuery = query(
        trainingRef,
        where("employeeId", "==", employeeId)
      );
      snapshot = await getDocs(trainingQuery);
    } catch (queryError: any) {
      console.error("[Training API] Error querying all training data:", queryError?.message || queryError);
      console.error("[Training API] Query error stack:", queryError?.stack);
      return NextResponse.json(
        { 
          error: "Failed to query training data",
          details: process.env.NODE_ENV === "development" ? queryError?.message : undefined
        },
        { status: 500 }
      );
    }

    const progress: Record<string, any> = {};
    snapshot.forEach((doc) => {
      const data = doc.data();
      progress[data.moduleId] = {
        completed: data.completed || false,
        progress: data.progress || 0,
        completedAt: data.completedAt?.toDate ? data.completedAt.toDate().toISOString() : data.completedAt,
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : data.expiresAt,
        quizScore: data.quizScore,
        quizAttempts: data.quizAttempts || 0,
        pdfViewed: data.pdfViewed || false,
        certificationStatus: data.certificationStatus || "in_progress",
      };
    });

    // Return default modules with progress
    const defaultModules = [
      {
        id: "welcome",
        name: "Welcome to Bin Blast Co.",
        description: "Introduction to Bin Blast Co. and your role",
        type: "guide",
        content: "Welcome! This guide will help you understand your role and responsibilities.",
        duration: "5 min",
        completed: progress["welcome"]?.completed || false,
        progress: progress["welcome"]?.progress || 0,
      },
      {
        id: "safety-basics",
        name: "Safety Basics",
        description: "Essential safety protocols and procedures",
        type: "safety",
        content: "Always wear protective gloves and follow safety guidelines when handling bins.",
        duration: "10 min",
        completed: progress["safety-basics"]?.completed || false,
        progress: progress["safety-basics"]?.progress || 0,
      },
      {
        id: "cleaning-process",
        name: "Cleaning Process",
        description: "Step-by-step guide to cleaning bins effectively",
        type: "guide",
        content: "1. Inspect bins for damage\n2. Apply cleaning solution\n3. Scrub thoroughly\n4. Rinse completely\n5. Apply Bin Blast sticker",
        duration: "15 min",
        completed: progress["cleaning-process"]?.completed || false,
        progress: progress["cleaning-process"]?.progress || 0,
      },
      {
        id: "sticker-placement",
        name: "Sticker Placement",
        description: "How to properly place Bin Blast stickers",
        type: "best-practices",
        content: "Place sticker on the front of the bin, ensuring it's visible and secure.",
        duration: "5 min",
        completed: progress["sticker-placement"]?.completed || false,
        progress: progress["sticker-placement"]?.progress || 0,
      },
      {
        id: "photo-documentation",
        name: "Photo Documentation",
        description: "How to take quality completion photos",
        type: "best-practices",
        content: "Take clear photos showing the cleaned bins and sticker placement.",
        duration: "5 min",
        completed: progress["photo-documentation"]?.completed || false,
        progress: progress["photo-documentation"]?.progress || 0,
      },
    ];

    return NextResponse.json({ modules: defaultModules });
  } catch (error: any) {
    console.error("Error loading training:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Failed to load training",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, moduleId, completed, progress } = body;

    if (!employeeId || !moduleId) {
      return NextResponse.json(
        { error: "Missing employeeId or moduleId" },
        { status: 400 }
      );
    }

    let db;
    try {
      db = await getDbInstance();
      if (!db) {
        console.error("[Training API POST] Database instance returned null");
        console.error("[Training API POST] Check Firebase environment variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID");
        // Log which env vars are actually set (without values)
        const envCheck = {
          hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        };
        console.error("[Training API POST] Environment variable check:", envCheck);
        return NextResponse.json(
          { 
            error: "Database not available",
            details: process.env.NODE_ENV === "development" ? "Firebase initialization failed. Check server logs." : "Firebase initialization failed. Check Vercel environment variables."
          },
          { status: 500 }
        );
      }
    } catch (dbError: any) {
      console.error("[Training API POST] Error getting database instance:", dbError?.message || dbError);
      console.error("[Training API POST] Database error stack:", dbError?.stack);
      // Log which env vars are actually set (without values)
      const envCheck = {
        hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };
      console.error("[Training API POST] Environment variable check:", envCheck);
      return NextResponse.json(
        { 
          error: "Database initialization failed",
          details: process.env.NODE_ENV === "development" ? dbError?.message : "Check Vercel environment variables: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_APP_ID"
        },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, getDocs, addDoc, updateDoc, serverTimestamp } = firestore;

    const trainingRef = collection(db, "employeeTraining");
    const existingQuery = query(
      trainingRef,
      where("employeeId", "==", employeeId),
      where("moduleId", "==", moduleId)
    );
    const existingSnapshot = await getDocs(existingQuery);

    const updateData: any = {
      employeeId,
      moduleId,
      completed: completed !== undefined ? completed : false,
      progress: progress !== undefined ? progress : 100,
    };

    if (completed) {
      updateData.completedAt = serverTimestamp();
    }

    if (!existingSnapshot.empty) {
      // Update existing record
      const docRef = existingSnapshot.docs[0].ref;
      await updateDoc(docRef, updateData);
    } else {
      // Create new record
      const moduleNames: Record<string, string> = {
        welcome: "Welcome to Bin Blast Co.",
        "safety-basics": "Safety Basics",
        "cleaning-process": "Cleaning Process",
        "sticker-placement": "Sticker Placement",
        "photo-documentation": "Photo Documentation",
      };
      await addDoc(trainingRef, {
        ...updateData,
        moduleName: moduleNames[moduleId] || moduleId,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error updating training:", error);
    console.error("Error stack:", error.stack);
    return NextResponse.json(
      { 
        error: error.message || "Failed to update training",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

