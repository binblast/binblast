// app/api/admin/employees/[employeeId]/certificate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDbInstance } from "@/lib/firebase";
import { safeImportFirestore } from "@/lib/firebase-module-loader";
import { checkAdminAccess } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const { isAdmin } = await checkAdminAccess(req);
    if (!isAdmin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const employeeId = params.employeeId;
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
    const { collection, query, where, getDocs } = firestore;

    const progressRef = collection(db, "trainingProgress");
    const progressQuery = query(progressRef, where("employeeId", "==", employeeId));
    const progressSnapshot = await getDocs(progressQuery);

    if (progressSnapshot.empty) {
      return NextResponse.json({
        success: true,
        certificate: null,
        status: "not_started",
      });
    }

    const progressData = progressSnapshot.docs[0].data();
    const certificates = progressData.certificates || [];
    const overallStatus = progressData.overallStatus || "in_progress";

    if (certificates.length === 0) {
      return NextResponse.json({
        success: true,
        certificate: null,
        status: overallStatus,
      });
    }

    // Get most recent certificate
    const latestCertificate = certificates[certificates.length - 1];

    return NextResponse.json({
      success: true,
      certificate: {
        certId: latestCertificate.certId,
        issuedAt: latestCertificate.issuedAt?.toDate?.()?.toISOString(),
        expiresAt: latestCertificate.expiresAt?.toDate?.()?.toISOString(),
        scoreSummary: latestCertificate.scoreSummary,
      },
      status: overallStatus,
      allCertificates: certificates.map((cert: any) => ({
        certId: cert.certId,
        issuedAt: cert.issuedAt?.toDate?.()?.toISOString(),
        expiresAt: cert.expiresAt?.toDate?.()?.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error("Error fetching certificate:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch certificate" },
      { status: 500 }
    );
  }
}
