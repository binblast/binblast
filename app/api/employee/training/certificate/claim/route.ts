// app/api/employee/training/certificate/claim/route.ts
// Claim certificate after completing all training modules

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

export const dynamic = 'force-dynamic';

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
    const {
      collection,
      query,
      where,
      orderBy,
      getDocs,
      doc,
      updateDoc,
      serverTimestamp,
      Timestamp,
    } = firestore;

    // Get all active modules
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

    // Get training progress
    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    if (progressSnapshot.empty) {
      return NextResponse.json(
        { error: "Training progress not found" },
        { status: 404 }
      );
    }

    const progressDocRef = progressSnapshot.docs[0].ref;
    const progressData = progressSnapshot.docs[0].data();
    const modules = progressData.modules || {};

    // Verify all modules are completed
    const completedModules = allModules.filter((module) => {
      const moduleProgress = modules[module.id];
      return moduleProgress?.completedAt && moduleProgress?.score >= 80;
    });

    if (completedModules.length !== allModules.length) {
      return NextResponse.json(
        {
          error: "Not all modules are completed",
          completedModules: completedModules.length,
          totalModules: allModules.length,
        },
        { status: 400 }
      );
    }

    // Check if certificate already exists
    const certificates = progressData.certificates || [];
    const hasActiveCertificate = certificates.some((cert: any) => {
      const expiresAt = cert.expiresAt?.toDate ? cert.expiresAt.toDate() : cert.expiresAt;
      return expiresAt && new Date(expiresAt) > new Date();
    });

    if (hasActiveCertificate) {
      return NextResponse.json(
        { error: "Certificate already exists" },
        { status: 400 }
      );
    }

    // Generate certificate ID
    const certId = `CERT-${employeeId}-${Date.now()}`;

    // Calculate expiry date (6 months from now)
    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6);

    // Calculate average score
    const scores = allModules
      .map((module) => modules[module.id]?.score)
      .filter((score) => score !== undefined) as number[];
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    const newCertificate = {
      certId,
      issuedAt: serverTimestamp(),
      expiresAt: Timestamp.fromDate(expiryDate),
      scoreSummary: averageScore,
    };

    certificates.push(newCertificate);

    // Update progress with new certificate
    await updateDoc(progressDocRef, {
      certificates,
      nextRecertDueAt: Timestamp.fromDate(expiryDate),
      overallStatus: "completed",
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      certificate: {
        certId,
        issuedAt: issueDate.toISOString(),
        expiresAt: expiryDate.toISOString(),
        scoreSummary: averageScore,
      },
    });
  } catch (error: any) {
    console.error("[Claim Certificate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to claim certificate" },
      { status: 500 }
    );
  }
}
