// app/api/employee/training/certificate/route.ts
// API routes for training certificates

import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";

/**
 * GET /api/employee/training/certificate
 * Get employee's current certificate
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
    const { collection, query, where, getDocs } = firestore;

    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    if (progressSnapshot.empty) {
      return NextResponse.json(
        { error: "Training progress not found" },
        { status: 404 }
      );
    }

    const progressData = progressSnapshot.docs[0].data();
    const certificates = progressData.certificates || [];

    if (certificates.length === 0) {
      return NextResponse.json(
        { error: "No certificate found" },
        { status: 404 }
      );
    }

    // Get most recent certificate
    const latestCertificate = certificates[certificates.length - 1];

    return NextResponse.json({
      certificate: {
        certId: latestCertificate.certId,
        issuedAt: latestCertificate.issuedAt?.toDate?.()?.toISOString(),
        expiresAt: latestCertificate.expiresAt?.toDate?.()?.toISOString(),
        scoreSummary: latestCertificate.scoreSummary,
      },
    });
  } catch (error: any) {
    console.error("[Certificate API] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employee/training/certificate
 * Issue a new certificate (on training completion)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { employeeId, scoreSummary } = body;

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
    const { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } = firestore;

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

    // Generate certificate ID
    const certId = `CERT-${employeeId}-${Date.now()}`;

    // Calculate expiry date (6 months from now)
    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6);

    const newCertificate = {
      certId,
      issuedAt: serverTimestamp(),
      expiresAt: firestore.Timestamp.fromDate(expiryDate),
      scoreSummary: scoreSummary || null,
    };

    const certificates = progressData.certificates || [];
    certificates.push(newCertificate);

    // Update progress with new certificate and recertification date
    await updateDoc(progressDocRef, {
      certificates,
      nextRecertDueAt: firestore.Timestamp.fromDate(expiryDate),
      overallStatus: "completed",
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      certificate: {
        certId,
        issuedAt: issueDate.toISOString(),
        expiresAt: expiryDate.toISOString(),
        scoreSummary,
      },
    });
  } catch (error: any) {
    console.error("[Certificate API] Error issuing certificate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to issue certificate" },
      { status: 500 }
    );
  }
}
