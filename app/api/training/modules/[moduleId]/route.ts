// app/api/training/modules/[moduleId]/route.ts
// API routes for individual training modules

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

/**
 * GET /api/training/modules/[moduleId]
 * Get a single training module
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;

    if (!moduleId) {
      return NextResponse.json(
        { error: "Missing moduleId" },
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
    const { collection, doc, getDoc } = firestore;

    const modulesRef = collection(db, "trainingModules");
    const moduleRef = doc(modulesRef, moduleId);
    const moduleDoc = await getDoc(moduleRef);

    if (!moduleDoc.exists()) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    const data = moduleDoc.data();
    return NextResponse.json({
      id: moduleDoc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.()?.toISOString(),
      updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
    });
  } catch (error: any) {
    console.error("[Training Modules API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch training module" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/training/modules/[moduleId]
 * Update a training module (admin/operator only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    // TODO: Add authentication check for admin/operator
    const moduleId = params.moduleId;

    if (!moduleId) {
      return NextResponse.json(
        { error: "Missing moduleId" },
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

    const body = await req.json();
    const firestore = await safeImportFirestore();
    const { collection, doc, getDoc, updateDoc, serverTimestamp } = firestore;

    const modulesRef = collection(db, "trainingModules");
    const moduleRef = doc(modulesRef, moduleId);
    const moduleDoc = await getDoc(moduleRef);

    if (!moduleDoc.exists()) {
      return NextResponse.json(
        { error: "Module not found" },
        { status: 404 }
      );
    }

    // Update only provided fields
    const updateData: any = {
      updatedAt: serverTimestamp(),
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.categoryTag !== undefined) updateData.categoryTag = body.categoryTag;
    if (body.durationMinutes !== undefined) updateData.durationMinutes = body.durationMinutes;
    if (body.order !== undefined) updateData.order = body.order;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl;
    if (body.quiz !== undefined) updateData.quiz = body.quiz;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.required !== undefined) updateData.required = body.required;
    if (body.requiredForPayment !== undefined) updateData.requiredForPayment = body.requiredForPayment;

    await updateDoc(moduleRef, updateData);

    // Fetch updated document
    const updatedDoc = await getDoc(moduleRef);
    const data = updatedDoc.data();

    return NextResponse.json({
      success: true,
      module: {
        id: updatedDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Training Modules API] Error updating module:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update training module" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/training/modules/[moduleId]
 * Deactivate a training module (admin/operator only)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    // TODO: Add authentication check for admin/operator
    const moduleId = params.moduleId;

    if (!moduleId) {
      return NextResponse.json(
        { error: "Missing moduleId" },
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
    const { collection, doc, updateDoc, serverTimestamp } = firestore;

    const modulesRef = collection(db, "trainingModules");
    const moduleRef = doc(modulesRef, moduleId);

    // Deactivate instead of deleting
    await updateDoc(moduleRef, {
      active: false,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      message: "Module deactivated successfully",
    });
  } catch (error: any) {
    console.error("[Training Modules API] Error deactivating module:", error);
    return NextResponse.json(
      { error: error.message || "Failed to deactivate training module" },
      { status: 500 }
    );
  }
}
