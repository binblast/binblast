// app/api/training/modules/route.ts
// API routes for training modules

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

// Mark as dynamic to prevent static generation
export const dynamic = 'force-dynamic';

/**
 * GET /api/training/modules
 * List all active training modules (ordered)
 */
export async function GET(req: NextRequest) {
  try {
    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, query, where, orderBy, getDocs } = firestore;

    const searchParams = req.nextUrl.searchParams;
    const activeOnly = searchParams.get("active") !== "false"; // Default to true

    const modulesRef = collection(db, "trainingModules");
    let modulesQuery = query(modulesRef);

    if (activeOnly) {
      modulesQuery = query(modulesRef, where("active", "==", true));
    }

    // Order by order field
    modulesQuery = query(modulesQuery, orderBy("order", "asc"));

    const snapshot = await getDocs(modulesQuery);

    const modules = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
      };
    });

    return NextResponse.json({ modules });
  } catch (error: any) {
    console.error("[Training Modules API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch training modules" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/training/modules
 * Create a new training module (admin/operator only)
 */
export async function POST(req: NextRequest) {
  try {
    // TODO: Add authentication check for admin/operator
    // For now, allow server-side creation

    const db = await getDbInstance();
    if (!db) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const {
      id,
      title,
      description,
      categoryTag,
      durationMinutes,
      order,
      pdfUrl,
      quiz,
      active = true,
      required = false,
      requiredForPayment = false,
    } = body;

    // Validate required fields
    if (!id || !title || !description || !categoryTag || !order) {
      return NextResponse.json(
        { error: "Missing required fields: id, title, description, categoryTag, order" },
        { status: 400 }
      );
    }

    const firestore = await safeImportFirestore();
    const { collection, doc, setDoc, serverTimestamp } = firestore;

    const modulesRef = collection(db, "trainingModules");
    const moduleRef = doc(modulesRef, id);

    const moduleData = {
      id,
      title,
      description,
      categoryTag,
      durationMinutes: durationMinutes || 5,
      order,
      pdfUrl: pdfUrl || "",
      quiz: quiz || [],
      active,
      required,
      requiredForPayment,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(moduleRef, moduleData);

    return NextResponse.json({
      success: true,
      module: {
        ...moduleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Training Modules API] Error creating module:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create training module" },
      { status: 500 }
    );
  }
}
